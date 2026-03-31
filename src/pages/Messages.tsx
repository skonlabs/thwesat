import { motion } from "framer-motion";
import { Search, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const conversations = [
  { name: "ဒေါ်ခင်မြတ်နိုး", nameEn: "Khin Myat Noe", avatar: "KM", role: "Mentor · Software Engineer", lastMsg: { my: "ပရိုဖိုင်ကို ကြည့်ပြီးပါပြီ။ ကောင်းပါတယ်!", en: "Reviewed your profile. Looks good!" }, time: "10 min", unread: 2, online: true },
  { name: "ဦးဇော်မင်း", nameEn: "Zaw Min", avatar: "ZM", role: "Mentor · Product Designer", lastMsg: { my: "Portfolio ကို ပြင်ဆင်ပြီးရင် ပို့ပေးပါ", en: "Send your portfolio when it's ready" }, time: "1 hr", unread: 0, online: false },
  { name: "ဒေါ်သီတာ", nameEn: "Thida", avatar: "TH", role: "Mentor · Immigration Lawyer", lastMsg: { my: "Pink Card documents list ကို ပို့ပေးလိုက်ပါတယ်", en: "Sent you the Pink Card documents list" }, time: "3 hr", unread: 1, online: true },
  { name: "TechCorp Asia HR", nameEn: "TechCorp HR", avatar: "TC", role: "Employer", lastMsg: { my: "Interview schedule ကို အတည်ပြုပေးပါ", en: "Please confirm the interview schedule" }, time: "1 day", unread: 0, online: false },
];

const Messages = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages"}</h1>
        </div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-emerald">
          <Lock className="h-3 w-3" />
          <span>{lang === "my" ? "စာများကို ကုဒ်ဝှက်ထားပါသည်" : "End-to-end encrypted"}</span>
        </div>

        <div className="mb-4 mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder={lang === "my" ? "မက်ဆေ့ချ် ရှာဖွေရန်..." : "Search messages..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="divide-y divide-border">
        {conversations.map((conv, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate("/messages/chat")}
            className="flex w-full items-start gap-3 px-6 py-3.5 text-left transition-all active:bg-muted/30"
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">{conv.avatar}</div>
              {conv.online && (<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald" />)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? conv.name : conv.nameEn}</h3>
                <span className="text-[10px] text-muted-foreground">{conv.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{conv.role}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{lang === "my" ? conv.lastMsg.my : conv.lastMsg.en}</p>
            </div>
            {conv.unread > 0 && (
              <span className="mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{conv.unread}</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Messages;
