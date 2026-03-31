import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Image, Plus, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const initialPosts = [
  {
    author: "ဒေါ်ခင်မြတ်နိုး", authorEn: "Khin Myat Noe", avatar: "KM",
    role: "Software Engineer · Singapore",
    time: { my: "2 နာရီအကြာ", en: "2 hours ago" },
    content: "ထိုင်းမှာ Remote Work လုပ်ဖို့ Pink Card ရပြီးပါပြီ! 🎉 လိုအပ်တဲ့ စာရွက်စာတမ်းတွေနဲ့ အဆင့်ဆင့် လမ်းညွှန်ချက်ကို Legal Guides မှာ ဝေမျှထားပါတယ်။",
    contentEn: "Got my Thai Pink Card for remote work! 🎉 Shared step-by-step guide in Legal Guides section.",
    likes: 47, comments: 12, shares: 8, liked: true, category: { my: "အောင်မြင်မှု", en: "Success" }
  },
  {
    author: "ဦးမင်းထက်", authorEn: "Min Htet", avatar: "MH",
    role: "UX Designer · Bangkok",
    time: { my: "5 နာရီအကြာ", en: "5 hours ago" },
    content: "Upwork မှာ ပထမဆုံး Client ရပြီးပါပြီ! Profile Builder AI ကို သုံးပြီး ပရိုဖိုင် ပြင်ဆင်ခဲ့တာ အရမ်းအကူအညီ ဖြစ်ပါတယ်။ ကျေးဇူးတင်ပါတယ် ThweSone! 🙏",
    contentEn: "Got my first Upwork client! The AI Profile Builder helped me rewrite my profile perfectly. Thanks ThweSone! 🙏",
    likes: 89, comments: 23, shares: 15, liked: false, category: { my: "အလုပ်အကိုင်", en: "Career" }
  },
  {
    author: "ဒေါ်သီရိ", authorEn: "Thiri", avatar: "TH",
    role: "Project Manager · Remote",
    time: { my: "1 ရက်အကြာ", en: "1 day ago" },
    content: "⚠️ သတိပေးချက်: LINE App ကနေ ဆက်သွယ်လာတဲ့ \"Remote Job\" ကမ်းလှမ်းချက်တွေ သတိထားပါ။ Processing Fee တောင်းရင် အလိမ်ပါ။",
    contentEn: "⚠️ Warning: Be cautious of 'Remote Job' offers via LINE App. If they ask for processing fees, it's a scam.",
    likes: 156, comments: 34, shares: 67, liked: true, category: { my: "သတိပေး", en: "Alert" }
  },
  {
    author: "ဦးအောင်ကျော်", authorEn: "Aung Kyaw", avatar: "AK",
    role: "Engineering Manager · Tokyo",
    time: { my: "2 ရက်အကြာ", en: "2 days ago" },
    content: "ဂျပန်မှာ Technical Intern Training Program (TITP) အကြောင်း သိချင်သူများ ရှိရင် မေးနိုင်ပါတယ်။ ကျွန်တော် ၃ နှစ် အတွေ့အကြုံ ရှိပါတယ်။",
    contentEn: "Happy to answer questions about Japan's TITP program. I have 3 years of experience here.",
    likes: 34, comments: 18, shares: 5, liked: false, category: { my: "မေးခွန်း", en: "Q&A" }
  },
];

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
  const [posts, setPosts] = useState(initialPosts);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("Career");

  const filteredPosts = posts.filter(p =>
    activeCategory === "All" || p.category.en === activeCategory
  );

  const toggleLike = (i: number) => {
    setPosts(prev => prev.map((p, idx) => idx === i ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const handleNewPost = () => {
    if (!newPostText.trim()) return;
    const newPost = {
      author: "မောင်မောင်", authorEn: "Maung Maung", avatar: "MM",
      role: "Full Stack Developer · Bangkok",
      time: { my: "ယခု", en: "Just now" },
      content: newPostText, contentEn: newPostText,
      likes: 0, comments: 0, shares: 0, liked: false,
      category: { my: categories.find(c => c.en === newPostCategory)?.my || newPostCategory, en: newPostCategory }
    };
    setPosts(prev => [newPost, ...prev]);
    setShowNewPost(false);
    setNewPostText("");
    toast({
      title: lang === "my" ? "ပို့စ် တင်ပြီးပါပြီ" : "Post submitted",
      description: lang === "my" ? "စစ်ဆေးပြီးမှ ဖော်ပြပါမည်" : "Your post will appear after review",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "အသိုင်းအဝိုင်း" : "Community"}</h1>
            <p className="text-xs text-muted-foreground">{lang === "my" ? "မြန်မာ့ပညာရှင်များ" : "Myanmar Professionals Forum"}</p>
          </div>
          <Button variant="default" size="sm" className="rounded-xl" onClick={() => setShowNewPost(true)}>
            <Plus className="mr-1 h-4 w-4" /> {lang === "my" ? "ပို့စ်တင်ရန်" : "New Post"}
          </Button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${activeCategory === cat.en ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>
              {lang === "my" ? cat.my : cat.en}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-muted p-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          {lang === "my" ? "သင့်ပို့စ်များကို စစ်ဆေးပြီးမှ ဖော်ပြပါမည်" : "Posts are reviewed before publishing"}
        </p>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowNewPost(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "ပို့စ်အသစ်" : "New Post"}</h2>
                <button onClick={() => setShowNewPost(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">MM</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</p>
                  <p className="text-[10px] text-muted-foreground">Full Stack Developer</p>
                </div>
              </div>

              <Textarea value={newPostText} onChange={e => setNewPostText(e.target.value)} placeholder={lang === "my" ? "သင့်အတွေ့အကြုံကို မျှဝေပါ..." : "Share your experience..."} className="mb-3 min-h-[100px] rounded-xl border-border text-sm" />

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{lang === "my" ? "အမျိုးအစား" : "Category"}</p>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.en !== "All").map(cat => (
                    <button key={cat.en} onClick={() => setNewPostCategory(cat.en)} className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${newPostCategory === cat.en ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {lang === "my" ? cat.my : cat.en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Image className="h-5 w-5" />
                </button>
                <Button variant="gold" size="lg" className="flex-1 rounded-xl" onClick={handleNewPost} disabled={!newPostText.trim()}>
                  <Send className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပို့စ်တင်ရန်" : "Post"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 px-6 pb-6">
        {filteredPosts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
            <MessageCircle className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ပို့စ် မရှိသေးပါ" : "No posts yet"}</p>
          </motion.div>
        ) : (
          filteredPosts.map((post, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">{post.avatar}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? post.author : post.authorEn}</h3>
                    <p className="text-[10px] text-muted-foreground">{post.role} · {lang === "my" ? post.time.my : post.time.en}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${post.category.en === "Alert" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {lang === "my" ? post.category.my : post.category.en}
                  </span>
                  <button className="text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
              </div>

              <p className="mb-3 text-sm leading-relaxed text-foreground">{lang === "my" ? post.content : post.contentEn}</p>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <button onClick={() => toggleLike(posts.indexOf(post))} className={`flex items-center gap-1.5 text-xs ${post.liked ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  <Heart className={`h-4 w-4 ${post.liked ? "fill-destructive" : ""}`} /> {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="h-4 w-4" /> {post.comments}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Share2 className="h-4 w-4" /> {post.shares}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Community;
