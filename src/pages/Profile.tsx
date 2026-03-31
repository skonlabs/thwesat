import { motion } from "framer-motion";
import {
  Settings, ChevronRight, Briefcase, GraduationCap, Award, Sparkles, TrendingUp, MessageCircle,
  Globe, MapPin, Mail, Phone, Edit3, Star, Shield, BookOpen, LogOut, Bell, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const skills = ["React", "TypeScript", "Node.js", "UI/UX Design", "Project Management", "English (Fluent)"];

const menuItems = [
  { icon: Edit3, label: "ပရိုဖိုင် ပြင်ဆင်ရန်", labelEn: "Edit Profile", path: "/profile" },
  { icon: Briefcase, label: "သိမ်းထားသော အလုပ်များ", labelEn: "Saved Jobs", path: "/jobs/saved" },
  { icon: Sparkles, label: "AI Profile Builder", labelEn: "AI Career Tools", path: "/ai-tools" },
  { icon: TrendingUp, label: "လျှောက်လွှာများ", labelEn: "My Applications", path: "/applications" },
  { icon: MessageCircle, label: "မက်ဆေ့ချ်များ", labelEn: "Messages", path: "/messages" },
  { icon: Star, label: "Premium အဆင့်မြှင့်ရန်", labelEn: "Upgrade to Premium", highlight: true, path: "/premium" },
  { icon: Bell, label: "အကြောင်းကြားချက်များ", labelEn: "Notifications", path: "/notifications" },
  { icon: Settings, label: "ဆက်တင်များ", labelEn: "Settings", path: "/settings" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header with gradient */}
      <div className="relative bg-gradient-gold px-6 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary-foreground">ကျွန်ုပ်၏ ပရိုဖိုင်</h1>
          <button className="rounded-full bg-primary-foreground/20 p-2">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      <div className="px-6">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-12 rounded-2xl bg-card p-5 shadow-card"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-xl font-bold text-primary-foreground">
              MM
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">မောင်မောင်</h2>
              <p className="text-xs text-muted-foreground">Maung Maung</p>
              <p className="mt-1 text-sm text-foreground/80">Full Stack Developer</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Bangkok, Thailand
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Globe className="h-3 w-3" /> Remote Ready
                </span>
              </div>
            </div>
          </div>

          {/* Profile completion */}
          <div className="mt-4 rounded-xl bg-muted p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">ပရိုဖိုင် ပြည့်စုံမှု</span>
              <span className="text-xs font-bold text-primary">45%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[45%] rounded-full bg-gradient-gold" />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              ပရိုဖိုင်ကို 80% ပြည့်အောင် ဖြည့်ပြီး ပိုမိုကောင်းမွန်သော အလုပ်အကိုင် အကြံပြုချက်များ ရယူပါ
            </p>
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 rounded-2xl bg-card p-4 shadow-card"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">ကျွမ်းကျင်မှုများ · Skills</h3>
            <button className="text-xs font-medium text-primary">ပြင်ဆင်ရန်</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {skill}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Menu items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 overflow-hidden rounded-2xl bg-card shadow-card"
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => item.path && navigate(item.path)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted/50"
            >
              <item.icon className={`h-4.5 w-4.5 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className={`text-sm ${item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{item.labelEn}</p>
              </div>
              {item.highlight && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  PRO
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        {/* Sign out */}
        <Button
          variant="ghost"
          className="mt-4 w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={() => navigate("/")}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ထွက်ရန် · Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;
