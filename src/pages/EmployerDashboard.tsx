import { motion } from "framer-motion";
import { Briefcase, Users, Plus, CheckCircle, Building2, UserSearch, Settings, CreditCard, AlertCircle, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";
import EmployerOnboardingChecklist from "@/components/employer/EmployerOnboardingChecklist";
import { computeProfileCompletion } from "@/lib/profile-completion";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { data: empProfile } = useEmployerProfile();
  const { data: jobs } = useEmployerJobs();

  // Fetch new applicants (last 7 days) and placements
  const { data: activity } = useQuery({
    queryKey: ["employer-activity", user?.id],
    queryFn: async () => {
      if (!user) return { newApplicants: 0, placedCount: 0 };
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [newRes, placedRes] = await Promise.all([
        supabase.from("applications").select("id, jobs!inner(employer_id)", { count: "exact", head: true })
          .eq("jobs.employer_id", user.id).gte("created_at", sevenDaysAgo).eq("status", "applied"),
        supabase.from("applications").select("id, jobs!inner(employer_id)", { count: "exact", head: true })
          .eq("jobs.employer_id", user.id).eq("status", "placed"),
      ]);
      return { newApplicants: newRes.count || 0, placedCount: placedRes.count || 0 };
    },
    enabled: !!user,
  });

  const listings = jobs || [];
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalApplicants = listings.reduce((a, l) => a + (l.applicant_count || 0), 0);
  const newApplicants = activity?.newApplicants || 0;
  const placedCount = activity?.placedCount || 0;

  const { percent: completionPct } = computeProfileCompletion({
    ...(profile as any),
    display_name: profile?.display_name || empProfile?.contact_name,
    bio: profile?.bio || empProfile?.company_description,
    location: profile?.location || empProfile?.hq_country,
    email: profile?.email || empProfile?.contact_email,
    phone: profile?.phone || empProfile?.contact_phone,
    headline: profile?.headline || empProfile?.industry || empProfile?.company_name,
    experience: profile?.experience || empProfile?.company_size,
  });

  const stats = [
    { icon: Briefcase, value: activeCount, label: { my: "လက်ရှိ ခေါ်စာ", en: "Active Jobs" }, color: "text-primary bg-primary/10", action: () => navigate("/employer/jobs?listingFilter=active") },
    { icon: Users, value: totalApplicants, label: { my: "လျှောက်သူ", en: "Applicants" }, color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications") },
    { icon: AlertCircle, value: newApplicants, label: { my: "အသစ် (၇ ရက်)", en: "New (7d)" }, color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300", action: () => navigate("/employer/applications?filter=applied") },
    { icon: CheckCircle, value: placedCount, label: { my: "ခန့်အပ်ပြီး", en: "Hired" }, color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications?filter=placed") },
  ];

  const quickActions = [
    { icon: Plus, my: "အလုပ်တင်", en: "Post Job", path: "/employer/post-job", bg: "bg-primary/10", fg: "text-primary" },
    { icon: UserSearch, my: "ဝန်ထမ်းရှာ", en: "Find Talent", path: "/employer/search", bg: "bg-emerald/10", fg: "text-emerald" },
    { icon: Briefcase, my: "ခေါ်စာများ", en: "My Jobs", path: "/employer/jobs", bg: "bg-primary/10", fg: "text-primary" },
    { icon: Wallet, my: "ခရက်ဒစ်", en: "Wallet", path: "/wallet", bg: "bg-accent/15", fg: "text-gold-dark" },
    { icon: CreditCard, my: "ဝင်ငွေ", en: "Earnings", path: "/employer/finance", bg: "bg-accent/20", fg: "text-gold-dark" },
    { icon: Settings, my: "ကုမ္ပဏီ", en: "Company", path: "/employer/edit-company", bg: "bg-primary/10", fg: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် ပင်မ" : "Employer Dashboard"} />
      <div className="px-5">
        {/* Company verification status */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/employer/edit-company")}
          className="mb-4 w-full rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors active:bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-foreground">{empProfile?.company_name || (lang === "my" ? "ကုမ္ပဏီ ပရိုဖိုင်" : "Your Company")}</p>
                {!empProfile?.is_verified && <span className="text-[10px] font-bold text-muted-foreground">{completionPct}%</span>}
              </div>
              <p className={`mt-0.5 text-[11px] font-medium ${empProfile?.is_verified ? "text-emerald" : "text-muted-foreground"}`}>
                {empProfile?.is_verified
                  ? `✓ ${lang === "my" ? "အတည်ပြုပြီး" : "Verified"}`
                  : (lang === "my" ? "စစ်ဆေးဆဲ — ပရိုဖိုင် အပြည့်အစုံ ဖြည့်ရန် နှိပ်ပါ" : "Pending verification — tap to complete profile")}
              </p>
              {!empProfile?.is_verified && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
                </div>
              )}
            </div>
          </div>
        </motion.button>

        {/* Onboarding checklist */}
        <EmployerOnboardingChecklist
          hasCompany={!!empProfile?.company_name}
          hasAnyJob={listings.length > 0}
          hasAnyApplication={totalApplicants > 0}
        />

        {/* Needs attention banner */}
        {newApplicants > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/employer/applications?filter=applied")}
            className="mb-4 flex w-full items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-left transition-colors active:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:active:bg-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" strokeWidth={1.75} />
            <div className="flex-1 text-xs text-amber-900 dark:text-amber-100">
              <p className="font-semibold">
                {lang === "my"
                  ? `${newApplicants} ခု လျှောက်သူအသစ် စောင့်နေသည်`
                  : `${newApplicants} new applicant${newApplicants === 1 ? "" : "s"} need review`}
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">{lang === "my" ? "နှိပ်၍ ကြည့်ရှုပါ" : "Tap to review"} →</p>
            </div>
          </motion.button>
        )}

        {/* Stats — clean 2x2 */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={stat.action}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{lang === "my" ? stat.label.my : stat.label.en}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.my : action.en}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
