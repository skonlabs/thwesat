import { motion } from "framer-motion";
import {
  Settings, ChevronRight, Briefcase, GraduationCap, Award, Sparkles, TrendingUp, MessageCircle,
  Globe, MapPin, Mail, Phone, Edit3, Star, Shield, BookOpen, LogOut, Bell, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/use-language";

const skills = ["React", "TypeScript", "Node.js", "UI/UX Design", "Project Management", "English (Fluent)"];

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const menuItems = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Sparkles, label: lang === "my" ? "AI Profile Builder" : "AI Career Tools", path: "/ai-tools" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "My Applications", path: "/applications" },
    { icon: MessageCircle, label: lang === "my" ? "မက်ဆေ့ချ်များ" : "Messages", path: "/messages" },
    { icon: Star, label: lang === "my" ? "Premium အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Bell, label: lang === "my" ? "အကြောင်းကြားချက်များ" : "Notifications", path: "/notifications" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="relative bg-gradient-gold px-6 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-foreground">{lang === "my" ? "ကျွန်ုပ်၏ ပရိုဖိုင်" : "My Profile"}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle variant="flag" />
            <button onClick={() => navigate("/settings")} className="rounded-full bg-primary-foreground/20 p-2">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="-mt-12 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-xl font-bold text-primary-foreground">MM</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</h2>
              <p className="text-xs text-muted-foreground">{lang === "my" ? "Maung Maung" : "Full Stack Developer"}</p>
              <p className="mt-1 text-sm text-foreground/80">Full Stack Developer</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> Bangkok, Thailand</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Globe className="h-3 w-3" /> Remote Ready</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-muted p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</span>
              <span className="text-xs font-bold text-primary">45%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[45%] rounded-full bg-gradient-gold" />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {lang === "my"
                ? "ပရိုဖိုင်ကို 80% ပြည့်အောင် ဖြည့်ပြီး ပိုမိုကောင်းမွန်သော အလုပ်အကိုင် အကြံပြုချက်များ ရယူပါ"
                : "Complete your profile to 80% for better job recommendations"}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 rounded-2xl bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h3>
            <button className="text-xs font-medium text-primary">{lang === "my" ? "ပြင်ဆင်ရန်" : "Edit"}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{skill}</span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 overflow-hidden rounded-2xl bg-card shadow-card">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/50">
              <item.icon className={`h-4.5 w-4.5 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className={`text-sm ${item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>{item.label}</p>
              </div>
              {item.highlight && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">PRO</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        <Button variant="ghost" className="mt-4 w-full text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => navigate("/")}>
          <LogOut className="mr-2 h-4 w-4" />
          {lang === "my" ? "ထွက်ရန်" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
