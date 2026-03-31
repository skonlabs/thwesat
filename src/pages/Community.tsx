import { motion } from "framer-motion";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Image, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

const posts = [
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

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "အသိုင်းအဝိုင်း" : "Community"}</h1>
            <p className="text-xs text-muted-foreground">{lang === "my" ? "မြန်မာ့ပညာရှင်များ" : "Myanmar Professionals Forum"}</p>
          </div>
          <Button variant="default" size="sm" className="rounded-xl">
            <Plus className="mr-1 h-4 w-4" /> {lang === "my" ? "ပို့စ်တင်ရန်" : "New Post"}
          </Button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, i) => (
            <button key={cat.en} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${i === 0 ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>
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

      <div className="space-y-3 px-6 pb-6">
        {posts.map((post, i) => (
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
              <button className={`flex items-center gap-1.5 text-xs ${post.liked ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
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
        ))}
      </div>
    </div>
  );
};

export default Community;
