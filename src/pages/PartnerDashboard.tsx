import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Shield,
  MessageCircle,
  ChevronRight,
  CreditCard,
  Building2,
  BarChart3,
  CheckCircle2,
  Eye,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardHero from "@/components/DashboardHero";

/**
 * Partner Dashboard — read + approve focused. No destructive actions.
 * Distinct from AdminDashboard: emphasises review queues, throughput,
 * and view-only management surfaces.
 */
const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const my = lang === "my";

  const { data: counts } = useQuery({
    queryKey: ["partner-dashboard-counts"],
    staleTime: 30_000,
    queryFn: async () => {
      const [
        pendingJobs,
        pendingPosts,
        pendingEmployers,
        pendingSubs,
        pendingTopups,
        approvedJobsToday,
        totalUsers,
        activeJobs,
        employers,
        mentors,
        seekers,
        agents,
      ] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("subscription_payment_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("topup_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        (supabase as any).from("v_profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "employer"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "mentor"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "job_seeker"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "agent"),
      ]);
      const totalPaymentApprovals =
        ((pendingSubs as any).count || 0) +
        ((pendingTopups as any).count || 0);
      return {
        pendingJobs: pendingJobs.count || 0,
        pendingPosts: pendingPosts.count || 0,
        pendingEmployers: pendingEmployers.count || 0,
        pendingPayments: totalPaymentApprovals,
        pendingSubs: (pendingSubs as any).count || 0,
        approvedJobsToday: approvedJobsToday.count || 0,
        totalUsers: totalUsers.count || 0,
        activeJobs: activeJobs.count || 0,
        employers: employers.count || 0,
        mentors: mentors.count || 0,
        seekers: seekers.count || 0,
        agents: agents.count || 0,
      };
    },
  });

  const totalQueue =
    (counts?.pendingJobs || 0) +
    (counts?.pendingPosts || 0) +
    (counts?.pendingEmployers || 0) +
    (counts?.pendingPayments || 0);
  const firstReviewPath =
    (counts?.pendingPayments || 0) > 0 ? "/partner/wallet" :
    (counts?.pendingJobs || 0) > 0 ? "/partner/jobs?status=pending" :
    (counts?.pendingEmployers || 0) > 0 ? "/partner/employers?status=pending" :
    (counts?.pendingPosts || 0) > 0 ? "/partner/posts?tab=posts" :
    "/partner/analytics";

  // Review queues — partner's primary work surface
  const reviewQueues = [
    {
      icon: Briefcase,
      label: { en: "Job Listing Approvals", my: "အလုပ်ခေါ်စာ အတည်ပြုရန်" },
      count: counts?.pendingJobs || 0,
      path: "/partner/jobs?status=pending",
      tone: "primary" as const,
    },
    {
      icon: CreditCard,
      label: { en: "Payment Approvals", my: "ငွေပေးချေမှု အတည်ပြုရန်" },
      count: counts?.pendingPayments || 0,
      path: "/partner/wallet",
      tone: "amber" as const,
    },
    {
      icon: Building2,
      label: { en: "Employers/Recruiters Approvals", my: "အလုပ်ရှင်/ခေါ်ယူရေး အတည်ပြုရန်" },
      count: counts?.pendingEmployers || 0,
      path: "/partner/employers?status=pending",
      tone: "primary" as const,
    },
    {
      icon: MessageCircle,
      label: { en: "Community Post Approvals", my: "Community ပို့စ် အတည်ပြုရန်" },
      count: counts?.pendingPosts || 0,
      path: "/partner/posts?tab=posts",
      tone: "muted" as const,
    },
  ];

  // View-only people directory — distinct cards per audience
  const peopleLinks = [
    { label: { en: "Job Seekers", my: "အလုပ်ရှာသူများ" }, count: counts?.seekers || 0, path: "/partner/users?role=job_seeker", icon: Users },
    { label: { en: "Employers", my: "အလုပ်ရှင်များ" }, count: counts?.employers || 0, path: "/partner/users?role=employer", icon: Building2 },
    { label: { en: "Mentors", my: "လမ်းညွှန်များ" }, count: counts?.mentors || 0, path: "/partner/users?role=mentor", icon: Shield },
    { label: { en: "Agents", my: "အေဂျင့်များ" }, count: counts?.agents || 0, path: "/partner/users?role=agent", icon: Users },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-5 md:px-8 md:pt-2">
        <DashboardHero
          roleLabelEn="Partner"
          roleLabelMy="Partner"
          subtitleEn={
            totalQueue > 0
              ? `${totalQueue} item${totalQueue === 1 ? "" : "s"} awaiting your review`
              : "All caught up — no pending reviews"
          }
          subtitleMy={
            totalQueue > 0
              ? `${totalQueue} ခု စစ်ဆေးရန် စောင့်နေသည်`
              : "အားလုံး ပြီးစီးပါပြီ"
          }
          ctaLabelEn={totalQueue > 0 ? "Start reviewing" : "View analytics"}
          ctaLabelMy={totalQueue > 0 ? "စတင် စစ်ဆေး" : "ခွဲခြမ်းစိတ်ဖြာမှု"}
          ctaPath={firstReviewPath}
        />

        {/* Today snapshot — partner-specific KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <SnapshotCard
            icon={CheckCircle2}
            value={counts?.approvedJobsToday ?? 0}
            label={my ? "ယနေ့ အတည်ပြုပြီး" : "Approved today"}
            tone="emerald"
            onClick={() => navigate("/partner/jobs?status=active&since=24h")}
          />
          <SnapshotCard
            icon={Briefcase}
            value={counts?.activeJobs ?? 0}
            label={my ? "တက်ကြွ အလုပ်" : "Active jobs"}
            tone="primary"
            onClick={() => navigate("/partner/jobs?status=active")}
          />
          <SnapshotCard
            icon={Users}
            value={counts?.totalUsers ?? 0}
            label={my ? "အသုံးပြုသူ စုစုပေါင်း" : "Total users"}
            tone="muted"
            onClick={() => navigate("/partner/users")}
          />
          <SnapshotCard
            icon={Eye}
            value={my ? "ကြည့်ရှုသာ" : "View only"}
            label={my ? "Partner အခွင့်အရေး" : "Your access"}
            tone="amber"
            isText
          />
        </div>

        {/* Review queues — focal point of the partner role */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{my ? "စစ်ဆေးရန် တန်းစီ" : "Review Queues"}</h2>
          <button
            onClick={() => navigate("/partner/analytics")}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            {my ? "ခွဲခြမ်းစိတ်ဖြာ" : "Analytics"} →
          </button>
        </div>
        <div className="mb-6 grid gap-2.5 md:grid-cols-2">
          {reviewQueues.map((q, i) => {
            const isUrgent = q.count > 0;
            const accent =
              q.tone === "amber"
                ? "bg-accent/15 text-accent"
                : q.tone === "muted"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary";
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(q.path)}
                className="group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm active:bg-muted/30"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
                  <q.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{my ? q.label.my : q.label.en}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isUrgent
                      ? my
                        ? `${q.count} ခု စောင့်နေသည်`
                        : `${q.count} awaiting review`
                      : my
                      ? "ပြီးစီးပါပြီ"
                      : "All clear"}
                  </p>
                </div>
                <span
                  className={`min-w-[2rem] rounded-full px-2.5 py-0.5 text-center text-xs font-bold ${
                    isUrgent ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {q.count}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
              </motion.button>
            );
          })}
        </div>

        {/* People directory — view-only browsing */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{my ? "လူများ" : "People"}</h2>
        <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {peopleLinks.map((p, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              onClick={() => navigate(p.path)}
              className="flex flex-col items-start rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 active:bg-muted/30"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-foreground">{p.count.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">{my ? p.label.my : p.label.en}</p>
            </motion.button>
          ))}
        </div>

        {/* Quick actions — partner shortcuts (no destructive surfaces) */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{my ? "မြန်ဆန် လုပ်ဆောင်ချက်" : "Quick Access"}</h2>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <QuickLink icon={BarChart3} label={my ? "ခွဲခြမ်းစိတ်ဖြာ" : "Analytics"} onClick={() => navigate("/partner/analytics")} />
          <QuickLink icon={Briefcase} label={my ? "အလုပ်များ" : "All Jobs"} onClick={() => navigate("/partner/jobs")} />
          <QuickLink icon={Users} label={my ? "အသုံးပြုသူများ" : "All Users"} onClick={() => navigate("/partner/users")} />
          <QuickLink icon={CreditCard} label={my ? "ငွေကြေး" : "Finance"} onClick={() => navigate("/partner/finance")} />
          <QuickLink icon={Tag} label={my ? "ညွှန်းဆိုကုဒ်" : "Referral Codes"} onClick={() => navigate("/partner/finance?tab=referrals")} />

        </div>
      </div>
    </div>
  );
};

const SnapshotCard = ({
  icon: Icon,
  value,
  label,
  tone,
  isText = false,
  onClick,
}: {
  icon: any;
  value: number | string;
  label: string;
  tone: "emerald" | "primary" | "muted" | "amber";
  isText?: boolean;
  onClick?: () => void;
}) => {
  const accent =
    tone === "emerald"
      ? "bg-emerald/10 text-emerald"
      : tone === "amber"
      ? "bg-accent/15 text-accent"
      : tone === "muted"
      ? "bg-muted text-muted-foreground"
      : "bg-primary/10 text-primary";
  const Wrap: any = onClick ? "button" : "div";
  return (
    <Wrap
      {...(onClick ? { onClick, type: "button" } : {})}
      className={`rounded-xl border border-border bg-card p-3 text-left ${onClick ? "transition-colors hover:border-primary/40 active:bg-muted/30" : ""}`}
    >
      <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </div>
      <p className={`font-bold text-foreground ${isText ? "text-xs" : "text-lg"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Wrap>
  );
};

const QuickLink = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 active:bg-muted/30"
  >
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </div>
    <span className="text-xs font-medium text-foreground">{label}</span>
  </button>
);

export default PartnerDashboard;
