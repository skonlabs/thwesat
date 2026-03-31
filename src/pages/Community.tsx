import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Image, Plus, Clock, X, Flag, UserMinus, Link2, Bookmark, BookmarkCheck, Trash2, Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const initialPosts = [
  {
    id: 1,
    author: "ဒေါ်ခင်မြတ်နိုး", authorEn: "Khin Myat Noe", avatar: "KM",
    role: "Software Engineer · Singapore",
    time: { my: "2 နာရီအကြာ", en: "2 hours ago" },
    content: "ထိုင်းမှာ Remote Work လုပ်ဖို့ Pink Card ရပြီးပါပြီ! 🎉 လိုအပ်တဲ့ စာရွက်စာတမ်းတွေနဲ့ အဆင့်ဆင့် လမ်းညွှန်ချက်ကို Legal Guides မှာ ဝေမျှထားပါတယ်။",
    contentEn: "Got my Thai Pink Card for remote work! 🎉 Shared step-by-step guide in Legal Guides section.",
    likes: 47, comments: [], shares: 8, liked: true, saved: false, isOwn: false,
    category: { my: "အောင်မြင်မှု", en: "Success" }
  },
  {
    id: 2,
    author: "ဦးမင်းထက်", authorEn: "Min Htet", avatar: "MH",
    role: "UX Designer · Bangkok",
    time: { my: "5 နာရီအကြာ", en: "5 hours ago" },
    content: "Upwork မှာ ပထမဆုံး Client ရပြီးပါပြီ! Profile Builder ကို သုံးပြီး ပရိုဖိုင် ပြင်ဆင်ခဲ့တာ အရမ်းအကူအညီ ဖြစ်ပါတယ်။ ကျေးဇူးတင်ပါတယ် ThweSone! 🙏",
    contentEn: "Got my first Upwork client! The Profile Builder helped me rewrite my profile perfectly. Thanks ThweSone! 🙏",
    likes: 89, comments: [], shares: 15, liked: false, saved: false, isOwn: false,
    category: { my: "အလုပ်အကိုင်", en: "Career" }
  },
  {
    id: 3,
    author: "ဒေါ်သီရိ", authorEn: "Thiri", avatar: "TH",
    role: "Project Manager · Remote",
    time: { my: "1 ရက်အကြာ", en: "1 day ago" },
    content: "⚠️ သတိပေးချက်: LINE App ကနေ ဆက်သွယ်လာတဲ့ \"Remote Job\" ကမ်းလှမ်းချက်တွေ သတိထားပါ။ Processing Fee တောင်းရင် အလိမ်ပါ။",
    contentEn: "⚠️ Warning: Be cautious of 'Remote Job' offers via LINE App. If they ask for processing fees, it's a scam.",
    likes: 156, comments: [], shares: 67, liked: true, saved: true, isOwn: false,
    category: { my: "သတိပေး", en: "Alert" }
  },
  {
    id: 4,
    author: "ဦးအောင်ကျော်", authorEn: "Aung Kyaw", avatar: "AK",
    role: "Engineering Manager · Tokyo",
    time: { my: "2 ရက်အကြာ", en: "2 days ago" },
    content: "ဂျပန်မှာ Technical Intern Training Program (TITP) အကြောင်း သိချင်သူများ ရှိရင် မေးနိုင်ပါတယ်။ ကျွန်တော် ၃ နှစ် အတွေ့အကြုံ ရှိပါတယ်။",
    contentEn: "Happy to answer questions about Japan's TITP program. I have 3 years of experience here.",
    likes: 34, comments: [], shares: 5, liked: false, saved: false, isOwn: false,
    category: { my: "မေးခွန်း", en: "Q&A" }
  },
];

type Comment = { id: number; author: string; avatar: string; text: string; time: string };
type Post = typeof initialPosts[0] & { comments: Comment[] };

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "အောင်မြင်မှု", en: "Success" },
  { my: "အလုပ်အကိုင်", en: "Career" },
  { my: "သတိပေး", en: "Alert" },
  { my: "မေးခွန်း", en: "Q&A" },
  { my: "ဥပဒေ", en: "Legal" },
];

