import { motion } from "framer-motion";
import { Users, Briefcase, Shield, TrendingUp, AlertTriangle, MessageCircle, DollarSign, ChevronRight, Clock, CheckCircle, Crown, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const { data: counts } = useQuery({
    queryKey: ["admin-dashboard-counts"],
    queryFn: async () => {
      const [users, jobs, pendingJobs, pendingPosts, pendingEmployers, reports, premiumUsers, pendingPayments] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("scam_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
        supabase.from("payment_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        totalUsers: users.count || 0,
        activeJobs: jobs.count || 0,
        pendingJobs: pendingJobs.count || 0,
        pendingPosts: pendingPosts.count || 0,
        pendingEmployers: pendingEmployers.count || 0,
        reports: reports.count || 0,
        premiumUsers: premiumUsers.count || 0,
        pendingPayments: (pendingPayments as any).count || 0,
      };
    },
  });

  const stats = [
    { icon: Users, label: { my: "စုစုပေါင်း အသုံးပြုသူ", en: "Total Users" }, value: counts?.totalUsers?.toLocaleString() || "0", color: "text-primary bg-primary/10" },
    { icon: Briefcase, label: { my: "တက်ကြွ အလုပ်ခေါ်စာ", en: "Active Listings" }, value: counts?.activeJobs?.toString() || "0", color: "text-emerald bg-emerald/10" },
    { icon: Crown, label: { my: "Premium အသုံးပြုသူ", en: "Premium Users" }, value: counts?.premiumUsers?.toString() || "0", color: "text-accent bg-accent/10" },
  ];

  const pendingItems = [
    { icon: Briefcase, label: { my: "စစ်ဆေးရန် အလုပ်ခေါ်စာ", en: "Pending Job Listings" }, count: counts?.pendingJobs || 0, path: "/admin/jobs", urgent: (counts?.pendingJobs || 0) > 0 },
    { icon: MessageCircle, label: { my: "စစ်ဆေးရန် ပို့စ်", en: "Pending Community Posts" }, count: counts?.pendingPosts || 0, path: "/moderator", urgent: false },
    { icon: Shield, label: { my: "အလုပ်ရှင် အတည်ပြုရန်", en: "Employer Verifications" }, count: counts?.pendingEmployers || 0, path: "/admin/employers", urgent: (counts?.pendingEmployers || 0) > 0 },
    { icon: AlertTriangle, label: { my: "Scam တိုင်ကြားချက်", en: "Scam Reports" }, count: counts?.reports || 0, path: "/admin/users", urgent: (counts?.reports || 0) > 0 },
    { icon: CreditCard, label: { my: "စစ်ဆေးရန် ငွေပေးချေမှု", en: "Pending Payments" }, count: counts?.pendingPayments || 0, path: "/admin/payments", urgent: (counts?.pendingPayments || 0) > 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Admin Dashboard" />
      <div className="px-5">
        <div className="mb-5 grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3.5">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" strokeWidth={1.5} /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.div>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "လုပ်ဆောင်ရန်" : "Pending Actions"}</h2>
        <div className="space-y-2">
          {pendingItems.map((item, i) => (
            <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} onClick={() => navigate(item.path)} className={`flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left active:bg-muted/30 ${item.urgent ? "border-destructive/30" : "border-border"}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><item.icon className="h-5 w-5" strokeWidth={1.5} /></div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">{lang === "my" ? item.label.my : item.label.en}</h3>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.urgent ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary"}`}>{item.count}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </motion.button>
          ))}
        </div>

        <h2 className="mb-3 mt-6 text-sm font-bold text-foreground">{lang === "my" ? "စီမံခန့်ခွဲမှု" : "Management"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: { my: "အသုံးပြုသူ", en: "Users" }, path: "/admin/users", icon: Users },
            { label: { my: "ခွဲခြမ်းစိတ်ဖြာ", en: "Analytics" }, path: "/admin/analytics", icon: TrendingUp },
          ].map((item, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} onClick={() => navigate(item.path)} className="flex flex-col items-center rounded-xl border border-border bg-card p-4 active:bg-muted/30">
              <item.icon className="mb-2 h-6 w-6 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-medium text-foreground">{lang === "my" ? item.label.my : item.label.en}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
