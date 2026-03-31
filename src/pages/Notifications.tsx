import { motion } from "framer-motion";
import { ArrowLeft, Bell, Briefcase, Users, MessageCircle, Star, Shield, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const notifications = [
  { icon: Briefcase, title: "အလုပ်အသစ် သင့်အတွက် ကိုက်ညီပါသည်", titleEn: "New job matches your profile", desc: "Senior React Developer - TechCorp Asia · $3,000-5,000/mo", time: "10 min", type: "job", read: false },
  { icon: CheckCircle, title: "လျှောက်လွှာ အခြေအနေ ပြောင်းလဲမှု", titleEn: "Application status updated", desc: "UI/UX Designer at DesignStudio - Shortlisted ✨", time: "1 hr", type: "application", read: false },
  { icon: Users, title: "လမ်းညွှန်သူ တုံ့ပြန်ချက်", titleEn: "Mentor responded", desc: "ဒေါ်ခင်မြတ်နိုး accepted your mentorship request", time: "2 hr", type: "mentor", read: false },
  { icon: MessageCircle, title: "မက်ဆေ့ချ် အသစ်", titleEn: "New message", desc: "TechCorp Asia HR: Interview schedule confirmed", time: "3 hr", type: "message", read: true },
  { icon: Shield, title: "လမ်းညွှန်ချက် အသစ်", titleEn: "New legal guide published", desc: "ထိုင်းတွင် Freelancer အဖြစ် အခွန်ဆောင်နည်း", time: "1 day", type: "guide", read: true },
  { icon: Star, title: "Premium အခွင့်အရေး", titleEn: "Premium offer", desc: "Founding member rate - $5/mo (limited time)", time: "2 days", type: "premium", read: true },
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

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">အကြောင်းကြားချက်</h1>
            <p className="text-xs text-muted-foreground">Notifications</p>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-gold">
            အားလုံး
          </button>
          <button className="rounded-full bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            မဖတ်ရသေး (3)
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {notifications.map((notif, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex w-full items-start gap-3 px-6 py-4 text-left transition-all active:bg-muted/30 ${!notif.read ? "bg-primary/[0.03]" : ""}`}
          >
            <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${typeColors[notif.type]}`}>
              <notif.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-sm leading-snug ${!notif.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                  {notif.title}
                </h3>
                {!notif.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{notif.desc}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">{notif.time} ago</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
