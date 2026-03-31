import { motion } from "framer-motion";
import {
  ChevronRight, Briefcase, Sparkles, TrendingUp,
  Globe, MapPin, Edit3, Star, LogOut, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const skills = ["React", "TypeScript", "Node.js", "UI/UX Design", "Project Management", "English (Fluent)"];

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const menuItems = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Sparkles, label: lang === "my" ? "Career Tools" : "Career Tools", path: "/ai-tools" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "My Applications", path: "/applications" },
    { icon: Star, label: lang === "my" ? "Premium အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွန်ုပ်၏ ပရိုဖိုင်" : "My Profile"} />

      <div className="px-5 pt-4">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">MM</div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</h2>
              <p className="text-xs text-muted-foreground">Full Stack Developer</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> Bangkok, TH</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Globe className="h-3 w-3" strokeWidth={1.5} /> Remote</span>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</span>
              <span className="text-xs font-bold text-primary">45%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[45%] rounded-full bg-primary" />
            </div>
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h3>
            <button onClick={() => navigate("/profile/edit")} className="text-xs font-medium text-primary active:text-primary/70">{lang === "my" ? "ပြင်ဆင်ရန်" : "Edit"}</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span key={skill} className="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{skill}</span>
            ))}
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 active:bg-muted">
              <item.icon className={`h-5 w-5 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <p className={`flex-1 text-sm ${item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>{item.label}</p>
              {item.highlight && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">PRO</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
        </motion.div>

        <Button variant="ghost" className="mt-4 w-full text-destructive hover:bg-destructive/5" onClick={() => navigate("/")}>
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {lang === "my" ? "ထွက်ရန်" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
