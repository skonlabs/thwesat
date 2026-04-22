import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

type RangeKey = "7d" | "30d" | "90d";

const RANGES: { key: RangeKey; days: number; labelEn: string; labelMy: string }[] = [
  { key: "7d", days: 7, labelEn: "7d", labelMy: "၇ ရက်" },
  { key: "30d", days: 30, labelEn: "30d", labelMy: "၃၀ ရက်" },
  { key: "90d", days: 90, labelEn: "90d", labelMy: "၉၀ ရက်" },
];

const formatDayKey = (d: Date) => d.toISOString().slice(0, 10);
const shortLabel = (key: string) => {
  const d = new Date(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const buildSeries = (rows: { created_at: string | null }[] | null | undefined, days: number) => {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(formatDayKey(d), 0);
  }
  (rows || []).forEach((r) => {
    if (!r.created_at) return;
    const key = formatDayKey(new Date(r.created_at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets, ([date, value]) => ({ date, label: shortLabel(date), value }));
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [range, setRange] = useState<RangeKey>("30d");

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;
  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [days]);

  const { data: metrics } = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: async () => {
      const [users, premiumUsers, employers, verifiedEmployers, jobs, activeJobs, pendingJobs, posts, approvedPosts, mentors, bookings, applications, payments, approvedPayments, reports, guides] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("mentor_profiles").select("id", { count: "exact", head: true }).not("title", "is", null).neq("title", ""),
        supabase.from("mentor_bookings").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("scam_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("guides").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalUsers: users.count || 0,
        premiumUsers: premiumUsers.count || 0,
        totalEmployers: employers.count || 0,
        verifiedEmployers: verifiedEmployers.count || 0,
        totalJobs: jobs.count || 0,
        activeJobs: activeJobs.count || 0,
        pendingJobs: pendingJobs.count || 0,
        totalPosts: posts.count || 0,
        approvedPosts: approvedPosts.count || 0,
        totalMentors: mentors.count || 0,
        totalBookings: bookings.count || 0,
        totalApplications: applications.count || 0,
        totalPayments: payments.count || 0,
        approvedPayments: approvedPayments.count || 0,
        pendingReports: reports.count || 0,
        totalGuides: guides.count || 0,
      };
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin-analytics-trends", range],
    queryFn: async () => {
      const [signups, newJobs, newApplications, paymentsRange, bookingsRange, paymentMix] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }),
        supabase.from("jobs").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }),
        supabase.from("applications").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }),
        supabase.from("payment_requests").select("created_at,status,amount,currency").gte("created_at", sinceIso).order("created_at", { ascending: true }),
        supabase.from("mentor_bookings").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }),
        supabase.from("payment_requests").select("status").gte("created_at", sinceIso),
      ]);
      const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, revoked: 0 };
      (paymentMix.data || []).forEach((p) => {
        const s = (p.status || "pending") as string;
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const approvedSum = (paymentsRange.data || [])
        .filter((p) => p.status === "approved")
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      return {
        signups: buildSeries(signups.data, days),
        jobs: buildSeries(newJobs.data, days),
        applications: buildSeries(newApplications.data, days),
        payments: buildSeries(paymentsRange.data, days),
        bookings: buildSeries(bookingsRange.data, days),
        statusCounts,
        approvedSum,
      };
    },
  });

  const sections = [
    {
      title: { my: "အဖွဲ့ဝင်များ", en: "Members" },
      items: [
        { label: { my: "စုစုပေါင်း", en: "Total Users" }, value: metrics?.totalUsers?.toLocaleString() || "0", path: "/admin/users" },
        { label: { my: "Premium", en: "Premium" }, value: metrics?.premiumUsers?.toString() || "0", path: "/admin/users" },
        { label: { my: "အလုပ်ရှင်", en: "Employers" }, value: metrics?.totalEmployers?.toString() || "0", path: "/admin/employers" },
        { label: { my: "Mentors", en: "Mentors" }, value: metrics?.totalMentors?.toString() || "0", path: "/mentors" },
      ],
    },
    {
      title: { my: "အလုပ် & လျှောက်လွှာ", en: "Jobs & Applications" },
      items: [
        { label: { my: "စုစုပေါင်း", en: "Total Jobs" }, value: metrics?.totalJobs?.toString() || "0", path: "/admin/jobs" },
        { label: { my: "တက်ကြွ", en: "Active" }, value: metrics?.activeJobs?.toString() || "0", path: "/admin/jobs?status=active" },
        { label: { my: "စစ်ဆေးရန်", en: "Pending" }, value: metrics?.pendingJobs?.toString() || "0", path: "/admin/jobs?status=pending" },
        { label: { my: "လျှောက်လွှာ", en: "Applications" }, value: metrics?.totalApplications?.toString() || "0", path: "/admin/jobs" },
      ],
    },
    {
      title: { my: "ငွေကြေး & အသိုင်း", en: "Finance & Community" },
      items: [
        { label: { my: "ငွေပေးချေမှု", en: "Payments" }, value: metrics?.totalPayments?.toString() || "0", path: "/admin/payments" },
        { label: { my: "အတည်ပြုပြီး", en: "Approved" }, value: metrics?.approvedPayments?.toString() || "0", path: "/admin/payments" },
        { label: { my: "ပို့စ်များ", en: "Posts" }, value: metrics?.approvedPosts?.toString() || "0", path: "/community" },
        { label: { my: "တိုင်ကြားချက်", en: "Reports" }, value: metrics?.pendingReports?.toString() || "0", path: "/moderator" },
      ],
    },
  ];

  const chartCards = [
    { key: "signups", titleEn: "New Signups", titleMy: "အသစ် မှတ်ပုံတင်", color: "hsl(var(--primary))", data: trends?.signups || [] },
    { key: "jobs", titleEn: "New Jobs", titleMy: "အလုပ်အသစ်", color: "hsl(var(--accent))", data: trends?.jobs || [] },
    { key: "applications", titleEn: "Applications", titleMy: "လျှောက်လွှာ", color: "hsl(var(--primary))", data: trends?.applications || [] },
    { key: "bookings", titleEn: "Mentor Bookings", titleMy: "Mentor ချိန်းဆို", color: "hsl(var(--accent))", data: trends?.bookings || [] },
  ];

  const paymentPie = useMemo(() => {
    const sc = trends?.statusCounts || {};
    return [
      { name: lang === "my" ? "စောင့်ဆိုင်း" : "Pending", value: sc.pending || 0, color: "hsl(var(--muted-foreground))" },
      { name: lang === "my" ? "အတည်ပြု" : "Approved", value: sc.approved || 0, color: "hsl(var(--accent))" },
      { name: lang === "my" ? "ငြင်းပယ်" : "Rejected", value: sc.rejected || 0, color: "hsl(var(--destructive))" },
      { name: lang === "my" ? "ရုပ်သိမ်း" : "Revoked", value: sc.revoked || 0, color: "hsl(var(--primary))" },
    ].filter((s) => s.value > 0);
  }, [trends, lang]);

  const totalInRange = (key: keyof NonNullable<typeof trends>) => {
    const arr = (trends?.[key] as { value: number }[]) || [];
    return arr.reduce((a, b) => a + (b.value || 0), 0);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ခွဲခြမ်းစိတ်ဖြာ" : "Analytics"} showBack />

      <div className="px-5 space-y-5">
        {/* Range filter */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{lang === "my" ? "ကာလရွေးပါ" : "Time range"}</p>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                  range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {lang === "my" ? r.labelMy : r.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* KPI grid */}
        {sections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? section.title.my : section.title.en}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {section.items.map((m, mi) => (
                <button
                  key={mi}
                  onClick={() => navigate(m.path)}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
                >
                  <p className="text-[10px] text-muted-foreground leading-tight">{lang === "my" ? m.label.my : m.label.en}</p>
                  <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{m.value}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Trend charts */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {lang === "my" ? "တိုးတက်မှု လမ်းကြောင်း" : "Growth Trends"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {chartCards.map((c) => {
              const total = c.data.reduce((a, b) => a + (b.value || 0), 0);
              return (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold text-foreground">{lang === "my" ? c.titleMy : c.titleEn}</p>
                    <p className="text-lg font-bold text-foreground">{total.toLocaleString()}</p>
                  </div>
                  <div className="h-32 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={c.data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                        <defs>
                          <linearGradient id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c.color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.floor(c.data.length / 6))} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <Area type="monotone" dataKey="value" stroke={c.color} strokeWidth={2} fill={`url(#grad-${c.key})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Payment status mix */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {lang === "my" ? "ငွေပေးချေမှု အခြေအနေ" : "Payment Status Mix"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">{lang === "my" ? "အတည်ပြုငွေ စုစုပေါင်း" : "Approved Volume"}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">${(trends?.approvedSum || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ရွေးချယ်ထားသော ကာလအတွင်း" : `In selected ${days}-day window`}</p>
              <div className="mt-3 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends?.payments || []} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.floor((trends?.payments?.length || 0) / 6))} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">{lang === "my" ? "အခြေအနေအလိုက်" : "By Status"}</p>
              {paymentPie.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-xs text-muted-foreground">{lang === "my" ? "ဒေတာ မရှိပါ" : "No data"}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentPie} dataKey="value" innerRadius={28} outerRadius={50} paddingAngle={2}>
                          {paymentPie.map((p, i) => (
                            <Cell key={i} fill={p.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {paymentPie.map((p) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="font-semibold text-foreground">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Range summary footer */}
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "my" ? "ကာလအတွင်း စုစုပေါင်း" : "Totals in range"}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              { label: lang === "my" ? "Signup" : "Signups", value: totalInRange("signups") },
              { label: lang === "my" ? "Jobs" : "Jobs", value: totalInRange("jobs") },
              { label: lang === "my" ? "Apps" : "Apps", value: totalInRange("applications") },
              { label: lang === "my" ? "Bookings" : "Bookings", value: totalInRange("bookings") },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-base font-bold text-foreground leading-tight">{trendsLoading ? "—" : s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
