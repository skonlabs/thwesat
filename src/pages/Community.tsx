import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Image, Plus, Clock, X, Flag, UserMinus, Link2, Bookmark, BookmarkCheck, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useCommunityPosts, useCreatePost, useDeletePost } from "@/hooks/use-community-posts";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "အောင်မြင်မှု", en: "Success" },
  { my: "အလုပ်အကိုင်", en: "Career" },
  { my: "သတိပေး", en: "Alert" },
  { my: "မေးခွန်း", en: "Q&A" },
  { my: "ဥပဒေ", en: "Legal" },
];

function usePostLikes(postIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["post-likes", postIds, user?.id],
    queryFn: async () => {
      if (!postIds.length) return { counts: {}, userLikes: new Set<string>() };
      const { data: likes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds);
      const counts: Record<string, number> = {};
      const userLikes = new Set<string>();
      (likes || []).forEach(l => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) userLikes.add(l.post_id);
      });
      return { counts, userLikes };
    },
    enabled: postIds.length > 0,
  });
}

function usePostSaves(postIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["post-saves", postIds, user?.id],
    queryFn: async () => {
      if (!user || !postIds.length) return new Set<string>();
      const { data } = await supabase.from("post_saves").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      return new Set((data || []).map(d => d.post_id));
    },
    enabled: !!user && postIds.length > 0,
  });
}

function usePostCommentCounts(postIds: string[]) {
  return useQuery({
    queryKey: ["post-comment-counts", postIds],
    queryFn: async () => {
      if (!postIds.length) return {};
      const { data } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);
      const counts: Record<string, number> = {};
      (data || []).forEach(c => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      return counts;
    },
    enabled: postIds.length > 0,
  });
}

function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      if (error) throw error;
      const authorIds = [...new Set((data || []).map(c => c.author_id))];
      if (!authorIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = (data || []).map(c => ({ ...c, author: pMap.get(c.author_id) }));
      // Build tree: top-level comments + nested replies
      const topLevel = enriched.filter(c => !c.parent_id);
      const repliesMap = new Map<string, typeof enriched>();
      enriched.filter(c => c.parent_id).forEach(c => {
        const arr = repliesMap.get(c.parent_id!) || [];
        arr.push(c);
        repliesMap.set(c.parent_id!, arr);
      });
      return { topLevel, repliesMap };
    },
    enabled: !!postId,
  });
}

