import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, Briefcase, Sparkles, TrendingUp,
  Globe, MapPin, Edit3, Star, LogOut, Settings,
  Gift, Copy, Shield, Laptop, CreditCard, Check,
  Users, ArrowLeftRight, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const skills = ["React", "TypeScript", "Node.js", "UI/UX Design", "Project Management", "English (Fluent)"];

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role, setRole, isMentor, toggleMentor } = useRole();
  const { toast } = useToast();
  const [referralCopied, setReferralCopied] = useState(false);
  const referralCode = "TS-A1B2C3";

  const copyReferral = () => {
    navigator.clipboard.writeText(`https://thwesone.com/signup?ref=${referralCode}`);
    setReferralCopied(true);
    toast({ title: lang === "my" ? "ညွှန်းဆိုလင့်ခ် ကူးပြီးပါပြီ" : "Referral link copied!" });
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleSwitchRole = () => {
    const next = role === "jobseeker" ? "employer" : "jobseeker";
    setRole(next);
    toast({
      title: lang === "my"
        ? (next === "employer" ? "အလုပ်ရှင် အနေဖြင့် ပြောင်းပြီးပါပြီ" : "အလုပ်ရှာသူ အနေဖြင့် ပြောင်းပြီးပါပြီ")
        : (next === "employer" ? "Switched to Employer" : "Switched to Job Seeker"),
    });
  };

  const handleToggleMentor = () => {
    toggleMentor();
    toast({
      title: !isMentor
        ? (lang === "my" ? "Mentor အဖြစ် စာရင်းသွင်းပြီးပါပြီ ✓" : "Registered as Mentor ✓")
        : (lang === "my" ? "Mentor အဖြစ် ဖယ်ရှားပြီးပါပြီ" : "Mentor status removed"),
    });
  };

  const jobseekerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Sparkles, label: lang === "my" ? "အသက်မွေးမှု Tools" : "Career Tools", path: "/ai-tools" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "My Applications", path: "/applications" },
    { icon: Star, label: lang === "my" ? "Premium အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const employerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "ကျွန်ုပ်၏ ကြော်ငြာများ" : "My Listings", path: "/employer/dashboard" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "Applications", path: "/employer/applications" },
    { icon: Star, label: lang === "my" ? "Subscription စီမံရန်" : "Manage Subscription", path: "/employer/subscription" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const menuItems = role === "employer" ? employerMenu : jobseekerMenu;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွန်ုပ်၏ ပရိုဖိုင်" : "My Profile"} />

      <div className="px-5 pt-4">
        {/* Role Switcher */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-center gap-2">
          <button
            onClick={handleSwitchRole}
            className="flex flex-1 items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors active:bg-primary/10"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "လက်ရှိ အခန်းကဏ္ဍ" : "Current Role"}</p>
              <p className="text-sm font-semibold text-primary">
                {role === "employer"
                  ? (lang === "my" ? "အလုပ်ရှင်" : "Employer")
                  : (lang === "my" ? "အလုပ်ရှာသူ" : "Job Seeker")}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {lang === "my" ? "ပြောင်းရန်" : "Switch"}
            </span>
          </button>
        </motion.div>

        {/* Become Mentor Toggle */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="mb-3">
          <button
            onClick={handleToggleMentor}
            className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-colors ${
              isMentor ? "border-emerald/30 bg-emerald/5" : "border-border bg-card active:bg-muted"
            }`}
          >
            <GraduationCap className={`h-4 w-4 ${isMentor ? "text-emerald" : "text-muted-foreground"}`} strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isMentor
                  ? (lang === "my" ? "Mentor အဖြစ် စာရင်းဝင်ပြီး" : "You are a Mentor")
                  : (lang === "my" ? "Mentor ဖြစ်လိုပါသလား?" : "Become a Mentor")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isMentor
                  ? (lang === "my" ? "နှိပ်ပြီး ဖယ်ရှားနိုင်ပါသည်" : "Tap to remove mentor status")
                  : (lang === "my" ? "အတွေ့အကြုံ မျှဝေပြီး အခကြေးငွေ ရယူပါ" : "Share experience & earn")}
              </p>
            </div>
            {isMentor && <Check className="h-4 w-4 text-emerald" strokeWidth={2} />}
          </button>
        </motion.div>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">MM</div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</h2>
              <p className="text-xs text-muted-foreground">
                {role === "employer" ? (lang === "my" ? "အလုပ်ရှင်" : "Employer") : "Full Stack Developer"}
                {isMentor && <span className="ml-1.5 text-emerald">• Mentor</span>}
              </p>
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

        {/* Remote Work Readiness - only for jobseekers */}
        {role === "jobseeker" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-3 rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "Remote Work အသင့်အနေ" : "Remote Work Readiness"}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Laptop, label: lang === "my" ? "Laptop ရှိ" : "Has Laptop", active: true },
                { icon: Globe, label: lang === "my" ? "Internet တည်ငြိမ်" : "Stable Internet", active: true },
                { icon: CreditCard, label: "Payoneer", active: true },
                { icon: CreditCard, label: "Wise", active: false },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg p-2 ${item.active ? "bg-emerald/5" : "bg-muted"}`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.active ? "text-emerald" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  <span className={`text-[11px] font-medium ${item.active ? "text-emerald" : "text-muted-foreground"}`}>{item.label}</span>
                  {item.active && <Check className="ml-auto h-3 w-3 text-emerald" strokeWidth={2} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills - only for jobseekers */}
        {role === "jobseeker" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 rounded-xl border border-border bg-card p-4">
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
        )}

        {/* Referral Programme */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်းကို ဖိတ်ပါ" : "Invite Friends"}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {lang === "my" ? "သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုပါက Premium ၁ လ အခမဲ့" : "Refer 5 friends = 1 free month of Premium"}
          </p>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-mono font-semibold text-foreground">{referralCode}</div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={copyReferral}>
              {referralCopied ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[40%] rounded-full bg-primary" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">2/5</span>
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 active:bg-muted">
              <item.icon className={`h-5 w-5 ${'highlight' in item && item.highlight ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <p className={`flex-1 text-sm ${'highlight' in item && item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>{item.label}</p>
              {'highlight' in item && item.highlight && (
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
