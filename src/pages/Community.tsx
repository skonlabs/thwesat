import { motion } from "framer-motion";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Image, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const posts = [
  {
    author: "ဒေါ်ခင်မြတ်နိုး", authorEn: "Khin Myat Noe", avatar: "KM",
    role: "Software Engineer · Singapore",
    time: "2 နာရီအကြာ",
    content: "ထိုင်းမှာ Remote Work လုပ်ဖို့ Pink Card ရပြီးပါပြီ! 🎉 လိုအပ်တဲ့ စာရွက်စာတမ်းတွေနဲ့ အဆင့်ဆင့် လမ်းညွှန်ချက်ကို Legal Guides မှာ ဝေမျှထားပါတယ်။",
    contentEn: "Got my Thai Pink Card for remote work! Shared step-by-step guide in Legal Guides section.",
    likes: 47, comments: 12, shares: 8, liked: true, category: "အောင်မြင်မှု · Success"
  },
  {
    author: "ဦးမင်းထက်", authorEn: "Min Htet", avatar: "MH",
    role: "UX Designer · Bangkok",
    time: "5 နာရီအကြာ",
    content: "Upwork မှာ ပထမဆုံး Client ရပြီးပါပြီ! Profile Builder AI ကို သုံးပြီး ပရိုဖိုင် ပြင်ဆင်ခဲ့တာ အရမ်းအကူအညီ ဖြစ်ပါတယ်။ ကျေးဇူးတင်ပါတယ် ThweSone! 🙏",
    contentEn: "Got my first Upwork client! The AI Profile Builder helped me rewrite my profile perfectly.",
    likes: 89, comments: 23, shares: 15, liked: false, category: "အလုပ်အကိုင် · Career"
  },
  {
    author: "ဒေါ်သီရိ", authorEn: "Thiri", avatar: "TH",
    role: "Project Manager · Remote",
    time: "1 ရက်အကြာ",
    content: "⚠️ သတိပေးချက်: LINE App ကနေ ဆက်သွယ်လာတဲ့ \"Remote Job\" ကမ်းလှမ်းချက်တွေ သတိထားပါ။ Processing Fee တောင်းရင် အလိမ်ပါ။ တရားဝင် အလုပ်ခေါ်စာတွေမှာ ဘယ်တော့မှ ကြိုတင်ကြေး မတောင်းပါ။",
    contentEn: "Warning: Be cautious of 'Remote Job' offers via LINE App. If they ask for processing fees, it's a scam.",
    likes: 156, comments: 34, shares: 67, liked: true, category: "သတိပေး · Alert"
  },
  {
    author: "ဦးအောင်ကျော်", authorEn: "Aung Kyaw", avatar: "AK",
    role: "Engineering Manager · Tokyo",
    time: "2 ရက်အကြာ",
    content: "ဂျပန်မှာ Technical Intern Training Program (TITP) အကြောင်း သိချင်သူများ ရှိရင် မေးနိုင်ပါတယ်။ ကျွန်တော် ၃ နှစ် အတွေ့အကြုံ ရှိပါတယ်။",
    contentEn: "Happy to answer questions about Japan's TITP program. I have 3 years of experience here.",
    likes: 34, comments: 18, shares: 5, liked: false, category: "မေးခွန်း · Q&A"
  },
];

const categories = ["အားလုံး", "အောင်မြင်မှု", "အလုပ်အကိုင်", "သတိပေး", "မေးခွန်း", "ဥပဒေ"];

const Community = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">အသိုင်းအဝိုင်း</h1>
            <p className="text-xs text-muted-foreground">Community Forum · မြန်မာ့ပညာရှင်များ</p>
          </div>
          <Button variant="default" size="sm" className="rounded-xl">
            <Plus className="mr-1 h-4 w-4" /> ပို့စ်တင်ရန်
          </Button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${
                i === 0 ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pending moderation banner */}
      <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-muted p-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          သင့်ပို့စ်များကို စစ်ဆေးပြီးမှ ဖော်ပြပါမည် · Posts are reviewed before publishing
        </p>
      </div>

      <div className="space-y-3 px-6 pb-6">
        {posts.map((post, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
                  {post.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{post.author}</h3>
                  <p className="text-[10px] text-muted-foreground">{post.role} · {post.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  post.category.includes("သတိပေး") ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}>
                  {post.category}
                </span>
                <button className="text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </div>

            <p className="mb-1 text-sm leading-relaxed text-foreground">{post.content}</p>
            <p className="mb-3 text-[11px] text-muted-foreground">{post.contentEn}</p>

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