const Community = () => {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("All");
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("Career");
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: posts = [], isLoading } = useCommunityPosts(activeCategory);
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const postIds = posts.map(p => p.id);
  const { data: likesData } = usePostLikes(postIds);
  const { data: savesData } = usePostSaves(postIds);
  const { data: commentCounts } = usePostCommentCounts(postIds);
  const { data: commentsData } = usePostComments(openCommentId);
  const topLevelComments = (commentsData && !Array.isArray(commentsData)) ? commentsData.topLevel : [];
  const repliesMap = (commentsData && !Array.isArray(commentsData)) ? commentsData.repliesMap : new Map();

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return;
      const isLiked = likesData?.userLikes.has(postId);
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-likes"] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return;
      const isSaved = savesData?.has(postId);
      if (isSaved) {
        await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_saves").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-saves"] });
      setOpenMenuId(null);
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const insertData: any = { post_id: postId, author_id: user.id, content };
      if (parentId) insertData.parent_id = parentId;
      const { error } = await supabase.from("post_comments").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments"] });
      queryClient.invalidateQueries({ queryKey: ["post-comment-counts"] });
      setCommentText("");
      setReplyToId(null);
      setReplyToName(null);
    },
  });

  const handleReport = (postId: string) => {
    if (!user) return;
    supabase.from("scam_reports").insert({ reported_entity_id: postId, reported_entity_type: "post", reporter_id: user.id, reason: "Community report" });
    setOpenMenuId(null);
  };

  const handleCopyLink = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/community/post/${postId}`);
    setOpenMenuId(null);
  };

  const handleShareOption = (post: typeof posts[0], platform: string) => {
    const postUrl = `${window.location.origin}/community/post/${post.id}`;
    if (platform === "copy") {
      navigator.clipboard.writeText(postUrl).catch(() => {});
    }
    setSharePostId(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const handleNewPost = () => {
    if (!newPostText.trim()) return;
    createPost.mutate({ contentMy: newPostText, contentEn: newPostText, category: newPostCategory }, {
      onSuccess: () => {
        setShowNewPost(false);
        setNewPostText("");
        setSelectedImage(null);
      },
    });
  };

  const handleDeletePost = (postId: string) => {
    deletePost.mutate(postId, {
      onSuccess: () => {
        setOpenMenuId(null);
      },
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return lang === "my" ? `${mins} မိနစ်အကြာ` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === "my" ? `${hrs} နာရီအကြာ` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return lang === "my" ? `${days} ရက်အကြာ` : `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အသိုင်းအဝိုင်း" : "Community"} />
      <div className="px-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat.en ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
                {lang === "my" ? cat.my : cat.en}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowNewPost(true)} className="mb-4 flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors active:bg-muted">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <span className="text-sm text-muted-foreground">{lang === "my" ? "မေးခွန်းမေးပါ သို့မဟုတ် အတွေ့အကြုံ မျှဝေပါ..." : "Ask a question or share your experience..."}</span>
        </button>
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[11px] text-muted-foreground">{lang === "my" ? "သင့်ပို့စ်များကို စစ်ဆေးပြီးမှ ဖော်ပြပါမည်" : "Posts are reviewed before publishing"}</p>
        </div>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setShowNewPost(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-2xl bg-card p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">{lang === "my" ? "ပို့စ်အသစ်" : "New Post"}</h2>
                <button onClick={() => setShowNewPost(false)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {profile?.display_name?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{profile?.display_name || (lang === "my" ? "အသုံးပြုသူ" : "User")}</p>
                  <p className="text-[10px] text-muted-foreground">{profile?.headline || ""}</p>
                </div>
              </div>
              <Textarea value={newPostText} onChange={e => setNewPostText(e.target.value)} placeholder={lang === "my" ? "မေးခွန်းမေးပါ သို့မဟုတ် အတွေ့အကြုံ မျှဝေပါ..." : "Ask a question or share your experience..."} className="mb-3 min-h-[100px] rounded-xl border-border text-sm" />
              {selectedImage && (
                <div className="relative mb-3">
                  <img src={selectedImage} alt="Attached" className="h-32 w-full rounded-lg object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute right-2 top-2 rounded-full bg-foreground/60 p-1"><X className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2} /></button>
                </div>
              )}
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{lang === "my" ? "အမျိုးအစား" : "Category"}</p>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.en !== "All").map(cat => (
                    <button key={cat.en} onClick={() => setNewPostCategory(cat.en)} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${newPostCategory === cat.en ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                      {lang === "my" ? cat.my : cat.en}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground active:bg-muted">
                  <Image className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleNewPost} disabled={!newPostText.trim() || createPost.isPending}>
                  <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ပို့စ်တင်ရန်" : "Post"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      <div className="space-y-2.5 px-5 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ပို့စ် မရှိသေးပါ" : "No posts yet"}</p>
          </div>
        ) : (
          posts.map((post, i) => {
            const isOwn = post.author_id === user?.id;
            const likeCount = likesData?.counts[post.id] || 0;
            const isLiked = likesData?.userLikes.has(post.id) || false;
            const isSaved = savesData?.has(post.id) || false;
            const categoryLabel = post.category || "general";

            return (
              <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card">
                <div className="p-4 pb-24">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {post.author?.display_name?.slice(0, 2).toUpperCase() || "U"}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{post.author?.display_name || (lang === "my" ? "အမည်မသိ" : "Unknown")}</h3>
                        <p className="text-[10px] text-muted-foreground">{post.author?.headline || ""} · {formatTime(post.created_at)}</p>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryLabel === "Alert" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {lang === "my" ? (categories.find(c => c.en === categoryLabel)?.my || categoryLabel) : categoryLabel}
                      </span>
                      <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="rounded-lg p-1 text-muted-foreground active:bg-muted">
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <AnimatePresence>
                        {openMenuId === post.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-border bg-card py-1 shadow-lg">
                            <button onClick={() => toggleSave.mutate(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground active:bg-muted">
                              {isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" strokeWidth={1.5} /> : <Bookmark className="h-4 w-4" strokeWidth={1.5} />}
                              {isSaved ? (lang === "my" ? "သိမ်းဆည်းမှု ဖြုတ်ရန်" : "Unsave Post") : (lang === "my" ? "ပို့စ် သိမ်းဆည်းရန်" : "Save Post")}
                            </button>
                            <button onClick={() => handleCopyLink(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground active:bg-muted">
                              <Link2 className="h-4 w-4" strokeWidth={1.5} />
                              {lang === "my" ? "လင့်ခ် ကူးယူရန်" : "Copy Link"}
                            </button>
                            {isOwn ? (
                              <button onClick={() => handleDeletePost(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-destructive active:bg-muted">
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                {lang === "my" ? "ပို့စ် ဖျက်ရန်" : "Delete Post"}
                              </button>
                            ) : (
                              <button onClick={() => handleReport(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-destructive active:bg-muted">
                                <Flag className="h-4 w-4" strokeWidth={1.5} />
                                {lang === "my" ? "တိုင်ကြားရန်" : "Report Post"}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-foreground">{lang === "my" ? post.content_my : (post.content_en || post.content_my)}</p>
                </div>

                {/* Action bar */}
                <div className="flex items-center border-t border-border">
                  <button onClick={() => toggleLike.mutate(post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${isLiked ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-destructive" : ""}`} strokeWidth={1.5} /> {likeCount}
                  </button>
                  <div className="h-5 w-px bg-border" />
                  <button onClick={() => setOpenCommentId(openCommentId === post.id ? null : post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${openCommentId === post.id ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    <MessageCircle className={`h-4 w-4 ${openCommentId === post.id ? "text-primary" : ""}`} strokeWidth={1.5} />
                    {lang === "my" ? "မှတ်ချက်" : "Comment"}{(commentCounts?.[post.id] || 0) > 0 ? ` (${commentCounts![post.id]})` : ""}
                  </button>
                  <div className="h-5 w-px bg-border" />
                  <button onClick={() => setSharePostId(sharePostId === post.id ? null : post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${sharePostId === post.id ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    <Share2 className={`h-4 w-4 ${sharePostId === post.id ? "text-primary" : ""}`} strokeWidth={1.5} />
                    {lang === "my" ? "မျှဝေ" : "Share"}
                  </button>
                </div>

                {/* Share options */}
                <AnimatePresence>
                  {sharePostId === post.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                      <div className="flex items-center gap-2 px-4 py-3">
                        {[
                          { platform: "copy", label: lang === "my" ? "ကူးယူ" : "Copy", icon: <Copy className="h-4 w-4" strokeWidth={1.5} /> },
                        ].map((opt) => (
                          <button key={opt.platform} onClick={() => handleShareOption(post, opt.platform)} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">{opt.icon}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Comments section */}
                <AnimatePresence>
                  {openCommentId === post.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                      <div className="p-4">
                        {topLevelComments.length > 0 ? (
                          <div className="mb-3 space-y-3">
                            {topLevelComments.map((c: any) => (
                              <div key={c.id}>
                                {/* Top-level comment */}
                                <div className="flex gap-2.5">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                    {c.author?.display_name?.slice(0, 2).toUpperCase() || "U"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="rounded-lg bg-muted px-3 py-2">
                                      <p className="text-[11px] font-semibold text-foreground">{c.author?.display_name || "User"}</p>
                                      <p className="text-xs text-foreground/80">{c.content}</p>
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-3 px-1">
                                      <p className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</p>
                                      <button onClick={() => { setReplyToId(c.id); setReplyToName(c.author?.display_name || "User"); }} className="text-[10px] font-medium text-primary">
                                        {lang === "my" ? "ပြန်ဖြေ" : "Reply"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {/* Replies (indented) */}
                                {(repliesMap.get(c.id) || []).map((r: any) => (
                                  <div key={r.id} className="ml-9 mt-2 flex gap-2.5 border-l-2 border-border pl-3">
                                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                                      {r.author?.display_name?.slice(0, 2).toUpperCase() || "U"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="rounded-lg bg-muted/60 px-3 py-1.5">
                                        <p className="text-[10px] font-semibold text-foreground">{r.author?.display_name || "User"}</p>
                                        <p className="text-[11px] text-foreground/80">{r.content}</p>
                                      </div>
                                      <p className="mt-0.5 px-1 text-[10px] text-muted-foreground">{formatTime(r.created_at)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mb-3 text-center text-xs text-muted-foreground">{lang === "my" ? "ပထမဆုံး မှတ်ချက် ရေးပါ" : "Be the first to comment"}</p>
                        )}
                        {replyToId && (
                          <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5">
                            <p className="flex-1 text-[11px] text-primary">{lang === "my" ? `${replyToName} ကို ပြန်ဖြေနေသည်` : `Replying to ${replyToName}`}</p>
                            <button onClick={() => { setReplyToId(null); setReplyToName(null); }} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {profile?.display_name?.slice(0, 2).toUpperCase() || "U"}
                          </div>
                          <div className="flex flex-1 items-center rounded-full border border-border bg-background px-3 py-2">
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) addComment.mutate({ postId: post.id, content: commentText, parentId: replyToId }); }} placeholder={replyToId ? (lang === "my" ? "ပြန်ဖြေရန်..." : "Write a reply...") : (lang === "my" ? "မှတ်ချက် ရေးပါ..." : "Write a comment...")} className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
                          </div>
                          <button onClick={() => { if (commentText.trim()) addComment.mutate({ postId: post.id, content: commentText, parentId: replyToId }); }} disabled={!commentText.trim()} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
                            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
};

export default Community;
