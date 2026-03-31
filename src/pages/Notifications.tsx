import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Briefcase, Users, MessageCircle, Star, Shield, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

const notifications = [
  { icon: Briefcase, title: "အလုပ်အသစ် သင့်အတွက် ကိုက်ညီပါသည်", titleEn: "New job matches your profile", desc: { my: "Senior React Developer - TechCorp Asia · $3,000-5,000/mo", en: "Senior React Developer - TechCorp Asia · $3,000-5,000/mo" }, time: "10 min", type: "job", read: false, path: "/jobs/detail" },
  { icon: CheckCircle, title: "လျှောက်လွှာ အခြေအနေ ပြောင်းလဲမှု", titleEn: "Application status updated", desc: { my: "UI/UX Designer at DesignStudio - ရွေးချယ်ခံရ ✨", en: "UI/UX Designer at DesignStudio - Shortlisted ✨" }, time: "1 hr", type: "application", read: false, path: "/applications" },
  { icon: Users, title: "လမ်းညွှန်သူ တုံ့ပြန်ချက်", titleEn: "Mentor responded", desc: { my: "ဒေါ်ခင်မြတ်နိုး က သင့် mentorship တောင်းဆိုမှုကို လက်ခံပါပြီ", en: "Khin Myat Noe accepted your mentorship request" }, time: "2 hr", type: "mentor", read: false, path: "/mentors/detail" },
  { icon: MessageCircle, title: "မက်ဆေ့ချ် အသစ်", titleEn: "New message", desc: { my: "TechCorp Asia HR: အင်တာဗျူး အချိန်ဇယား အတည်ပြုပြီး", en: "TechCorp Asia HR: Interview schedule confirmed" }, time: "3 hr", type: "message", read: true, path: "/messages/chat" },
  { icon: Shield, title: "လမ်းညွှန်ချက် အသစ်", titleEn: "New legal guide published", desc: { my: "ထိုင်းတွင် Freelancer အဖြစ် အခွန်ဆောင်နည်း", en: "How to file taxes as a freelancer in Thailand" }, time: "1 day", type: "guide", read: true, path: "/guides/detail" },
  { icon: Star, title: "Premium အခွင့်အရေး", titleEn: "Premium offer", desc: { my: "Founding member rate - $5/mo (အချိန်ကန့်သတ်)", en: "Founding member rate - $5/mo (limited time)" }, time: "2 days", type: "premium", read: true, path: "/premium" },
];

const typeColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  application: "bg-emerald/10 text-emerald",
  mentor: "bg-gold/10 text-gold-dark",
  message: "bg-accent/10 text-accent",
  guide: "bg-secondary text-secondary-foreground",
  premium: "bg-primary/10 text-primary",
};

const Notifications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifs = filter === "unread" ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "အကြောင်းကြားချက်" : "Notifications"}</h1>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button onClick={() => setFilter("all")} className={`rounded-full px-4 py-1.5 text-xs font-medium ${filter === "all" ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>
            {lang === "my" ? "အားလုံး" : "All"}
          </button>
          <button onClick={() => setFilter("unread")} className={`rounded-full px-4 py-1.5 text-xs font-medium ${filter === "unread" ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>
            {lang === "my" ? `မဖတ်ရသေး (${notifications.filter(n => !n.read).length})` : `Unread (${notifications.filter(n => !n.read).length})`}
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {filteredNotifs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-6">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "မဖတ်ရသေးသော အကြောင်းကြားချက် မရှိပါ" : "No unread notifications"}</p>
          </div>
        ) : (
          filteredNotifs.map((notif, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(notif.path)}
              className={`flex w-full items-start gap-3 px-6 py-4 text-left transition-all active:bg-muted/30 ${!notif.read ? "bg-primary/[0.03]" : ""}`}
            >
              <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${typeColors[notif.type]}`}>
                <notif.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm leading-snug ${!notif.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                    {lang === "my" ? notif.title : notif.titleEn}
                  </h3>
                  {!notif.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {lang === "my" ? notif.desc.my : notif.desc.en}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">{notif.time} {lang === "my" ? "အကြာ" : "ago"}</p>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
