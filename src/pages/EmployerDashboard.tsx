import { motion } from "framer-motion";
import { Briefcase, Users, Plus, CheckCircle, Building2, UserSearch, Settings, Crown, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";
import EmployerOnboardingChecklist from "@/components/employer/EmployerOnboardingChecklist";
import { employerLabels as L } from "@/lib/employer-labels";

const quickActions = [
  { icon: Plus, label: "အလုပ်တင်", labelEn: "Post Job", path: "/employer/post-job", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Briefcase, label: "အလုပ်ခေါ်စာများ", labelEn: "Job Listings", path: "/employer/jobs", bg: "bg-primary/10", fg: "text-primary" },
  { icon: UserSearch, label: "ဝန်ထမ်းရှာ", labelEn: "Find Talent", path: "/employer/search", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: CreditCard, label: "ငွေကြေး", labelEn: "Finance", path: "/employer/finance", bg: "bg-accent/20", fg: "text-gold-dark" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Settings, label: "ကုမ္ပဏီ", labelEn: "Company", path: "/employer/edit-company", bg: "bg-accent/10", fg: "text-accent" },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data: empProfile } = useEmployerProfile();
  const { data: jobs } = useEmployerJobs();

  // Fetch employer subscription
  const { data: subscription } = useQuery({
    queryKey: ["employer-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch placement summary (count + total fees) across employer's jobs
  const { data: placementSummary } = useQuery({
    queryKey: ["employer-placements", user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, totalFee: 0 };
      const { data, error } = await supabase
        .from("applications")
        .select("placement_fee, jobs!inner(employer_id)")
        .eq("status", "placed")
        .eq("jobs.employer_id", user.id);
      if (error) return { count: 0, totalFee: 0 };
      const rows = (data || []) as any[];
      const totalFee = rows.reduce((sum, r) => sum + (Number(r.placement_fee) || 0), 0);
      return { count: rows.length, totalFee };
    },
    enabled: !!user,
  });

  const listings = jobs || [];
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalApplicants = listings.reduce((a, l) => a + (l.applicant_count || 0), 0);
  const placedCount = placementSummary?.count || 0;
  const placedFees = placementSummary?.totalFee || 0;

  const planLabel = subscription?.plan_type?.toLowerCase().includes("pro") ? "Pro" : subscription?.plan_type ? "Basic" : null;
  const planExpiry = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် ဒက်ရှ်ဘုတ်" : "Employer Dashboard"} />
      <div className="px-5">
        {/* Company info + subscription */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">{empProfile?.company_name || (lang === "my" ? "ကုမ္ပဏီအမည်" : "Company")}</p>
              <p className={`text-[11px] font-medium ${empProfile?.is_verified ? "text-emerald" : "text-muted-foreground"}`}>
                {empProfile?.is_verified ? `✓ ${lang === "my" ? "အတည်ပြုပြီး" : "Verified"}` : (lang === "my" ? "စစ်ဆေးဆဲ" : "Pending Verification")}
              </p>
            </div>
            {/* Subscription badge */}
            <button onClick={() => navigate("/employer/subscription")} className="flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1">
              {planLabel ? (
                <>
                  <Crown className="h-3 w-3 text-gold-dark" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-gold-dark">{planLabel}</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-muted-foreground">{lang === "my" ? "အဆင့်မြှင့်" : "Upgrade"}</span>
                </>
              )}
            </button>
          </div>
          {planLabel && planExpiry && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              {lang === "my" ? `${planLabel} အစီအစဉ် · ${planExpiry} ထိ` : `${planLabel} Plan · Expires ${planExpiry}`}
            </p>
          )}
        </motion.div>

        {/* Onboarding checklist (dismissible, hides when complete) */}
        <EmployerOnboardingChecklist
          hasCompany={!!empProfile?.company_name}
          hasAnyJob={listings.length > 0}
          hasAnyApplication={totalApplicants > 0}
        />

        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: { my: "လက်ခံနေသော အလုပ်ခေါ်စာ", en: "Active Listings" }, value: activeCount.toString(), color: "text-primary bg-primary/10", action: () => navigate("/employer/jobs?listingFilter=active") },
            { icon: Users, label: L.applications, value: totalApplicants.toString(), color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications") },
            { icon: CheckCircle, label: L.placements, value: placedCount.toString(), color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications?filter=placed") },
            { icon: CreditCard, label: { my: "ခန့်အပ်ခ စုစုပေါင်း", en: "Placement Fees" }, value: `$${placedFees.toLocaleString()}`, color: "text-gold-dark bg-accent/20", action: () => navigate("/employer/applications?filter=placed") },
          ].map((stat, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={stat.action} className="rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted/30">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" strokeWidth={1.5} /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}><action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} /></div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default EmployerDashboard;