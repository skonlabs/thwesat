import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, Briefcase, Sparkles, TrendingUp,
  Globe, MapPin, Edit3, Star, LogOut, Settings,
  Gift, Copy, Shield, Check, FileText, Download, Eye,
  Users, ArrowLeftRight, GraduationCap, Search, Wallet, Building2, CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useReferralRewards } from "@/hooks/use-app-config";
import { useRole, type UserRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { computeProfileCompletion } from "@/lib/profile-completion";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

import SubscribeSheet from "@/components/pricing/SubscribeSheet";
import { useProfileBoostAddon, useMyPendingSubscriptionRequests } from "@/hooks/use-subscription";
import { formatCredits, useFeatureUnlocks } from "@/hooks/use-wallet";
import { Sparkles as SparklesIcon } from "lucide-react";
import ProfileDashboardHero from "@/components/profile/ProfileDashboardHero";

const Profile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: referralRewards } = useReferralRewards();
  const refFriends = referralRewards?.friends_required ?? 5;
  const refCredits = referralRewards?.reward_credits ?? 5000;
  const { role, setRole } = useRole();
  const { profile, signOut } = useAuth();
  const { allowedRoles, isLoading: rolesLoading, isAdmin, isSystemRole } = useUserRoles();
  const { data: employerProfile } = useEmployerProfile();
  const profileRole = (profile?.primary_role as UserRole) || undefined;
  const effectiveRole = allowedRoles.includes(role)
    ? role
    : (profileRole && allowedRoles.includes(profileRole) ? profileRole : (allowedRoles[0] || profileRole || role));
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showReferredList, setShowReferredList] = useState(false);
  const [showAllCodes, setShowAllCodes] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const { data: boostUnlocks = [] } = useFeatureUnlocks("profile_boost");
  const activeBoost = boostUnlocks.find((u: any) => !u.expires_at || new Date(u.expires_at) > new Date());
  // Show "expired" badge when the most recent boost has elapsed (server tick
  // hasn't deactivated it yet, or the user simply hasn't renewed).
  const recentlyExpiredBoost = !activeBoost
    ? boostUnlocks
        .filter((u: any) => u.expires_at && new Date(u.expires_at) <= new Date())
        .sort((a: any, b: any) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0]
    : null;
  const { data: boostAddon } = useProfileBoostAddon();
  const { data: pendingSubRequests = [] } = useMyPendingSubscriptionRequests();
  const pendingBoost = !activeBoost && !!boostAddon && pendingSubRequests.some(
    (r) => r.request_type === "addon" && r.addon_id === boostAddon.id
  );

  // Fetch one-time-use referral codes for this user
  const { data: myCodes = [], refetch: refetchCodes } = useQuery({
    queryKey: ["my-referral-codes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("referral_codes")
        .select("code, status, used_by, used_at, created_at")
        .eq("owner_id", profile.id)
        .order("status", { ascending: true })
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const unusedCodes = myCodes.filter((c: any) => c.status === "unused");
  const usedCodesCount = myCodes.length - unusedCodes.length;

  // Referral count = number of used codes (kept for friends list compatibility)
  const referralCount = usedCodesCount;

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
      const { data: profiles } = await (supabase as any)
        .from("v_profiles")
        .select("id, display_name, avatar_url, created_at")
        .in("id", referredIds);
      const profileMap = new Map<string, any>(((profiles as any[]) || []).map((p: any) => [p.id, p]));
      return referrals.map(r => ({
        ...(profileMap.get(r.referred_id!) || {}),
        referral_date: r.created_at,
      })).filter((r: any) => r.display_name);

    },
    enabled: !!profile?.id,
  });

  // Fetch CV documents for this user
  const { data: cvDocuments = [], refetch: refetchCvs } = useQuery({
    queryKey: ["cv-documents", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await (supabase as any)
        .from("user_documents")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id && effectiveRole === "job_seeker",
  });

  const getCvStoragePath = (fileUrl: string) => {
    if (!fileUrl) return "";
    if (fileUrl.includes("/cv-documents/")) return fileUrl.split("/cv-documents/").pop() || "";
    return fileUrl;
  };

  const openCv = async (fileUrl: string) => {
    const path = getCvStoragePath(fileUrl);
    if (!path) return;
    const { data, error } = await supabase.storage.from("cv-documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const downloadCv = async (fileUrl: string, fileName: string) => {
    const path = getCvStoragePath(fileUrl);
    if (!path) return;
    const { data, error } = await supabase.storage.from("cv-documents").download(path);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "cv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteCv = async (id: string, fileUrl: string) => {
    // Delete the row FIRST so a storage-cleanup failure can never leave a
    // dangling DB record pointing at a missing file.
    const { error } = await (supabase as any).from("user_documents").delete().eq("id", id);
    if (error) return;
    const path = getCvStoragePath(fileUrl);
    if (path) {
      // Best-effort storage cleanup; row is already gone.
      await supabase.storage.from("cv-documents").remove([path]).catch(() => {});
    }
    refetchCvs();
  };

  const displayName = profile?.display_name || (lang === "my" ? "မောင်မောင်" : "User");
  const headline = profile?.headline || (isAdmin ? (lang === "my" ? "စီမံခန့်ခွဲသူ" : "Administrator") : effectiveRole === "employer" ? (lang === "my" ? "အလုပ်ရှင်" : "Employer") : effectiveRole === "agent" ? (lang === "my" ? "ခေါ်ယူရေး အေဂျင့်" : "Recruiting Agent") : effectiveRole === "mentor" ? (lang === "my" ? "လမ်းညွှန်သူ" : "Mentor") : "");
  const location = profile?.location || "";
  const skills = profile?.skills || [];
  const avatarInitials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  // Mirrors DB `is_profile_complete` — bonus eligibility depends on this match.
  const { percent: completionPct } = computeProfileCompletion(profile as any);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateMoreCodes = async () => {
    if (!profile?.id) return;
    const { error } = await supabase.rpc("mint_referral_codes", { _owner_id: profile.id, _count: 10 });
    if (error) return;
    refetchCodes();
  };

  const allRoleOptions: { value: UserRole; icon: typeof Search; label: { my: string; en: string }; desc: { my: string; en: string } }[] = [
    { value: "job_seeker", icon: Search, label: { my: "အလုပ်ရှာသူ", en: "Job Seeker" }, desc: { my: "အလုပ်ရှာဖွေရန်၊ CV တည်ဆောက်ရန်", en: "Find jobs, build your CV" } },
    { value: "employer", icon: Briefcase, label: { my: "အလုပ်ရှင်", en: "Employer" }, desc: { my: "အလုပ်ကြော်ငြာတင်ရန်၊ ဝန်ထမ်းရှာရန်", en: "Post jobs, find talent" } },
    { value: "agent", icon: Briefcase, label: { my: "ခေါ်ယူရေး အေဂျင့်", en: "Recruiting Agent" }, desc: { my: "အခြားကုမ္ပဏီအတွက် ခေါ်ယူ", en: "Recruit for clients" } },
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
  const companyEditPath = effectiveRole === "agent" ? "/agent/profile" : "/employer/edit-company";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const jobseekerMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Briefcase, label: lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs", path: "/jobs/saved" },
    { icon: Wallet, label: lang === "my" ? "Package အစီအစဉ်" : "Plans & Billing", highlight: true, path: "/pricing" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const employerMenu = [
    { icon: Edit3, label: effectiveRole === "agent" ? (lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile") : (lang === "my" ? "ကုမ္ပဏီ ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Company Profile"), path: companyEditPath },
    { icon: Briefcase, label: lang === "my" ? "ကျွန်ုပ်၏ ကြော်ငြာများ" : "My Listings", path: "/employer/dashboard" },
    { icon: TrendingUp, label: lang === "my" ? "လျှောက်လွှာများ" : "Applications", path: "/employer/applications" },
    
    { icon: Wallet, label: lang === "my" ? "Package အစီအစဉ်" : "Plans & Billing", highlight: true, path: "/pricing" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const mentorMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: CalendarClock, label: lang === "my" ? "အချိန်ဇယားနှင့် ရနိုင်မှု" : "Availability & Time Slots", path: "/mentor/preferences" },
    { icon: Users, label: lang === "my" ? "ချိန်းဆိုမှု တောင်းဆိုချက်များ" : "Booking Requests", path: "/mentors/bookings" },
    { icon: Wallet, label: lang === "my" ? "Package အစီအစဉ်" : "Plans & Billing", highlight: true, path: "/pricing" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const adminMenu = [
    { icon: Edit3, label: lang === "my" ? "ပရိုဖိုင် ပြင်ဆင်ရန်" : "Edit Profile", path: "/profile/edit" },
    { icon: Users, label: lang === "my" ? "သုံးသူများ စီမံရန်" : "Manage Users", path: "/admin/users" },
    { icon: Briefcase, label: lang === "my" ? "အလုပ်များ စီမံရန်" : "Manage Jobs", path: "/admin/jobs" },
    { icon: TrendingUp, label: lang === "my" ? "စာရင်းအင်း" : "Analytics", path: "/admin/analytics" },
    { icon: Settings, label: lang === "my" ? "ဆက်တင်များ" : "Settings", path: "/settings" },
  ];

  const menuItems = isAdmin
    ? adminMenu
    : effectiveRole === "employer" || effectiveRole === "agent"
      ? (effectiveRole === "agent"
          ? [
              ...employerMenu.filter(m => m.path !== "/employer/applications").slice(0, 2),
              { icon: Building2, label: lang === "my" ? "သုံးစွဲသူ ကုမ္ပဏီများ" : "Client Companies", path: "/agent/clients" },
              ...employerMenu.filter(m => m.path !== "/employer/applications").slice(2),
            ]
          : employerMenu)
      : effectiveRole === "mentor"
        ? mentorMenu
        : jobseekerMenu;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title={lang === "my" ? "ကျွန်ုပ်၏ အကောင့်" : "My Account"} />

      <div className="px-5 pt-4">
        {/* Role Switcher */}
        {!isSystemRole && (effectiveRole === "job_seeker" || effectiveRole === "mentor") && (
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

        {/* Admin / Partner Role Badge */}
        {isSystemRole && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Shield className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{lang === "my" ? "အခန်းကဏ္ဍ" : "Role"}</p>
                <p className="text-sm font-semibold text-primary">
                  {isAdmin ? (lang === "my" ? "စီမံခန့်ခွဲသူ" : "Administrator") : (lang === "my" ? "ပါတနာ" : "Partner")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <ProfileDashboardHero
          displayName={displayName}
          headline={headline}
          location={location}
          remoteReady={!!profile?.remote_ready}
          avatarUrl={profile?.avatar_url || null}
          avatarInitials={avatarInitials}
          completionPct={completionPct}
          isJobseeker={effectiveRole === "job_seeker"}
          lang={lang}
          onEdit={() => navigate((effectiveRole === "employer" || effectiveRole === "agent") ? companyEditPath : "/profile/edit")}
          onNavigate={navigate}
        />

        {/* Company Info — Employer / Agent */}
        {(effectiveRole === "employer" || effectiveRole === "agent") && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
            {employerProfile?.cover_url && (
              <img src={employerProfile.cover_url} alt="" className="h-20 w-full object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {employerProfile?.logo_url ? (
                    <img src={employerProfile.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {employerProfile?.company_name || (effectiveRole === "agent" ? (lang === "my" ? "ပရိုဖိုင် မသတ်မှတ်ရသေးပါ" : "Profile not set yet") : (lang === "my" ? "ကုမ္ပဏီ မသတ်မှတ်ရသေးပါ" : "Company not set yet"))}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[employerProfile?.industry, employerProfile?.company_size && `${employerProfile.company_size} ${lang === "my" ? "ဦး" : "people"}`, employerProfile?.hq_country].filter(Boolean).join(" · ") || (effectiveRole === "agent" ? (lang === "my" ? "အသေးစိတ် ထည့်သွင်းပါ" : "Add profile details") : (lang === "my" ? "အသေးစိတ် ထည့်သွင်းပါ" : "Add company details"))}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(employerProfile?.what_we_do || employerProfile?.company_description) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{lang === "my" ? "ကျွန်ုပ်တို့ဘာလုပ်သလဲ" : "What We Do"}</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/85">{employerProfile?.what_we_do || employerProfile?.company_description}</p>
                  </div>
                )}
                {employerProfile?.mission && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{lang === "my" ? "ရည်မှန်းချက်" : "Mission"}</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/85">{employerProfile.mission}</p>
                  </div>
                )}
                {employerProfile?.vision && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{lang === "my" ? "မျှော်မှန်းချက်" : "Vision"}</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/85">{employerProfile.vision}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
                {employerProfile?.full_address && (
                  <div className="flex items-start gap-1.5 text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} /><span className="whitespace-pre-line">{employerProfile.full_address}</span></div>
                )}
                {employerProfile?.company_website && (
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Globe className="h-3 w-3 shrink-0" strokeWidth={1.5} /><span className="truncate">{employerProfile.company_website.replace(/^https?:\/\//, "")}</span></div>
                )}
              </div>
              {Array.isArray(employerProfile?.benefits) && employerProfile.benefits.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {employerProfile.benefits.map((b: string) => (
                    <span key={b} className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">✓ {b}</span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => navigate(effectiveRole === "agent" ? "/agent/profile" : "/employer/edit-company")}>
                  <Edit3 className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} /> {effectiveRole === "agent" ? (lang === "my" ? "ပြင်ဆင်ရန်" : "Edit Profile") : (lang === "my" ? "ပြင်ဆင်ရန်" : "Edit Company")}
                </Button>
                {employerProfile?.id && (
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => navigate(`/company/${employerProfile.id}`)}>
                    <Eye className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ကြည့်ရှုရန်" : "View Profile"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Profile Boost */}
        {!isSystemRole && (effectiveRole === "job_seeker" || effectiveRole === "mentor") && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <SparklesIcon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် Boost" : "Profile Boost"}</p>
                {activeBoost ? (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {lang === "my" ? "လက်ရှိ အသက်ဝင်နေသည်" : "Active"}{activeBoost.expires_at ? ` · ${lang === "my" ? "သက်တမ်း" : "until"} ${new Date(activeBoost.expires_at).toLocaleDateString()}` : ""}
                  </p>
                ) : pendingBoost ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {lang === "my" ? "Admin အတည်ပြုရန် စောင့်ဆိုင်းနေသည်" : "Awaiting admin approval"}
                  </p>
                ) : recentlyExpiredBoost ? (
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "my"
                      ? `သက်တမ်းကုန်ပြီ · ${new Date(recentlyExpiredBoost.expires_at).toLocaleDateString()} တွင် — ပြန်လည် ဝယ်ယူပါ`
                      : `Expired on ${new Date(recentlyExpiredBoost.expires_at).toLocaleDateString()} — renew to stay on top`}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "my"
                      ? (boostAddon ? `${boostAddon.mmk.toLocaleString()} Ks · ${boostAddon.duration_days ?? 30} ရက် ထိပ်တွင် ပေါ်စေမည်` : "အလုပ်ရှင်များ ရှေ့ဆုံး တွေ့စေရန်")
                      : (boostAddon ? `${boostAddon.mmk.toLocaleString()} Ks · Top of search for ${boostAddon.duration_days ?? 30} days` : "Get seen by employers first")}
                  </p>
                )}
              </div>
              {!activeBoost && !pendingBoost && boostAddon && (
                <Button size="sm" className="rounded-lg" onClick={() => setBoostOpen(true)}>
                  {lang === "my" ? (recentlyExpiredBoost ? "ပြန်လည် Boost" : "Boost ပေးရန်") : (recentlyExpiredBoost ? "Renew" : "Boost")}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Referral Programme */}
        {!isSystemRole && effectiveRole !== "employer" && effectiveRole !== "agent" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "သူငယ်ချင်းကို ဖိတ်ပါ" : "Invite Friends"}</h3>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {lang === "my"
              ? `သူငယ်ချင်း ${refFriends} ဦးကို ဖိတ်ခေါ်နိုင်ပါက ${formatCredits(refCredits, lang)} ရရှိမည်`
              : `Refer ${refFriends} friends = ${formatCredits(refCredits, lang)}`}
          </p>

          {/* How it works */}
          <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "my"
                ? "အောက်ပါ လင့်ခ်ကို သူငယ်ချင်းထံ မျှဝေပါ။ သူတို့ စာရင်းသွင်းသောအခါ ညွှန်းဆိုကုဒ်ကို ထည့်သွင်းပါက သင့် Wallet ထဲသို့ ဆုလာဘ် ရရှိပါမည်။"
                : "Share the link below with friends. When they sign up and enter your referral code during registration, you earn a wallet reward."}
            </p>
          </div>

          {/* Progress bar — repeating every refFriends redemptions */}
          {(() => {
            const progress = referralCount % refFriends;
            const cycle = Math.floor(referralCount / refFriends);
            return (
              <div className="mb-3 rounded-lg bg-card/80 border border-border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {lang === "my" ? "နောက်ဆုလာဘ်အထိ" : "Next reward"}
                  </span>
                  <span className="text-xs font-bold text-primary">{progress}/{refFriends}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(progress / refFriends) * 100}%` }}
                  />
                </div>
                {cycle > 0 && (
                  <p className="mt-1.5 text-[10px] font-semibold text-primary">
                    🎉 {lang === "my"
                      ? `ဆုလာဘ် ${cycle} ကြိမ် ရရှိပြီးပါပြီ`
                      : `${cycle} reward${cycle > 1 ? "s" : ""} earned so far`}
                  </p>
                )}
              </div>
            );
          })()}

          {/* My referral codes (one-time use) */}
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-foreground">
                {lang === "my"
                  ? `သင့်ကုဒ်များ (${unusedCodes.length} မသုံးရသေး၊ ${usedCodesCount} သုံးပြီး)`
                  : `Your codes (${unusedCodes.length} unused · ${usedCodesCount} used)`}
              </p>
              {unusedCodes.length === 0 && (
                <button
                  onClick={generateMoreCodes}
                  className="text-[11px] font-semibold text-primary"
                  type="button"
                >
                  {lang === "my" ? "ထပ်ထုတ်မည်" : "Generate more"}
                </button>
              )}
            </div>
            {(showAllCodes ? unusedCodes : unusedCodes.slice(0, 3)).map((c: any) => (
              <div key={c.code} className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-mono font-semibold text-foreground">
                  {c.code}
                </div>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyCode(c.code)}>
                  {copiedCode === c.code ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </Button>
              </div>
            ))}
            {unusedCodes.length === 0 && myCodes.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                {lang === "my" ? "ထုတ်ပေးနေသည်..." : "Generating…"}
              </p>
            )}
            {unusedCodes.length === 0 && myCodes.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {lang === "my"
                  ? "ကုဒ်အားလုံး အသုံးပြုပြီးပါပြီ။ ထပ်ထုတ်ပါ။"
                  : "All codes used. Generate more above."}
              </p>
            )}
            {unusedCodes.length > 3 && (
              <button
                onClick={() => setShowAllCodes(!showAllCodes)}
                className="text-[11px] font-semibold text-primary"
                type="button"
              >
                {showAllCodes
                  ? (lang === "my" ? "လျှော့ပြ" : "Show less")
                  : (lang === "my" ? `ကျန် ${unusedCodes.length - 3} ခု ပြ` : `Show ${unusedCodes.length - 3} more`)}
              </button>
            )}
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

        {/* CV Documents (Job Seekers) */}
        {effectiveRole === "job_seeker" && cvDocuments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mt-3 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွန်ုပ်၏ CV များ" : "My CVs"}</h3>
            </div>
            <div className="space-y-2">
              {cvDocuments.map((cv: any) => (
                <div key={cv.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{cv.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {cv.file_size_bytes ? `${(cv.file_size_bytes / 1024).toFixed(0)} KB · ` : ""}
                      {cv.created_at ? new Date(cv.created_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => openCv(cv.file_url)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={lang === "my" ? "ကြည့်ရန်" : "View"}
                  >
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => downloadCv(cv.file_url, cv.file_name)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={lang === "my" ? "ဒေါင်းလုဒ်" : "Download"}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 active:bg-muted">
              <item.icon className={`h-5 w-5 ${'highlight' in item && item.highlight ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <p className={`flex-1 text-sm ${'highlight' in item && item.highlight ? "font-semibold text-primary" : "text-foreground"}`}>{item.label}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
        </motion.div>

        <Button variant="ghost" className="mt-4 w-full text-destructive hover:bg-destructive/5" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {lang === "my" ? "ထွက်ရန်" : "Sign Out"}
        </Button>
      </div>
      <SubscribeSheet
        open={boostOpen}
        onOpenChange={setBoostOpen}
        selection={boostAddon ? { kind: "addon", addon: boostAddon, quantity: 1 } : null}
      />
    </div>
  );
};

export default Profile;
