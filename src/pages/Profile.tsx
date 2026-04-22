import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, Briefcase, Sparkles, TrendingUp,
  Globe, MapPin, Edit3, Star, LogOut, Settings,
  Gift, Copy, Shield, Check,
  Users, ArrowLeftRight, GraduationCap, Search, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useRole, type UserRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role, setRole } = useRole();
  const { profile, signOut } = useAuth();
  const { allowedRoles, isLoading: rolesLoading, isAdmin, isModerator, isSystemRole } = useUserRoles();
  const effectiveRole = allowedRoles.includes(role) ? role : allowedRoles[0] || role;
  const [referralCopied, setReferralCopied] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showReferredList, setShowReferredList] = useState(false);

  // Fetch referral count
  const { data: referralCount = 0 } = useQuery({
    queryKey: ["referral-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", profile.id)
        .eq("status", "completed");
      if (error) return 0;
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  // Fetch referred friends with their profile info
  const { data: referredFriends = [] } = useQuery({
    queryKey: ["referred-friends", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data: referrals, error } = await supabase
        .from("referrals")
        .select("referred_id, created_at")
        .eq("referrer_id", profile.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error || !referrals?.length) return [];
      const referredIds = referrals.map(r => r.referred_id).filter(Boolean) as string[];
      if (!referredIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .in("id", referredIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return referrals.map(r => ({
        ...profileMap.get(r.referred_id!),
        referral_date: r.created_at,
      })).filter(r => r.display_name);
    },
    enabled: !!profile?.id,
  });

  const displayName = profile?.display_name || (lang === "my" ? "မောင်မောင်" : "User");
  const headline = profile?.headline || (isAdmin ? (lang === "my" ? "စီမံခန့်ခွဲသူ" : "Administrator") : isModerator ? (lang === "my" ? "စစ်ဆေးသူ" : "Moderator") : effectiveRole === "employer" ? (lang === "my" ? "အလုပ်ရှင်" : "Employer") : effectiveRole === "mentor" ? (lang === "my" ? "လမ်းညွှန်သူ" : "Mentor") : "");
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
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const allRoleOptions: { value: UserRole; icon: typeof Search; label: { my: string; en: string }; desc: { my: string; en: string } }[] = [
    { value: "jobseeker", icon: Search, label: { my: "အလုပ်ရှာသူ", en: "Job Seeker" }, desc: { my: "အလုပ်ရှာဖွေရန်၊ CV တည်ဆောက်ရန်", en: "Find jobs, build your CV" } },
    { value: "employer", icon: Briefcase, label: { my: "အလုပ်ရှင်", en: "Employer" }, desc: { my: "အလုပ်ကြော်ငြာတင်ရန်၊ ဝန်ထမ်းရှာရန်", en: "Post jobs, find talent" } },
    { value: "mentor", icon: GraduationCap, label: { my: "လမ်းညွှန်သူ", en: "Mentor" }, desc: { my: "အတွေ့အကြုံ မျှဝေပြီး အခကြေးငွေ ရယူပါ", en: "Share experience & earn" } },
  ];

  // Only show roles the user actually has access to
  const roleOptions = allRoleOptions.filter((r) => allowedRoles.includes(r.value));

  const handleSelectRole = (r: UserRole) => {
    setRole(r);
    setShowRolePicker(false);
    const selected = roleOptions.find(o => o.value === r)!;
  };

  const currentRoleLabel = allRoleOptions.find(o => o.value === effectiveRole) || allRoleOptions[0];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const jobseekerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Sparkles, label: lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Tools", path: "/ai-tools" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "My Applications", path: "/applications" },
    { icon: Wallet, label: lang === "my" ? "ငွေကြေး" : "Finance", path: "/finance" },
    { icon: Star, label: lang === "my" ? "ပရီမီယံသို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const employerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "ကျွန်ုပ်၏ ကြော်ငြာများ" : "My Listings", path: "/employer/dashboard" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "Applications", path: "/employer/applications" },
    { icon: Wallet, label: lang === "my" ? "ငွေကြေး" : "Finance", path: "/employer/finance" },
    { icon: Star, label: lang === "my" ? "စာရင်းသွင်းမှုကို စီမံရန်" : "Manage Subscription", path: "/employer/subscription" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const mentorMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Users, label: lang === "my" ? "ချိန်းဆိုမှု တောင်းဆိုချက်များ" : "Booking Requests", path: "/mentors/bookings" },
    { icon: Sparkles, label: lang === "my" ? "အသက်မွေးမှု ကိရိယာများ" : "Career Tools", path: "/ai-tools" },
    { icon: Wallet, label: lang === "my" ? "ငွေကြေး" : "Finance", path: "/mentor/finance" },
    { icon: Star, label: lang === "my" ? "ပရီမီယံသို့ အဆင့်မြှင့်ရန်" : "Upgrade to Premium", highlight: true, path: "/premium" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const adminMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Users, label: lang === "my" ? "သုံးသူများ စီမံရန်" : "Manage Users", path: "/admin/users" },
    { icon: Briefcase, label: lang === "my" ? "အလုပ်များ စီမံရန်" : "Manage Jobs", path: "/admin/jobs" },
    { icon: TrendingUp, label: lang === "my" ? "စာရင်းအင်း" : "Analytics", path: "/admin/analytics" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const moderatorMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Shield, label: lang === "my" ? "စစ်ဆေးရေး" : "Moderation", path: "/moderator" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const menuItems = isAdmin
    ? adminMenu
    : isModerator
      ? moderatorMenu
        : effectiveRole === "employer"
        ? employerMenu
          : effectiveRole === "mentor"
          ? mentorMenu
          : jobseekerMenu;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွန်ုပ်၏ အကောင့်" : "My Account"} />

      <div className="px-5 pt-4">
        {/* Role Switcher */}
        {!isSystemRole && (
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
                  className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 transition-colors ${effectiveRole === r.value ? "bg-primary/5" : "active:bg-muted"}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${effectiveRole === r.value ? "bg-primary/10" : "bg-muted"}`}>
                    <r.icon className={`h-4 w-4 ${effectiveRole === r.value ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${effectiveRole === r.value ? "text-primary" : "text-foreground"}`}>
                      {lang === "my" ? r.label.my : r.label.en}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? r.desc.my : r.desc.en}</p>
                  </div>
                  {effectiveRole === r.value && <Check className="h-4 w-4 text-primary" strokeWidth={2} />}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>
        )}

        {/* Admin/Moderator Role Badge */}
        {isSystemRole && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Shield className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{lang === "my" ? "အခန်းကဏ္ဍ" : "Role"}</p>
                <p className="text-sm font-semibold text-primary">
                  {isAdmin ? (lang === "my" ? "စီမံခန့်ခွဲသူ" : "Administrator") : (lang === "my" ? "စစ်ဆေးသူ" : "Moderator")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

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
        {!isSystemRole && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်းကို ဖိတ်ပါ" : "Invite Friends"}</h3>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {lang === "my" ? "သူငယ်ချင်း ၅ ဦးကို ဖိတ်ခေါ်နိုင်ပါက ပရီမီယံ ၁ လ အခမဲ့ရရှိမည်" : "Refer 5 friends = 1 free month of Premium"}
          </p>

          {/* How it works */}
          <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "my"
                ? "အောက်ပါ လင့်ခ်ကို သူငယ်ချင်းထံ မျှဝေပါ။ သူတို့ စာရင်းသွင်းသောအခါ ညွှန်းဆိုကုဒ်ကို ထည့်သွင်းပါက သင့်အတွက် အမှတ်ရရှိပါမည်။"
                : "Share the link below with friends. When they sign up and enter your referral code during registration, you earn credit toward free Premium."}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {lang === "my" ? "ညွှန်းဆိုမှု တိုးတက်မှု" : "Referral Progress"}
              </span>
              <span className="text-xs font-bold text-primary">{Math.min(referralCount, 5)}/5</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min((referralCount / 5) * 100, 100)}%` }}
              />
            </div>
            {referralCount >= 5 && (
              <p className="mt-1.5 text-[10px] font-semibold text-primary">
                🎉 {lang === "my" ? "ပရီမီယံ ဆုလာဘ် ရရှိပြီး!" : "Premium reward earned!"}
              </p>
            )}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-mono font-semibold text-foreground">{referralCode}</div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={copyReferral}>
              {referralCopied ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </Button>
          </div>

          {/* Referred friends list */}
          {referralCount > 0 && (
            <>
              <button
                onClick={() => setShowReferredList(!showReferredList)}
                className="flex w-full items-center gap-2 text-xs font-semibold text-primary"
              >
                <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                {lang === "my"
                  ? `ညွှန်းဆိုပြီးသော သူငယ်ချင်းများ (${referralCount})`
                  : `Referred Friends (${referralCount})`}
                <ChevronRight className={`ml-auto h-3.5 w-3.5 transition-transform ${showReferredList ? "rotate-90" : ""}`} strokeWidth={1.5} />
              </button>
              {showReferredList && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-1.5">
                  {referredFriends.map((friend: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-lg bg-card/80 border border-border px-3 py-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          (friend.display_name || "U").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{friend.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {lang === "my" ? "ပါဝင်သည့်ရက်" : "Joined"}{" "}
                          {new Date(friend.referral_date || friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Check className="h-3.5 w-3.5 text-primary/60" strokeWidth={2} />
                    </div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
        )}

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
