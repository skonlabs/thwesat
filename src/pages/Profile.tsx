import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, Briefcase, Sparkles, TrendingUp,
  Globe, MapPin, Edit3, Star, LogOut, Settings,
  Gift, Copy, Shield, Check,
  Users, ArrowLeftRight, GraduationCap, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useRole, type UserRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import PageHeader from "@/components/PageHeader";

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role, setRole } = useRole();
  const { profile, signOut } = useAuth();
  const [referralCopied, setReferralCopied] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const displayName = profile?.display_name || (lang === "my" ? "မောင်မောင်" : "User");
  const headline = profile?.headline || (role === "employer" ? (lang === "my" ? "အလုပ်ရှင်" : "Employer") : role === "mentor" ? (lang === "my" ? "လမ်းညွှန်သူ" : "Mentor") : "");
  const location = profile?.location || "";
  const skills = profile?.skills || [];
  const referralCode = profile?.referral_code || "TS-XXXXXX";
  const avatarInitials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  const profileCompletionFields = [
    profile?.display_name,
    profile?.headline,
    profile?.bio,
    profile?.location,
    profile?.email,
    profile?.skills?.length,
    profile?.languages?.length,
    profile?.experience,
    profile?.avatar_url,
    profile?.phone,
  ];
  const filledCount = profileCompletionFields.filter(Boolean).length;
  const completionPct = Math.round((filledCount / profileCompletionFields.length) * 100);

  const copyReferral = () => {
    navigator.clipboard.writeText(`https://thwesone.com/signup?ref=${referralCode}`);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const allRoleOptions: { value: UserRole; icon: typeof Search; label: { my: string; en: string }; desc: { my: string; en: string } }[] = [
    { value: "jobseeker", icon: Search, label: { my: "အလုပ်ရှာသူ", en: "Job Seeker" }, desc: { my: "အလုပ်ရှာဖွေရန်၊ CV တည်ဆောက်ရန်", en: "Find jobs, build your CV" } },
    { value: "employer", icon: Briefcase, label: { my: "အလုပ်ရှင်", en: "Employer" }, desc: { my: "အလုပ်ကြော်ငြာတင်ရန်၊ ဝန်ထမ်းရှာရန်", en: "Post jobs, find talent" } },
    { value: "mentor", icon: GraduationCap, label: { my: "လမ်းညွှန်သူ", en: "Mentor" }, desc: { my: "အတွေ့အကြုံ မျှဝေပြီး အခကြေးငွေ ရယူပါ", en: "Share experience & earn" } },
  ];

  // Job Seeker and Employer are mutually exclusive — only show the other non-conflicting roles
  const roleOptions = allRoleOptions.filter((r) => {
    if (role === "jobseeker" && r.value === "employer") return false;
    if (role === "employer" && r.value === "jobseeker") return false;
    return true;
  });

  const handleSelectRole = (r: UserRole) => {
    setRole(r);
    setShowRolePicker(false);
    const selected = roleOptions.find(o => o.value === r)!;
  };

  const currentRoleLabel = allRoleOptions.find(o => o.value === role)!;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const jobseekerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Sparkles, label: lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Tools", path: "/ai-tools" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "My Applications", path: "/applications" },
    { icon: Star, label: lang === "my" ? "ပရီမီယံသို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const employerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "ကျွန်ုပ်၏ ကြော်ငြာများ" : "My Listings", path: "/employer/dashboard" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "Applications", path: "/employer/applications" },
    { icon: Star, label: lang === "my" ? "စာရင်းသွင်းမှုကို စီမံရန်" : "Manage Subscription", path: "/employer/subscription" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const mentorMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Users, label: lang === "my" ? "ချိန်းဆိုမှု တောင်းဆိုချက်များ" : "Booking Requests", path: "/mentors/bookings" },
    { icon: Sparkles, label: lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Tools", path: "/ai-tools" },
    { icon: Star, label: lang === "my" ? "ပရီမီယံသို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const menuItems = role === "employer" ? employerMenu : role === "mentor" ? mentorMenu : jobseekerMenu;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွန်ုပ်၏ အကောင့်" : "My Account"} />

      <div className="px-5 pt-4">
        {/* Role Switcher */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <button
            onClick={() => setShowRolePicker(!showRolePicker)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors active:bg-primary/10"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{lang === "my" ? "လက်ရှိ အခန်းကဏ္ဍ" : "Current Role"}</p>
              <p className="text-sm font-semibold text-primary">
                {lang === "my" ? currentRoleLabel.label.my : currentRoleLabel.label.en}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {lang === "my" ? "ပြောင်းရန်" : "Switch"}
            </span>
          </button>

          {showRolePicker && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
              {roleOptions.map((r) => (
                <button key={r.value} onClick={() => handleSelectRole(r.value)}
                  className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 transition-colors ${role === r.value ? "bg-primary/5" : "active:bg-muted"}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${role === r.value ? "bg-primary/10" : "bg-muted"}`}>
                    <r.icon className={`h-4 w-4 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${role === r.value ? "text-primary" : "text-foreground"}`}>
                      {lang === "my" ? r.label.my : r.label.en}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? r.desc.my : r.desc.en}</p>
                  </div>
                  {role === r.value && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : avatarInitials}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground">{displayName}</h2>
              <p className="text-xs text-muted-foreground">{headline}</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                {location && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {location}</span>}
                {profile?.remote_ready && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Globe className="h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? "အဝေးထိန်း" : "Remote"}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</span>
              <span className="text-xs font-bold text-primary">{completionPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </motion.div>

        {/* Referral Programme */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်းကို ဖိတ်ပါ" : "Invite Friends"}</h3>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {lang === "my" ? "သူငယ်ချင်း ၅ ဦးကို ဖိတ်ခေါ်နိုင်ပါက ပရီမီယံ ၁ လ အခမဲ့ရရှိမည်" : "Refer 5 friends = 1 free month of Premium"}
          </p>
          <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "my"
                ? "အောက်ပါ လင့်ခ်ကို သူငယ်ချင်းထံ မျှဝေပါ။ သူတို့ စာရင်းသွင်းသောအခါ ညွှန်းဆိုကုဒ်ကို ထည့်သွင်းပါက သင့်အတွက် အမှတ်ရရှိပါမည်။"
                : "Share the link below with friends. When they sign up and enter your referral code during registration, you earn credit toward free Premium."}
            </p>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-mono font-semibold text-foreground">{referralCode}</div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={copyReferral}>
              {referralCopied ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </Button>
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 active:bg-muted">
              <item.icon className={`h-5 w-5 ${'highlight' in item && item.highlight ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <p className={`flex-1 text-sm ${'highlight' in item && item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>{item.label}</p>
              {'highlight' in item && item.highlight && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{lang === "my" ? "ပရို" : "PRO"}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
        </motion.div>

        <Button variant="ghost" className="mt-4 w-full text-destructive hover:bg-destructive/5" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {lang === "my" ? "ထွက်ရန်" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Profile;
