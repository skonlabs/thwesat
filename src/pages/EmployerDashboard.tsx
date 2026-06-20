import { motion } from "framer-motion";
import { Users, UserSearch, CheckCircle, CreditCard, Briefcase, Building2, Plus, Wallet, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";
import DashboardHero from "@/components/DashboardHero";
import { formatMoney } from "@/lib/finance";
import { computeProfileCompletion } from "@/lib/profile-completion";

/**
 * Employer Dashboard — mirrors Agent Dashboard layout (pipeline-first).
 * Wording adapted: Candidates → Applicants, Placements → Hires, Commissions → Earnings.
 */
const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { data: empProfile } = useEmployerProfile();

  // Pipeline: applications across the employer's posted jobs
  const { data: pipeline } = useQuery({
    queryKey: ["employer-pipeline", user?.id],
    queryFn: async () => {
      if (!user) return { active: 0, interview: 0, hired: 0, totalFee: 0, recentHires: [] as any[] };
      const { data: rows } = await supabase
        .from("applications")
        .select("status, placement_fee, placement_salary, updated_at, jobs!inner(id, title, company, employer_id)")
        .eq("jobs.employer_id", user.id);
      const list = (rows || []) as any[];
      const active = list.filter((r) => ["applied", "shortlisted", "reviewing"].includes(r.status)).length;
      const interview = list.filter((r) => r.status === "interview").length;
      const hiredRows = list.filter((r) => r.status === "placed");
      const hired = hiredRows.length;
      const totalFee = hiredRows.reduce((s, r) => s + (Number(r.placement_fee) || 0), 0);
      const recentHires = hiredRows
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3);
      return { active, interview, hired, totalFee, recentHires };
    },
    enabled: !!user,
  });

  const stats = pipeline ?? { active: 0, interview: 0, hired: 0, totalFee: 0, recentHires: [] };

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

  const quickActions = [
    { icon: UserSearch, my: "ဝန်ထမ်းရှာ", en: "Find Talent", path: "/employer/search", bg: "bg-primary/10", fg: "text-primary" },
    { icon: Briefcase, my: "ခေါ်စာများ", en: "My Jobs", path: "/employer/jobs", bg: "bg-primary/10", fg: "text-primary" },
    { icon: Plus, my: "အလုပ်တင်", en: "Post Job", path: "/employer/post-job", bg: "bg-emerald/10", fg: "text-emerald" },
    { icon: Users, my: "လျှောက်သူများ", en: "Applicants", path: "/employer/applications", bg: "bg-primary/10", fg: "text-primary" },
    { icon: CreditCard, my: "Package", en: "Subscriptions", path: "/pricing", bg: "bg-accent/20", fg: "text-gold-dark" },
    { icon: CreditCard, my: "ဝင်ငွေ", en: "Earnings", path: "/employer/finance", bg: "bg-emerald/10", fg: "text-emerald" },
    { icon: Settings, my: "ကုမ္ပဏီ", en: "Company", path: "/employer/edit-company", bg: "bg-accent/10", fg: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် ပင်မ" : "Employer Dashboard"} />

      <div className="mx-auto max-w-6xl px-5 md:px-8 md:pt-2">
        <DashboardHero
          roleLabelEn="Employer"
          roleLabelMy="အလုပ်ရှင်"
          subtitleEn={`${stats.active} active applicants · ${stats.hired} hired`}
          subtitleMy={`လက်ရှိ ${stats.active} ဦး · ခန့်အပ်ပြီး ${stats.hired} ဦး`}
          ctaLabelEn="Post a new job"
          ctaLabelMy="အလုပ် တင်ရန်"
          ctaPath="/employer/post-job"
        />
        {/* Company verification (only if not verified) */}
        {!empProfile?.is_verified && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/employer/edit-company")}
            className="mb-4 w-full rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">
                    {lang === "my" ? "ကုမ္ပဏီ ပရိုဖိုင်" : "Company Profile"}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground">{completionPct}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </div>
          </motion.button>
        )}

        {/* Pipeline */}
        <h2 className="mb-2 text-sm font-bold text-foreground">{lang === "my" ? "Pipeline" : "Pipeline"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-6">
          {[
            { icon: Users, label: { my: "လက်ရှိ", en: "Active" }, value: stats.active, color: "text-primary bg-primary/10", action: () => navigate("/employer/applications") },
            { icon: Briefcase, label: { my: "အင်တာဗျူး", en: "Interview" }, value: stats.interview, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", action: () => navigate("/employer/applications?filter=interview") },
            { icon: CheckCircle, label: { my: "ခန့်အပ်ပြီး", en: "Hired" }, value: stats.hired, color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications?filter=placed") },
          ].map((stat, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={stat.action}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
            >
              <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-7">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.path + a.en}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.bg}`}>
                <a.icon className={`h-5 w-5 ${a.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? a.my : a.en}</span>
            </motion.button>
          ))}
        </div>

        {/* Recent hires */}
        {stats.recentHires.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "လတ်တလော ခန့်အပ်မှုများ" : "Recent Hires"}</h2>
              <button onClick={() => navigate("/employer/applications?filter=placed")} className="text-[11px] font-semibold text-primary hover:underline">
                {lang === "my" ? "အားလုံး" : "View all"} →
              </button>
            </div>
            <div className="mb-5 grid gap-2 md:grid-cols-3">
              {stats.recentHires.map((p: any, i: number) => (
                <button
                  key={i}
                  onClick={() => navigate("/employer/applications?filter=placed")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{p.jobs?.title || "—"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{p.jobs?.company || "—"}</p>
                  </div>
                  {Number(p.placement_fee) > 0 && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald">{formatMoney(Number(p.placement_fee) || 0, "MMK", lang)}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ခန့်အပ်ခ" : "fee"}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Finance shortcut */}
        <button
          onClick={() => navigate("/employer/finance")}
          className="mb-5 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
              <CreditCard className="h-4 w-4 text-gold-dark" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{lang === "my" ? "ငွေကြေး မှတ်တမ်း" : "Finance Ledger"}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပေးချေမှု မှတ်တမ်းများ ကြည့်ရန်" : "View earnings & payouts"}</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </button>
      </div>
    </div>
  );
};

export default EmployerDashboard;
