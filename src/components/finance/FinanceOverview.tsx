import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Coins, Clock, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { PLATFORM_MENTOR_CUT } from "@/lib/partner-finance";
import { roundMmk } from "@/lib/finance";

/**
 * Shared finance overview used by Admin Finance Hub and (filtered) Partner Finance Hub.
 * Pulls payment_requests + mentor_earnings + partner statements directly.
 * All numbers honour the same NPR/Platform-cut rules as the partner engine,
 * so audits cross-reference the same source of truth.
 */
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const shortLabel = (key: string) => { const d = new Date(key); return `${d.getMonth() + 1}/${d.getDate()}`; };

interface Props {
  /** If set, only count payment_requests where user_id is in this set (partner scope). */
  attributedUserIds?: Set<string> | null;
  /** Days window for the trend chart. */
  days?: number;
  /** Hide platform-only sections (mentor liability, partner liability) when rendering for a partner. */
  hidePlatformOnly?: boolean;
  /** Optional onClick deep-link targets — admin uses these to navigate to detail tabs. */
  onOpenQueue?: () => void;
  onOpenRevenue?: () => void;
  onOpenPartners?: () => void;
}

export default function FinanceOverview({ attributedUserIds, days = 30, hidePlatformOnly = false, onOpenQueue, onOpenRevenue, onOpenPartners }: Props) {
  const { lang } = useLanguage();
  const my = lang === "my";
  const navigate = useNavigate();

  const sinceIso = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1)); d.setHours(0,0,0,0);
    return d.toISOString();
  }, [days]);

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["finance-overview-payments", days, attributedUserIds ? Array.from(attributedUserIds).sort().join(",") : "all"],
    queryFn: async () => {
      let q = supabase.from("payment_requests")
        .select("id,user_id,payment_type,amount,status,currency,created_at,reviewed_at,third_party_payout,npr_amount")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(2000);
      const { data } = await q;
      let rows = data || [];
      if (attributedUserIds) rows = rows.filter((r) => attributedUserIds.has(r.user_id));
      return rows;
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ["finance-overview-earnings"],
    enabled: !hidePlatformOnly,
    queryFn: async () => {
      const { data } = await supabase.from("mentor_earnings").select("amount,currency,status,paid_out_at").limit(2000);
      return data || [];
    },
  });

  const { data: partnerStats } = useQuery({
    queryKey: ["finance-overview-partner-liability"],
    enabled: !hidePlatformOnly,
    queryFn: async () => {
      const { data } = await (supabase as any).from("partner_monthly_statements")
        .select("partner_id,total_payout,status,paid_at,period_year,period_month,partners(name,code)")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(200);
      return (data || []) as any[];
    },
  });

  // KPIs
  const approved = (payments || []).filter((p) => p.status === "approved");
  const pending = (payments || []).filter((p) => p.status === "pending");
  const nprOf = (p: any) => {
    if (p.npr_amount != null) return roundMmk(Number(p.npr_amount));
    const gross = Number(p.amount || 0);
    if (p.payment_type === "mentor_session") return roundMmk(gross * PLATFORM_MENTOR_CUT);
    return roundMmk(Math.max(0, gross - Number(p.third_party_payout || 0)));
  };
  const platformRevenue = approved.reduce((s, p) => s + nprOf(p), 0);
  const pendingValue = pending.reduce((s, p) => s + Number(p.amount || 0), 0);
  const mentorOwed = (earnings || []).filter((e: any) => e.status === "pending" && !e.paid_out_at).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const partnerOwed = (partnerStats || []).filter((s: any) => s.status === "finalized" && !s.paid_at).reduce((sum: number, s: any) => sum + Number(s.total_payout || 0), 0);

  // Daily revenue series (NPR per day)
  const buckets = useMemo(() => {
    const map = new Map<string, { date: string; label: string; revenue: number; pending: number; bookings: number }>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const k = dayKey(d);
      map.set(k, { date: k, label: shortLabel(k), revenue: 0, pending: 0, bookings: 0 });
    }
    (payments || []).forEach((p) => {
      const k = dayKey(new Date(p.created_at as string));
      const e = map.get(k); if (!e) return;
      if (p.status === "approved") e.revenue += nprOf(p);
      else if (p.status === "pending") e.pending += Number(p.amount || 0);
    });
    return Array.from(map.values());
  }, [payments, days]);

  // Type mix (donut)
  const typeMix = useMemo(() => {
    const m = new Map<string, number>();
    approved.forEach((p) => {
      const t = p.payment_type === "mentor_session" ? "mentor" : p.payment_type === "placement_fee" ? "placement" : "other";
      m.set(t, (m.get(t) || 0) + nprOf(p));
    });
    const colors: Record<string, string> = { placement: "hsl(var(--primary))", mentor: "hsl(var(--accent))", other: "hsl(var(--muted-foreground))" };
    const labels: Record<string, string> = { placement: my ? "Placement Fee" : "Placement Fee", mentor: my ? "Mentor (15%)" : "Mentor (15%)", other: my ? "အခြား" : "Other" };
    return Array.from(m.entries()).map(([k, v]) => ({ name: labels[k], value: Math.round(v), color: colors[k] })).filter((d) => d.value > 0);
  }, [approved, my]);

  const statusMix = useMemo(() => {
    const groups = { pending: 0, approved: 0, rejected: 0, revoked: 0 } as Record<string, number>;
    (payments || []).forEach((p) => { const s = (p.status || "pending") as string; groups[s] = (groups[s] || 0) + 1; });
    const colors: Record<string, string> = { pending: "hsl(var(--warning))", approved: "hsl(var(--emerald))", rejected: "hsl(var(--destructive))", revoked: "hsl(var(--muted-foreground))" };
    const labels: Record<string, string> = { pending: my ? "စောင့်ဆိုင်း" : "Pending", approved: my ? "အတည်ပြု" : "Approved", rejected: my ? "ငြင်းပယ်" : "Rejected", revoked: my ? "ရုပ်သိမ်း" : "Revoked" };
    return Object.entries(groups).map(([k, v]) => ({ name: labels[k], value: v, color: colors[k] })).filter((d) => d.value > 0);
  }, [payments, my]);

  // Top partners by lifetime liability
  const topPartners = useMemo(() => {
    if (hidePlatformOnly) return [];
    const m = new Map<string, { name: string; total: number; owed: number }>();
    (partnerStats || []).forEach((s: any) => {
      const name = s.partners?.name || s.partner_id?.slice(0, 8);
      const e = m.get(s.partner_id) || { name, total: 0, owed: 0 };
      e.total += Number(s.total_payout || 0);
      if (s.status === "finalized" && !s.paid_at) e.owed += Number(s.total_payout || 0);
      m.set(s.partner_id, e);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [partnerStats, hidePlatformOnly]);

  const fmt = (n: number) => `${roundMmk(n).toLocaleString()} Ks`;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className={`grid gap-3 ${hidePlatformOnly ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
        <KpiCard icon={Coins} tone="emerald" label={my ? `Platform NPR · ${days}ရက်` : `Platform NPR · ${days}d`} value={fmt(platformRevenue)} onClick={onOpenRevenue} />
        <KpiCard icon={Clock} tone="warn" label={my ? `စစ်ဆေးရန် ပမာဏ` : `Pending review`} value={fmt(pendingValue)} sub={`${pending.length} ${my ? "ခု" : "items"}`} onClick={onOpenQueue} />
        {!hidePlatformOnly && (
          <KpiCard icon={Users} tone="primary" label={my ? "Mentor ပေးရန်" : "Owed to mentors"} value={fmt(mentorOwed)} onClick={() => navigate("/admin/finance?tab=payouts")} />
        )}
        {!hidePlatformOnly && (
          <KpiCard icon={TrendingUp} tone="accent" label={my ? "Partner ပေးရန်" : "Partner liability"} value={fmt(partnerOwed)} onClick={onOpenPartners} />
        )}
        {hidePlatformOnly && (
          <KpiCard icon={Users} tone="primary" label={my ? "Attributed သုံးစွဲသူ" : "Attributed users"} value={String(attributedUserIds?.size ?? 0)} />
        )}
      </div>

      {/* Daily revenue area */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold">{my ? "နေ့စဉ် ဝင်ငွေ (NPR)" : "Daily NPR revenue"}</p>
          <p className="text-xs text-muted-foreground">{my ? `${days} ရက်` : `Last ${days} days`}</p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(buckets.length / 8))} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rev-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Mix charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={my ? "ဝင်ငွေ အမျိုးအစား" : "Revenue mix"} empty={typeMix.length === 0} emptyText={my ? "ဒေတာ မရှိ" : "No revenue yet"}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeMix} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {typeMix.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={my ? "ပေးချေမှု အခြေအနေ" : "Payment status mix"} empty={statusMix.length === 0} emptyText={my ? "ဒေတာ မရှိ" : "No data"}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusMix} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {statusMix.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top partners */}
      {!hidePlatformOnly && topPartners.length > 0 && (
        <ChartCard title={my ? "Partner ပေးချေမှု အများဆုံး" : "Top partners (lifetime)"} onAction={onOpenPartners} actionLabel={my ? "Partner အားလုံး" : "All partners"}>
          <ResponsiveContainer width="100%" height={Math.max(180, topPartners.length * 36)}>
            <BarChart data={topPartners} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: any, k: any) => [fmt(Number(v)), k === "total" ? (my ? "စုစုပေါင်း" : "Lifetime") : (my ? "ပေးရန်" : "Owed")]} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="owed" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {loadingPayments && <p className="text-xs text-muted-foreground">{my ? "ဖွင့်နေသည်…" : "Loading finance data…"}</p>}
    </div>
  );
}

function KpiCard({ icon: Icon, tone, label, value, sub, onClick }: { icon: any; tone: "emerald" | "warn" | "primary" | "accent"; label: string; value: string; sub?: string; onClick?: () => void }) {
  const accent = tone === "emerald" ? "bg-emerald/10 text-emerald" : tone === "warn" ? "bg-warning/15 text-warning" : tone === "accent" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary";
  const Wrap: any = onClick ? "button" : "div";
  return (
    <Wrap {...(onClick ? { onClick, type: "button" } : {})} className={`rounded-xl border border-border bg-card p-4 text-left ${onClick ? "transition-colors hover:border-primary/40 active:bg-muted/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}><Icon className="h-4 w-4" strokeWidth={1.75} /></div>
        {onClick && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Wrap>
  );
}

function ChartCard({ title, children, empty, emptyText, onAction, actionLabel }: { title: string; children: React.ReactNode; empty?: boolean; emptyText?: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {onAction && actionLabel && (
          <button onClick={onAction} className="text-[11px] font-medium text-primary hover:underline">{actionLabel} →</button>
        )}
      </div>
      {empty ? (
        <div className="flex h-32 items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> {emptyText}
        </div>
      ) : children}
    </div>
  );
}
