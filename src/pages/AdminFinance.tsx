import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ArrowDownRight, ArrowUpRight, TrendingUp, ChevronRight, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import { Button } from "@/components/ui/button";
import { paymentTypeLabels, shortRef, formatMoney } from "@/lib/finance";
import { PLATFORM_MENTOR_CUT } from "@/lib/partner-finance";

const PLATFORM_CUT_PERCENT = PLATFORM_MENTOR_CUT;

type RowKey =
  | "in.subscription"
  | "in.addon"
  | "in.placement"
  | "in.session"
  | "in.pending"
  | "out.mentor_paid"
  | "out.mentor_owed"
  | "out.partner_paid"
  | "out.partner_owed";

const AdminFinance = ({
  hideHeader = false,
  attributedUserIds = null,
  partnerId = null,
}: {
  hideHeader?: boolean;
  /** When set, scopes ledger queries to this set of user ids (partner view). */
  attributedUserIds?: Set<string> | null;
  /** When set, scopes partner statements to this partner (partner view). */
  partnerId?: string | null;
} = {}) => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const isPartnerScope = !!attributedUserIds;
  const scopedIds = attributedUserIds ? Array.from(attributedUserIds) : null;
  const scopeKey = scopedIds ? [...scopedIds].sort().join(",") : "all";
  const [selected, setSelected] = useState<RowKey>("in.subscription");

  // Subscription + add-on payments (new monetization model).
  const { data: subPayments, isLoading: loadingSubs } = useQuery({
    queryKey: ["admin-finance-subs", scopeKey],
    queryFn: async () => {
      if (isPartnerScope && scopedIds!.length === 0) return [];
      let q = (supabase as any).from("subscription_payment_requests")
        .select("id,user_id,request_type,plan_id,addon_id,quantity,mmk_amount,payment_method,status,created_at,reviewed_at")
        .order("created_at", { ascending: false })
        .limit(50000);
      if (isPartnerScope) q = q.in("user_id", scopedIds!);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: planLookup } = useQuery({
    queryKey: ["admin-finance-plan-lookup"],
    queryFn: async () => {
      const [plans, addons] = await Promise.all([
        (supabase as any).from("subscription_plans").select("id,tier"),
        (supabase as any).from("addon_products").select("id,label_en,label_my"),
      ]);
      const TIER: Record<string,string> = { free_trial:"Free Trial", starter:"Starter", growth:"Growth", business:"Business", enterprise:"Enterprise" };
      const planMap = new Map<string,string>((plans.data||[]).map((p:any)=>[p.id, TIER[p.tier]||p.tier]));
      const addonMap = new Map<string,{en:string;my:string}>((addons.data||[]).map((a:any)=>[a.id,{en:a.label_en,my:a.label_my||a.label_en}]));
      return { planMap, addonMap };
    },
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-finance-payments", scopeKey],
    queryFn: async () => {
      if (isPartnerScope && scopedIds!.length === 0) return [];
      let q = supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(50000);
      if (isPartnerScope) q = q.in("user_id", scopedIds!);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: earnings, isLoading: loadingEarnings } = useQuery({
    queryKey: ["admin-finance-earnings"],
    enabled: !isPartnerScope,
    queryFn: async () => {
      const { data } = await supabase.from("mentor_earnings").select("*").order("created_at", { ascending: false }).limit(50000);
      return data || [];
    },
  });

  const { data: partnerStmts, isLoading: loadingPartner } = useQuery({
    queryKey: ["admin-finance-partner-statements", partnerId || "all"],
    queryFn: async () => {
      let q = supabase.from("partner_monthly_statements").select("*").order("created_at", { ascending: false }).limit(5000);
      if (partnerId) q = q.eq("partner_id", partnerId);
      const { data } = await q;
      return data || [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("mentor_payout_mark_paid", { _earning_id: id, _note: null });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-finance-earnings"] }),
    onError: (e: any) => toast.error(e.message || "Failed to mark paid"),
  });

  // ===== Aggregates =====
  const allPayments = payments || [];
  const allEarnings = earnings || [];
  const allPartner = partnerStmts || [];

  const approved = allPayments.filter((p) => p.status === "approved");
  const pending = allPayments.filter((p) => p.status === "pending");
  const approvedPlacement = approved.filter((p) => p.payment_type === "placement_fee");
  const approvedSession = approved.filter((p) => p.payment_type === "mentor_session");
  const pendingPayouts = allEarnings.filter((e) => e.status === "pending" && !e.paid_out_at);
  const paidPayouts = allEarnings.filter((e) => e.status === "paid" || e.paid_out_at);
  const partnerOwed = allPartner.filter((s) => s.status === "finalized" && !s.paid_at);
  const partnerPaid = allPartner.filter((s) => !!s.paid_at);

  const allSubs = subPayments || [];
  const approvedSubs = allSubs.filter((p: any) => p.status === "approved" && p.request_type === "subscription");
  const approvedAddons = allSubs.filter((p: any) => p.status === "approved" && p.request_type === "addon");
  const pendingSubs = allSubs.filter((p: any) => p.status === "pending");

  const sum = (n: number[]) => n.reduce((a, b) => a + (Number(b) || 0), 0);
  const placementTotal = sum(approvedPlacement.map((p) => Number(p.amount)));
  const sessionTotal = sum(approvedSession.map((p) => Number(p.amount)));
  const subscriptionTotal = sum(approvedSubs.map((p: any) => Number(p.mmk_amount || 0)));
  const addonTotal = sum(approvedAddons.map((p: any) => Number(p.mmk_amount || 0)));
  const pendingTotal = sum(pending.map((p) => Number(p.amount))) + sum(pendingSubs.map((p: any) => Number(p.mmk_amount || 0)));
  const mentorPaidTotal = sum(paidPayouts.map((e) => Number(e.amount)));
  const mentorOwedTotal = sum(pendingPayouts.map((e) => Number(e.amount)));
  const partnerPaidTotal = sum(partnerPaid.map((s) => Number(s.total_payout || 0)));
  const partnerOwedTotal = sum(partnerOwed.map((s) => Number(s.total_payout || 0)));

  const moneyInTotal = placementTotal + sessionTotal + subscriptionTotal + addonTotal;
  const moneyOutTotal = mentorPaidTotal + partnerPaidTotal;
  // Subscriptions + add-ons are 100% NPR (no third-party payout).
  const netPlatform = placementTotal + sessionTotal * PLATFORM_CUT_PERCENT + subscriptionTotal + addonTotal;
  const liabilityTotal = mentorOwedTotal + partnerOwedTotal;

  // Row definitions: simple breakdown lines for IN and OUT
  type Row = { key: RowKey; label: { en: string; my: string }; sub: { en: string; my: string }; amount: number; tone?: "warn" };
  const inRows: Row[] = [
    { key: "in.subscription", label: { en: "Subscriptions", my: "Subscription" }, sub: { en: "Employer & Agent monthly/yearly plans", my: "Employer & Agent လစဉ်/နှစ်စဉ်" }, amount: subscriptionTotal },
    { key: "in.addon", label: { en: "Add-ons", my: "Add-on" }, sub: { en: "Unlocks, featured jobs, matching pack", my: "Unlock / Featured / Matching" }, amount: addonTotal },
    { key: "in.placement", label: { en: "Placement Fees", my: "ခန့်အပ်ခ" }, sub: { en: "From employers", my: "Employer မှ" }, amount: placementTotal },
    { key: "in.session", label: { en: "Direct Session Payments", my: "Session ပေးချေ" }, sub: { en: "Approved mentor session payments", my: "Mentor session" }, amount: sessionTotal },
    { key: "in.pending", label: { en: "Pending Review", my: "စစ်ဆေးရန်" }, sub: { en: "Awaiting verification (all sources)", my: "အတည်ပြုရန် (အားလုံး)" }, amount: pendingTotal, tone: "warn" },
  ];
  const outRows: Row[] = [
    ...(isPartnerScope ? [] : [
      { key: "out.mentor_paid" as RowKey, label: { en: "Mentor Payouts (Paid)", my: "Mentor ပေးချေပြီး" }, sub: { en: "Cash sent to mentors", my: "ပေးချေပြီး" }, amount: mentorPaidTotal },
      { key: "out.mentor_owed" as RowKey, label: { en: "Mentor Payouts (Owed)", my: "Mentor ပေးရန်" }, sub: { en: "Liability — not yet paid", my: "မပေးရသေး" }, amount: mentorOwedTotal, tone: "warn" as const },
    ]),
    { key: "out.partner_paid", label: { en: isPartnerScope ? "Your Rev-share (Paid)" : "Partner Rev-share (Paid)", my: "Partner ပေးချေပြီး" }, sub: { en: "Already paid", my: "ပေးချေပြီး" }, amount: partnerPaidTotal },
    { key: "out.partner_owed", label: { en: isPartnerScope ? "Your Rev-share (Owed)" : "Partner Rev-share (Owed)", my: "Partner ပေးရန်" }, sub: { en: "Finalized, unpaid", my: "Finalized, မပေးရသေး" }, amount: partnerOwedTotal, tone: "warn" },
  ];

  // ===== Details for selected row =====
  const detail = useMemo(() => {
    const paymentToRow = (p: any, amountOverride?: number) => ({
      id: p.id,
      title: (lang === "my" ? paymentTypeLabels[p.payment_type]?.my : paymentTypeLabels[p.payment_type]?.en) || p.payment_type,
      subtitle: `${(p.payment_method || "").toUpperCase()} · ${shortRef(p.id)}`,
      amount: amountOverride ?? Number(p.amount),
      currency: p.currency,
      status: p.status,
      date: p.created_at,
    });
    const earningToRow = (e: any) => ({
      id: e.id,
      title: lang === "my" ? "Session ဝင်ငွေ" : "Session Earning",
      subtitle: `${shortRef(e.mentor_id)} · ${shortRef(e.booking_id || e.id)}`,
      amount: Number(e.amount),
      currency: e.currency,
      status: e.status === "paid" || e.paid_out_at ? "approved" : "pending",
      date: e.created_at,
      trailing:
        e.status === "pending" && !e.paid_out_at ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-1 h-6 rounded-full px-2 text-[10px]"
            disabled={markPaid.isPending}
            onClick={(ev: any) => {
              ev.stopPropagation();
              markPaid.mutate(e.id);
            }}
          >
            <Check className="mr-1 h-3 w-3" />
            {lang === "my" ? "ပေးချေပြီး" : "Mark Paid"}
          </Button>
        ) : null,
    });
    const partnerToRow = (s: any) => ({
      id: s.id,
      title: lang === "my" ? "Partner Rev-share" : "Partner Rev-share",
      subtitle: `${shortRef(s.partner_id)} · ${s.period_year}-${String(s.period_month).padStart(2, "0")}`,
      amount: Number(s.total_payout || 0),
      currency: s.currency || "MMK",
      status: s.paid_at ? "approved" : "pending",
      date: s.paid_at || s.created_at,
    });

    const subToRow = (p: any) => {
      let title: string;
      if (p.request_type === "addon") {
        const a = planLookup?.addonMap.get(p.addon_id);
        const name = a ? (lang === "my" ? a.my : a.en) : (lang === "my" ? "Add-on" : "Add-on");
        title = `${name} Package`;
      } else {
        const tier = planLookup?.planMap.get(p.plan_id);
        title = `${tier || "Subscription"} Package`;
      }
      return {
        id: p.id,
        title,
        subtitle: `${(p.payment_method || "").toUpperCase()}${p.quantity > 1 ? " · ×" + p.quantity : ""} · ${shortRef(p.id)}`,
        amount: Number(p.mmk_amount || 0),
        currency: "MMK",
        status: p.status,
        date: p.created_at,
      };
    };

    switch (selected) {
      case "in.subscription": return { rows: approvedSubs.map(subToRow), loading: loadingSubs };
      case "in.addon": return { rows: approvedAddons.map(subToRow), loading: loadingSubs };
      case "in.placement": return { rows: approvedPlacement.map((p) => paymentToRow(p)), loading: loadingPayments };
      case "in.session": return { rows: approvedSession.map((p) => paymentToRow(p)), loading: loadingPayments };
      case "in.pending": return { rows: [...pending.map((p) => paymentToRow(p)), ...pendingSubs.map(subToRow)], loading: loadingPayments || loadingSubs };
      case "out.mentor_paid": return { rows: paidPayouts.map(earningToRow), loading: loadingEarnings };
      case "out.mentor_owed": return { rows: pendingPayouts.map(earningToRow), loading: loadingEarnings };
      case "out.partner_paid": return { rows: partnerPaid.map(partnerToRow), loading: loadingPartner };
      case "out.partner_owed": return { rows: partnerOwed.map(partnerToRow), loading: loadingPartner };
    }
  }, [selected, approvedPlacement, approvedSession, pending, pendingSubs, approvedSubs, approvedAddons, paidPayouts, pendingPayouts, partnerPaid, partnerOwed, lang, markPaid, loadingPayments, loadingSubs, loadingEarnings, loadingPartner, planLookup]);

  const selectedRow = [...inRows, ...outRows].find((r) => r.key === selected)!;
  const selectedIsSpend = false;

  return (
    <div className={hideHeader ? "" : "min-h-screen bg-background pb-24"}>
      {!hideHeader && <PageHeader title={lang === "my" ? "ငွေကြေး စီမံခန့်ခွဲမှု" : "Platform Finances"} showBack />}
      <div className={hideHeader ? "" : "px-5"}>
        {isPartnerScope && (() => {
          const noUsers = scopedIds!.length === 0;
          const noActivity = !noUsers && moneyInTotal === 0 && moneyOutTotal === 0;
          if (!noUsers && !noActivity) return null;
          return (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-muted-foreground">
              {noUsers
                ? (lang === "my"
                    ? "သင်နှင့် ချိတ်ဆက်ထားသော attributed user မရှိသေးပါ။ Referral link မှ user အသစ်ဝင်လာသည်နှင့် ဤနေရာတွင် ဝင်ငွေ / သုံးစွဲ ဒေတာ ပေါ်လာပါမည်။"
                    : "No attributed users yet. Revenue and spend numbers will appear here as users sign up via your referral link and start transacting.")
                : (lang === "my"
                    ? `သင်တွင် attributed user ${scopedIds!.length} ဦး ရှိသော်လည်း ဤလအတွင်း ငွေပေးချေမှု / သုံးစွဲမှု မှတ်တမ်း မရှိသေးပါ။`
                    : `You have ${scopedIds!.length} attributed user${scopedIds!.length === 1 ? "" : "s"}, but none have completed any payments or credit spends yet — numbers below will populate once they transact.`)}
            </div>
          );
        })()}


        {/* HERO: Money In → Net Platform → Money Out */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <HeroCard
            icon={ArrowDownRight}
            label={lang === "my" ? "ဝင်ငွေ စုစုပေါင်း" : "Money In"}
            amount={moneyInTotal}
            tone="emerald"
            sub={lang === "my" ? "ပလက်ဖောင်းသို့ ဝင်လာသော ငွေသား" : "Cash received by platform"}
          />
          <HeroCard
            icon={TrendingUp}
            label={lang === "my" ? "Net Platform ဝင်ငွေ" : "Net Platform Revenue"}
            amount={netPlatform}
            tone="primary"
            sub={lang === "my" ? "Subscription + Add-on + Placement + 15% session" : "Subscriptions + Add-ons + Placement + 15% session"}
          />
          <HeroCard
            icon={ArrowUpRight}
            label={lang === "my" ? "ထွက်ငွေ စုစုပေါင်း" : "Money Out"}
            amount={moneyOutTotal}
            tone="default"
            sub={lang === "my" ? `ပေးရန် ${formatMoney(liabilityTotal, "MMK", lang)}` : `Plus ${formatMoney(liabilityTotal, "MMK", lang)} owed`}
          />
        </div>

        {/* Reconciliation message */}
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-1.5 font-semibold text-foreground">
                {lang === "my"
                  ? "ဤအရေအတွက်များသည် မည်သို့ ဆက်စပ်နေသနည်း?"
                  : "How do these numbers relate?"}
              </p>
              <p>
                {lang === "my"
                  ? (
                    <>
                      <strong className="text-foreground">ဝင်ငွေ</strong> တွင် Credit ဖြည့်ထားသော ငွေ (အသုံးမပြုရသေး) နှင့် Session ဝင်ငွေ <strong className="text-foreground">ရှေ့မှာ</strong> Mentor 85% share ထုတ်ပေးရမည့် gross amount ပါဝင်သည်။
                      {" "}<strong className="text-foreground">Net Platform Revenue</strong> = Placement ခ + Session ၏ 15%။
                      {" "}သို့ဖြစ်ပါ၍ <strong className="text-foreground">ဝင်ငွေ ≠ Net Revenue + ထွက်ငွေ</strong> ဖြစ်သည် — ဝင်ငွေထဲတွင် ကုန်ကျမှု/ရှယ်ယာ မဟုတ်သော liability (Credit top-ups) ပါဝင်သောကြောင့် ဖြစ်သည်။
                    </>
                  ) : (
                    <>
                      <strong className="text-foreground">Money In</strong> includes subscription &amp; add-on cash, legacy credit top-ups (deferred revenue), and session payments <strong className="text-foreground">before</strong> the mentor&apos;s 85% share is deducted.
                      {" "}<strong className="text-foreground">Net Platform Revenue</strong> = Subscriptions + Add-ons + Placement fees + 15% of sessions.
                      {" "}That is why <strong className="text-foreground">Money In ≠ Net Revenue + Money Out</strong> — Money In contains liabilities (legacy credit top-ups) that are not platform revenue.
                    </>
                  )}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column breakdown */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <BreakdownColumn
            title={lang === "my" ? "ဝင်ငွေ အသေးစိတ်" : "Money In — Breakdown"}
            total={moneyInTotal}
            rows={inRows}
            selected={selected}
            onSelect={setSelected}
            lang={lang}
            accent="emerald"
          />
          <BreakdownColumn
            title={lang === "my" ? "ထွက်ငွေ အသေးစိတ်" : "Money Out — Breakdown"}
            total={moneyOutTotal + liabilityTotal}
            rows={outRows}
            selected={selected}
            onSelect={setSelected}
            lang={lang}
            accent="default"
            totalLabel={lang === "my" ? "ပေးချေပြီး + ပေးရန်" : "Paid + Owed"}
          />
        </div>


        {/* Details */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              {lang === "my" ? selectedRow.label.my : selectedRow.label.en}
            </h3>
            <span className="text-xs text-muted-foreground">
              · {detail?.rows.length || 0} {lang === "my" ? "ခု" : "records"} · {formatMoney(selectedRow.amount, selectedIsSpend ? "CREDITS" : "MMK", lang)}
            </span>
          </div>
          <FinanceLedger
            isLoading={detail?.loading}
            totals={[]}
            rows={(detail?.rows || []) as any}
            emptyText={{ my: "မှတ်တမ်း မရှိသေးပါ", en: "No records yet" }}
          />
        </div>
      </div>
    </div>
  );
};

function HeroCard({
  icon: Icon,
  label,
  amount,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  amount: number;
  sub: string;
  tone: "emerald" | "primary" | "default";
}) {
  const toneClass =
    tone === "emerald" ? "border-emerald/30 bg-emerald/5" :
    tone === "primary" ? "border-primary/40 bg-primary/5" :
    "border-border bg-card";
  return (
    <div className={`rounded-2xl border ${toneClass} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{formatMoney(amount, "MMK", "en")}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function BreakdownColumn({
  title,
  total,
  totalLabel,
  rows,
  selected,
  onSelect,
  lang,
  accent,
  unit = "MMK",
}: {
  title: string;
  total: number;
  totalLabel?: string;
  rows: { key: RowKey; label: { en: string; my: string }; sub: { en: string; my: string }; amount: number; tone?: "warn" }[];
  selected: RowKey;
  onSelect: (k: RowKey) => void;
  lang: "my" | "en";
  accent: "emerald" | "default";
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border p-4">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <div className="text-right">
          <p className="text-base font-bold text-foreground">{formatMoney(total, unit, lang)}</p>
          {totalLabel && <p className="text-[10px] text-muted-foreground">{totalLabel}</p>}
        </div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const active = selected === r.key;
          return (
            <motion.button
              key={r.key}
              whileTap={{ scale: 0.995 }}
              onClick={() => onSelect(r.key)}
              className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors ${
                active ? "bg-primary/5" : "hover:bg-muted/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {lang === "my" ? r.label.my : r.label.en}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {lang === "my" ? r.sub.my : r.sub.en}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${r.tone === "warn" ? "text-warning" : accent === "emerald" ? "text-emerald" : "text-foreground"}`}>
                  {formatMoney(r.amount, unit, lang)}
                </p>
              </div>
              <ChevronRight className={`h-4 w-4 transition-colors ${active ? "text-primary" : "text-muted-foreground/40"}`} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default AdminFinance;