const Community = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");
  const [sharePostId, setSharePostId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts as Post[]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("Career");
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPosts = posts.filter(p =>
    activeCategory === "All" || p.category.en === activeCategory
  );

  const toggleLike = (postId: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const toggleSave = (postId: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
    const post = posts.find(p => p.id === postId);
    toast({
      title: post?.saved
        ? (lang === "my" ? "သိမ်းဆည်းမှု ဖြုတ်ပြီး" : "Unsaved")
        : (lang === "my" ? "သိမ်းဆည်းပြီး" : "Saved"),
    });
    setOpenMenuId(null);
  };

  const handleReport = (postId: number) => {
    toast({
      title: lang === "my" ? "တိုင်ကြားပြီးပါပြီ" : "Reported",
      description: lang === "my" ? "စစ်ဆေးပြီး အရေးယူပါမည်" : "We'll review this post",
    });
    setOpenMenuId(null);
  };

  const handleCopyLink = (postId: number) => {
    navigator.clipboard.writeText(`${window.location.origin}/community/post/${postId}`);
    toast({ title: lang === "my" ? "လင့်ခ် ကူးပြီးပါပြီ" : "Link copied!" });
    setOpenMenuId(null);
  };

  const handleShareOption = (post: Post, platform: string) => {
    const text = encodeURIComponent(lang === "my" ? post.content : post.contentEn);
    const url = encodeURIComponent(window.location.href);
    let shareUrl = "";
    switch (platform) {
      case "whatsapp": shareUrl = `https://wa.me/?text=${text}%20${url}`; break;
      case "telegram": shareUrl = `https://t.me/share/url?url=${url}&text=${text}`; break;
      case "facebook": shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
      case "twitter": shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
      case "copy":
        navigator.clipboard.writeText(decodeURIComponent(text));
        toast({ title: lang === "my" ? "ကူးယူပြီးပါပြီ" : "Copied to clipboard!" });
        setSharePostId(null);
        return;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setSharePostId(null);
  };

  const handleAddComment = (postId: number) => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: Date.now(),
      author: lang === "my" ? "မောင်မောင်" : "Maung Maung",
      avatar: "MM",
      text: commentText,
      time: lang === "my" ? "ယခု" : "Just now",
    };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentText("");
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
    const newPost: Post = {
      id: Date.now(),
      author: "မောင်မောင်", authorEn: "Maung Maung", avatar: "MM",
      role: "Full Stack Developer · Bangkok",
      time: { my: "ယခု", en: "Just now" },
      content: newPostText, contentEn: newPostText,
      likes: 0, comments: [], shares: 0, liked: false, saved: false, isOwn: true,
      category: { my: categories.find(c => c.en === newPostCategory)?.my || newPostCategory, en: newPostCategory }
    };
    setPosts(prev => [newPost, ...prev]);
    setShowNewPost(false);
    setNewPostText("");
    setSelectedImage(null);
    toast({
      title: lang === "my" ? "ပို့စ် တင်ပြီးပါပြီ" : "Post submitted",
      description: lang === "my" ? "စစ်ဆေးပြီးမှ ဖော်ပြပါမည်" : "Your post will appear after review",
    });
  };

  const handleDeletePost = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast({ title: lang === "my" ? "ပို့စ် ဖျက်ပြီးပါပြီ" : "Post deleted" });
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-background">
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
        <button
          onClick={() => setShowNewPost(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors active:bg-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <span className="text-sm text-muted-foreground">
            {lang === "my" ? "မေးခွန်းမေးပါ သို့မဟုတ် အတွေ့အကြုံ မျှဝေပါ..." : "Ask a question or share your experience..."}
          </span>
        </button>

        <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[11px] text-muted-foreground">
            {lang === "my" ? "သင့်ပို့စ်များကို စစ်ဆေးပြီးမှ ဖော်ပြပါမည်" : "Posts are reviewed before publishing"}
          </p>
        </div>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" onClick={() => setShowNewPost(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-2xl bg-card p-5 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">{lang === "my" ? "ပို့စ်အသစ်" : "New Post"}</h2>
                <button onClick={() => setShowNewPost(false)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">MM</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</p>
                  <p className="text-[10px] text-muted-foreground">Full Stack Developer</p>
                </div>
              </div>
              <Textarea value={newPostText} onChange={e => setNewPostText(e.target.value)} placeholder={lang === "my" ? "မေးခွန်းမေးပါ သို့မဟုတ် အတွေ့အကြုံ မျှဝေပါ..." : "Ask a question or share your experience..."} className="mb-3 min-h-[100px] rounded-xl border-border text-sm" />

              {/* Selected image preview */}
              {selectedImage && (
                <div className="relative mb-3">
                  <img src={selectedImage} alt="Attached" className="h-32 w-full rounded-lg object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute right-2 top-2 rounded-full bg-foreground/60 p-1">
                    <X className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2} />
                  </button>
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
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleNewPost} disabled={!newPostText.trim()}>
                  <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {lang === "my" ? "ပို့စ်တင်ရန်" : "Post"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      <div className="space-y-2.5 px-5 pb-24">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ပို့စ် မရှိသေးပါ" : "No posts yet"}</p>
          </div>
        ) : (
          filteredPosts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card">
              <div className="p-4 pb-0">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{post.avatar}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? post.author : post.authorEn}</h3>
                      <p className="text-[10px] text-muted-foreground">{post.role} · {lang === "my" ? post.time.my : post.time.en}</p>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${post.category.en === "Alert" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      {lang === "my" ? post.category.my : post.category.en}
                    </span>
                    <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="rounded-lg p-1 text-muted-foreground active:bg-muted">
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                    </button>

                    {/* More options dropdown */}
                    <AnimatePresence>
                      {openMenuId === post.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-border bg-card py-1 shadow-lg"
                        >
                          <button onClick={() => toggleSave(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground active:bg-muted">
                            {post.saved ? <BookmarkCheck className="h-4 w-4 text-primary" strokeWidth={1.5} /> : <Bookmark className="h-4 w-4" strokeWidth={1.5} />}
                            {post.saved ? (lang === "my" ? "သိမ်းဆည်းမှု ဖြုတ်ရန်" : "Unsave Post") : (lang === "my" ? "ပို့စ် သိမ်းဆည်းရန်" : "Save Post")}
                          </button>
                          <button onClick={() => handleCopyLink(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground active:bg-muted">
                            <Link2 className="h-4 w-4" strokeWidth={1.5} />
                            {lang === "my" ? "လင့်ခ် ကူးယူရန်" : "Copy Link"}
                          </button>
                          {post.isOwn ? (
                            <button onClick={() => handleDeletePost(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-destructive active:bg-muted">
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              {lang === "my" ? "ပို့စ် ဖျက်ရန်" : "Delete Post"}
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { toast({ title: lang === "my" ? "ဖျောက်ထားပြီး" : "Hidden" }); setOpenMenuId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-foreground active:bg-muted">
                                <UserMinus className="h-4 w-4" strokeWidth={1.5} />
                                {lang === "my" ? "ဤသူ၏ ပို့စ်များ ဖျောက်ရန်" : "Hide posts from this user"}
                              </button>
                              <button onClick={() => handleReport(post.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-destructive active:bg-muted">
                                <Flag className="h-4 w-4" strokeWidth={1.5} />
                                {lang === "my" ? "တိုင်ကြားရန်" : "Report Post"}
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-foreground">{lang === "my" ? post.content : post.contentEn}</p>
              </div>

              {/* Action bar */}
              <div className="flex items-center border-t border-border">
                <button onClick={() => toggleLike(post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${post.liked ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  <Heart className={`h-4 w-4 ${post.liked ? "fill-destructive" : ""}`} strokeWidth={1.5} /> {post.likes}
                </button>
                <div className="h-5 w-px bg-border" />
                <button onClick={() => setOpenCommentId(openCommentId === post.id ? null : post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${openCommentId === post.id ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  <MessageCircle className={`h-4 w-4 ${openCommentId === post.id ? "text-primary" : ""}`} strokeWidth={1.5} /> {post.comments.length}
                </button>
                <div className="h-5 w-px bg-border" />
                <button onClick={() => setSharePostId(sharePostId === post.id ? null : post.id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs transition-colors active:bg-muted ${sharePostId === post.id ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  <Share2 className={`h-4 w-4 ${sharePostId === post.id ? "text-primary" : ""}`} strokeWidth={1.5} /> {post.shares}
                </button>
              </div>

              {/* Share options */}
              <AnimatePresence>
                {sharePostId === post.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                    <div className="flex items-center gap-2 px-4 py-3">
                      {[
                        { platform: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> },
                        { platform: "telegram", label: "Telegram", icon: <Send className="h-4 w-4" strokeWidth={1.5} /> },
                        { platform: "facebook", label: "Facebook", icon: <Globe className="h-4 w-4" strokeWidth={1.5} /> },
                        { platform: "twitter", label: "X", icon: <Share2 className="h-4 w-4" strokeWidth={1.5} /> },
                        { platform: "copy", label: lang === "my" ? "ကူးယူ" : "Copy", icon: <Copy className="h-4 w-4" strokeWidth={1.5} /> },
                      ].map((opt) => (
                        <button key={opt.platform} onClick={() => handleShareOption(post, opt.platform)} className="flex flex-1 flex-col items-center gap-1.5">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                            {opt.icon}
                          </span>
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
                      {/* Existing comments */}
                      {post.comments.length > 0 && (
                        <div className="mb-3 space-y-3">
                          {post.comments.map(c => (
                            <div key={c.id} className="flex gap-2.5">
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{c.avatar}</div>
                              <div className="min-w-0 flex-1">
                                <div className="rounded-lg bg-muted px-3 py-2">
                                  <p className="text-[11px] font-semibold text-foreground">{c.author}</p>
                                  <p className="text-xs text-foreground/80">{c.text}</p>
                                </div>
                                <p className="mt-0.5 px-1 text-[10px] text-muted-foreground">{c.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {post.comments.length === 0 && (
                        <p className="mb-3 text-center text-xs text-muted-foreground">
                          {lang === "my" ? "ပထမဆုံး မှတ်ချက် ရေးပါ" : "Be the first to comment"}
                        </p>
                      )}

                      {/* Comment input */}
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">MM</div>
                        <div className="flex flex-1 items-center rounded-full border border-border bg-background px-3 py-2">
                          <input
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleAddComment(post.id); }}
                            placeholder={lang === "my" ? "မှတ်ချက် ရေးပါ..." : "Write a comment..."}
                            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        <button onClick={() => handleAddComment(post.id)} disabled={!commentText.trim()} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
                          <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Close menu overlay */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  );
};

export default Community;
