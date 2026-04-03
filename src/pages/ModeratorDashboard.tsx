import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";

const removalReasons = [
  { my: "အလိမ်/စပမ်", en: "Scam/Spam" },
  { my: "နိုင်ငံရေး အကြောင်းအရာ", en: "Political Content" },
  { my: "ပုဂ္ဂိုလ်ရေး တိုက်ခိုက်မှု", en: "Personal Attack" },
  { my: "မသင့်တော်သော အကြောင်းအရာ", en: "Inappropriate Content" },
  { my: "ထပ်နေသော ပို့စ်", en: "Duplicate" },
  { my: "အခြား", en: "Other" },
];

const quickActions = [
  { icon: MessageCircle, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Shield, label: "လမ်းညွှန်", labelEn: "Guides", path: "/guides", bg: "bg-accent/10", fg: "text-accent" },
];

const ModeratorDashboard = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRemoval, setShowRemoval] = useState(false);
  const [removalReason, setRemovalReason] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["moderator-pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_posts").select("*").eq("is_approved", false).order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(p => p.author_id))];
      if (!authorIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", authorIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(p => ({ ...p, author: pMap.get(p.author_id) }));
    },
  });

  const selected = posts.find((p: any) => p.id === selectedId);

  const approvePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").update({ is_approved: true, moderated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-pending-posts"] });
      setSelectedId(null);
    },
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").update({ moderated_by: user?.id, moderation_reason: removalReason }).eq("id", id);
      if (error) throw error;
      await supabase.from("community_posts").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-pending-posts"] });
      setSelectedId(null);
      setShowRemoval(false);
      setRemovalReason("");
    },
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Moderator Dashboard" />
      <div className="px-5">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{posts.length}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ကျန်ရှိ" : "Pending"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">4h</p>
            <p className="text-[10px] text-muted-foreground">SLA</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.bg}`}><action.icon className={`h-4 w-4 ${action.fg}`} strokeWidth={1.5} /></div>
              <span className="text-[10px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
          <p className="text-[11px] text-foreground/80">{lang === "my" ? "SLA: ၄ နာရီအတွင်း စစ်ဆေးပါ" : "SLA: Review within 4 hours"}</p>
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "စစ်ဆေးရန် ပို့စ်များ" : "Pending Posts"}</h2>
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any, i: number) => (
              <motion.button key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedId(post.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30">
                <div className="mb-1 flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{lang === "my" ? post.content_my.slice(0, 50) : (post.content_en || post.content_my).slice(0, 50)}...</h3>
                  <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{post.category || "general"}</span>
                  <span className="text-[10px] text-muted-foreground">by {post.author?.display_name || "User"}</span>
                </div>
              </motion.button>
            ))}
            {posts.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <CheckCircle className="mb-3 h-10 w-10 text-emerald" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">{lang === "my" ? "စစ်ဆေးစရာ မရှိတော့ပါ!" : "All caught up!"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Sheet */}
      <AnimatePresence>
        {selected && !showRemoval && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <span className="mb-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{selected.category || "general"}</span>
              <p className="mb-1 text-xs text-muted-foreground">by {selected.author?.display_name || "User"} · {formatTime(selected.created_at)}</p>
              <div className="my-4 rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed text-foreground">{lang === "my" ? selected.content_my : (selected.content_en || selected.content_my)}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowRemoval(true)}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ဖယ်ရှား" : "Remove"}</Button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => approvePost.mutate(selected.id)}><CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removal Reason */}
      <AnimatePresence>
        {showRemoval && selectedId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowRemoval(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ဖယ်ရှားရသည့် အကြောင်းရင်း" : "Removal Reason"}</h3>
              <div className="mb-3 space-y-2">
                {removalReasons.map(r => (
                  <button key={r.en} onClick={() => setRemovalReason(r.en)} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${removalReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                    {lang === "my" ? r.my : r.en}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setShowRemoval(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={() => removePost.mutate(selectedId)} disabled={!removalReason}>{lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModeratorDashboard;
