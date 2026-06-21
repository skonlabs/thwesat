import { motion } from "framer-motion";
import { Users, Briefcase, Shield, AlertTriangle, MessageCircle, WalletCards, ChevronRight, CreditCard, Building2, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import DashboardHero from "@/components/DashboardHero";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const { data: counts } = useQuery({
    queryKey: ["admin-dashboard-counts"],
    queryFn: async () => {
      const [users, jobs, pendingJobs, pendingPosts, pendingEmployers, reports, pendingPayments, pendingSubs, pendingTopups, totalEmployers, mentors] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("scam_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payment_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("subscription_payment_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("topup_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("primary_role", "employer"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("primary_role", "mentor"),
      ]);
      return {
        totalUsers: users.count || 0,
        activeJobs: jobs.count || 0,
        pendingJobs: pendingJobs.count || 0,
        pendingPosts: pendingPosts.count || 0,
        pendingEmployers: pendingEmployers.count || 0,
        reports: reports.count || 0,
        pendingPayments: ((pendingPayments as any).count || 0) + ((pendingTopups as any).count || 0),
        pendingSubs: (pendingSubs as any).count || 0,
        totalEmployers: totalEmployers.count || 0,
        totalMentors: mentors.count || 0,
      };
    },
  });

  const totalPending = (counts?.pendingJobs || 0) + (counts?.pendingPosts || 0) + (counts?.pendingEmployers || 0) + (counts?.pendingPayments || 0) + (counts?.pendingSubs || 0) + (counts?.reports || 0);

  const stats = [
    { icon: Users, label: { my: "အသုံးပြုသူ", en: "Users" }, value: counts?.totalUsers?.toLocaleString() || "0", color: "text-primary bg-primary/10", path: "/admin/users" },
    { icon: Briefcase, label: { my: "အလုပ်ခေါ်စာများ", en: "Job Postings" }, value: counts?.activeJobs?.toString() || "0", color: "text-emerald bg-emerald/10", path: "/admin/jobs?status=active" },
    { icon: Building2, label: { my: "အလုပ်ရှင်", en: "Employers" }, value: counts?.totalEmployers?.toString() || "0", color: "text-primary bg-primary/10", path: "/admin/users?role=employer" },
    { icon: Shield, label: { my: "လမ်းညွှန်", en: "Mentors" }, value: counts?.totalMentors?.toString() || "0", color: "text-emerald bg-emerald/10", path: "/admin/users?role=mentor" },
  ];

  const pendingItems = [
    { icon: WalletCards, label: { my: "Package တောင်းခံမှု", en: "Pending Subscriptions" }, count: counts?.pendingSubs || 0, path: "/admin/wallet", urgent: (counts?.pendingSubs || 0) > 0 },
    
    { icon: CreditCard, label: { my: "ငွေပေးချေမှု အတည်ပြုရန်", en: "Payment Approvals" }, count: counts?.pendingPayments || 0, path: "/admin/wallet?tab=topups", urgent: (counts?.pendingPayments || 0) > 0 },
    { icon: Briefcase, label: { my: "အလုပ်ခေါ်စာ အတည်ပြုရန်", en: "Job Listing Approvals" }, count: counts?.pendingJobs || 0, path: "/admin/jobs?status=pending", urgent: (counts?.pendingJobs || 0) > 0 },
    { icon: Shield, label: { my: "အလုပ်ရှင် အတည်ပြုရန်", en: "Employer Verifications" }, count: counts?.pendingEmployers || 0, path: "/admin/employers?status=pending", urgent: (counts?.pendingEmployers || 0) > 0 },
    { icon: MessageCircle, label: { my: "Community ပို့စ် အတည်ပြုရန်", en: "Community Post Approvals" }, count: counts?.pendingPosts || 0, path: "/admin/moderation?tab=posts", urgent: false },
    { icon: AlertTriangle, label: { my: "Scam တိုင်ကြားချက်", en: "Scam Reports" }, count: counts?.reports || 0, path: "/admin/moderation?tab=posts", urgent: (counts?.reports || 0) > 0 },
  ];

  const managementLinks = [
    { label: { my: "အသုံးပြုသူများ", en: "Users" }, path: "/admin/users", icon: Users, desc: { my: "စီမံခန့်ခွဲ", en: "Manage" } },
    { label: { my: "အလုပ်ရှင်များ", en: "Employers" }, path: "/admin/employers", icon: Building2, desc: { my: "စစ်ဆေး", en: "Verify" } },
    { label: { my: "ငွေပေးချေမှု", en: "Payments" }, path: "/admin/payments", icon: CreditCard, desc: { my: "စစ်ဆေး", en: "Review" } },
    { label: { my: "ငွေကြေး", en: "Finances" }, path: "/admin/finance", icon: WalletCards, desc: { my: "ဝင်ငွေ/Payouts", en: "Revenue & Payouts" } },
    { label: { my: "Partner Finance", en: "Partner Finance" }, path: "/admin/partner-finance", icon: WalletCards, desc: { my: "Rev share", en: "Rev share" } },
    { label: { my: "Partner အကောင့်", en: "Partner Accounts" }, path: "/admin/partners", icon: Users, desc: { my: "User ချိတ်", en: "Link users" } },
    { label: { my: "အလုပ်များ", en: "Jobs" }, path: "/admin/jobs", icon: Briefcase, desc: { my: "စီမံခန့်ခွဲ", en: "Manage" } },
    { label: { my: "စစ်ဆေးရေး", en: "Moderation" }, path: "/admin/moderation", icon: Shield, desc: { my: "ပို့စ်/Report", en: "Posts & Reports" } },
    { label: { my: "ခွဲခြမ်းစိတ်ဖြာ", en: "Analytics" }, path: "/admin/analytics", icon: BarChart3, desc: { my: "ကြည့်ရှု", en: "View" } },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-5 md:px-8 md:pt-2">
        <DashboardHero
          roleLabelEn="Administrator"
          roleLabelMy="စီမံအုပ်ချုပ်သူ"
          subtitleEn={`${totalPending} item${totalPending === 1 ? "" : "s"} need your attention`}
          subtitleMy={`${totalPending} ခု လုပ်ဆောင်ရန် စောင့်နေသည်`}
          ctaLabelEn={totalPending > 0 ? "Review payments" : "View analytics"}
          ctaLabelMy={totalPending > 0 ? "ငွေပေးချေမှု စစ်ဆေးရန်" : "ခွဲခြမ်းစိတ်ဖြာမှု"}
          ctaPath={totalPending > 0 ? "/admin/payments" : "/admin/analytics"}
        />
        {/* Overview Stats */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(stat.path)} className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30">
              <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-3.5 w-3.5" strokeWidth={1.5} /></div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
          ))}
        </div>

        {/* Pending Actions */}
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "လုပ်ဆောင်ရန်" : "Pending Actions"}</h2>
          {totalPending > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">{totalPending}</span>
          )}
        </div>
        <div className="mb-5 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {pendingItems.map((item, i) => {
            const showUrgent = item.urgent && item.count > 0;
            return (
              <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} onClick={() => navigate(item.path)} className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3.5 text-left active:bg-muted/30`}>
                {showUrgent && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-destructive" aria-hidden />}
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${showUrgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}><item.icon className="h-4 w-4" strokeWidth={1.5} /></div>
                <p className="flex-1 text-sm font-medium text-foreground">{lang === "my" ? item.label.my : item.label.en}</p>
                <span className={`min-w-[28px] rounded-full px-2 py-0.5 text-center text-xs font-bold ${showUrgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>{item.count}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </motion.button>
            );
          })}
        </div>

        {/* Management Grid */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "စီမံခန့်ခွဲမှု" : "Management"}</h2>
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 lg:grid-cols-8">
          {managementLinks.map((item, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.04 }} onClick={() => navigate(item.path)} className="flex flex-col items-center rounded-xl border border-border bg-card p-2.5 transition-colors active:bg-muted/30">
              <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">{lang === "my" ? item.label.my : item.label.en}</span>
              <span className="text-[9px] text-muted-foreground leading-tight mt-0.5">{lang === "my" ? item.desc.my : item.desc.en}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
