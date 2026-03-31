import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, XCircle, Clock, Shield, Eye, AlertTriangle, BarChart3, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const removalReasons = [
  { my: "အလိမ်/စပမ်", en: "Scam/Spam" },
  { my: "နိုင်ငံရေး အကြောင်းအရာ", en: "Political Content" },
  { my: "ပုဂ္ဂိုလ်ရေး တိုက်ခိုက်မှု", en: "Personal Attack" },
  { my: "လဝက ပွဲစား ကြော်ငြာ", en: "Immigration Broker Ad" },
  { my: "နယ်စပ်ဖြတ်ကျော်မှု အကြံပေး", en: "Border Crossing Advice" },
  { my: "မသင့်တော်သော အကြောင်းအရာ", en: "Inappropriate Content" },
  { my: "ထပ်နေသော ပို့စ်", en: "Duplicate" },
  { my: "အခြား", en: "Other" },
];

const pendingPosts = [
  { id: 1, title: "Wise Account ဖွင့်နည်း", board: { my: "အကူအညီ", en: "Technical Help" }, author: "ဦးမင်းထက်", content: "Wise Account ဖွင့်ချင်ပါတယ်...", contentEn: "I want to open a Wise account...", submitted: "45 min ago" },
  { id: 2, title: "ထိုင်း Work Permit ရဖို့", board: { my: "ဥပဒေ", en: "Legal Status" }, author: "မသီရိ", content: "ထိုင်းမှာ Work Permit လျှောက်ချင်ပါတယ်...", contentEn: "I want to apply for Thai work permit...", submitted: "2 hours ago" },
  { id: 3, title: "LINE ကနေ Job Offer ရ", board: { my: "သတိပေး", en: "Alert" }, author: "ကိုအောင်", content: "LINE ကနေ ဆက်သွယ်လာပြီး...", contentEn: "Someone contacted me via LINE...", submitted: "3 hours ago" },
  { id: 4, title: "Mental Health Support", board: { my: "ပံ့ပိုးကူညီ", en: "Peer Support" }, author: "အမည်မဖော်", content: "ပြောင်းရွေ့နေထိုင်ရတာ...", contentEn: "Living as a displaced person...", submitted: "5 hours ago" },
];

const quickActions = [
  { icon: MessageCircle, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-accent/10", fg: "text-accent" },
  { icon: Sparkles, label: "အသက်မွေးမှု Tools", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-primary/10", fg: "text-primary" },
];

const ModeratorDashboard = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(pendingPosts);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showRemoval, setShowRemoval] = useState(false);
  const [removalReason, setRemovalReason] = useState("");

  const selected = posts.find(p => p.id === selectedId);

  const handleApprove = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setSelectedId(null);
    toast({ title: lang === "my" ? "ပို့စ် အတည်ပြုပြီး ✓" : "Post approved ✓" });
  };

  const handleRemove = () => {
    if (selectedId) {
      setPosts(prev => prev.filter(p => p.id !== selectedId));
      setSelectedId(null);
      setShowRemoval(false);
      setRemovalReason("");
      toast({ title: lang === "my" ? "ပို့စ် ဖယ်ရှားပြီး" : "Post removed" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "Moderator Dashboard" : "Moderator Dashboard"} />
      <div className="px-5">
        {/* Profile Completion */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
            <span className="text-xs font-bold text-primary">70%</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ width: 0 }} animate={{ width: "70%" }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full bg-primary" />
          </div>
          <button onClick={() => navigate("/profile/edit")} className="text-xs font-semibold text-primary">
            {lang === "my" ? "ပြင်ဆင်ရန်" : "Complete now"} →
          </button>
        </motion.div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: { my: "ဤလ စစ်ဆေးပြီး", en: "Reviewed" }, value: "47" },
            { label: { my: "ပျမ်း ချိန်", en: "Avg Time" }, value: "1.8h" },
            { label: { my: "ကျန်ရှိ", en: "Pending" }, value: posts.length.toString() },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? s.label.my : s.label.en}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path + action.labelEn}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors active:bg-muted"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.bg}`}>
                <action.icon className={`h-4 w-4 ${action.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
          <p className="text-[11px] text-foreground/80">
            {lang === "my" ? "SLA: ၄ နာရီအတွင်း စစ်ဆေးပါ (7am-10pm Bangkok)" : "SLA: Review within 4 hours (7am-10pm Bangkok time)"}
          </p>
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "စစ်ဆေးရန် ပို့စ်များ" : "Pending Posts"}</h2>
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.button
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedId(post.id)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30"
            >
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-sm font-semibold text-foreground">{post.title}</h3>
                <span className="text-[10px] text-muted-foreground">{post.submitted}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{lang === "my" ? post.board.my : post.board.en}</span>
                <span className="text-[10px] text-muted-foreground">by {post.author}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{lang === "my" ? post.content : post.contentEn}</p>
            </motion.button>
          ))}
          {posts.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <CheckCircle className="mb-3 h-10 w-10 text-emerald" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">{lang === "my" ? "စစ်ဆေးစရာ မရှိတော့ပါ!" : "All caught up!"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Sheet */}
      <AnimatePresence>
        {selected && !showRemoval && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <span className="mb-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{lang === "my" ? selected.board.my : selected.board.en}</span>
              <h2 className="mb-1 text-lg font-bold text-foreground">{selected.title}</h2>
              <p className="mb-1 text-xs text-muted-foreground">by {selected.author} · {selected.submitted}</p>
              <div className="my-4 rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed text-foreground">{lang === "my" ? selected.content : selected.contentEn}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowRemoval(true)}>
                  <XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ဖယ်ရှား" : "Remove"}
                </Button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => handleApprove(selected.id)}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removal Reason */}
      <AnimatePresence>
        {showRemoval && (
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
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleRemove} disabled={!removalReason}>{lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModeratorDashboard;
