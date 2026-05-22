import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Clock,
  Banknote,
  PiggyBank,
  Coins,
  Briefcase,
  Handshake,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import { Button } from "@/components/ui/button";
import { paymentTypeLabels, shortRef, formatTotals, formatMoney } from "@/lib/finance";

// TODO: fetch from platform_config in future
const PLATFORM_CUT_PERCENT = 0.15;

type ViewKey =
  | "topups"
  | "placement_in"
  | "session_in"
  | "pending_in"
  | "net_platform"
  | "mentor_share"
  | "mentor_owed"
  | "mentor_paid"
  | "partner_owed"
  | "partner_paid";

const AdminFinance = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewKey>("topups");

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-finance-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  const { data: earnings, isLoading: loadingEarnings } = useQuery({
    queryKey: ["admin-finance-earnings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_earnings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  const { data: topups, isLoading: loadingTopups } = useQuery({
    queryKey: ["admin-finance-topups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("kind", "topup")
        .eq("status", "completed")
        .eq("ref_type", "topup_request")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  const { data: partnerStmts, isLoading: loadingPartner } = useQuery({
    queryKey: ["admin-finance-partner-statements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_monthly_statements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("mentor_payout_mark_paid", {
        _earning_id: id,
        _note: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-finance-earnings"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to mark paid"),
  });

  // ===== Aggregates =====
  const allPayments = payments || [];
  const allEarnings = earnings || [];
  const allTopups = topups || [];
  const allPartner = partnerStmts || [];

  const approved = allPayments.filter((p) => p.status === "approved");
  const pending = allPayments.filter((p) => p.status === "pending");
  const approvedPlacement = approved.filter((p) => p.payment_type === "placement_fee");
  const approvedSession = approved.filter((p) => p.payment_type === "mentor_session");

  // Incoming
  const topupRows = allTopups.map((t) => ({ amount: Number(t.mmk_amount || 0), currency: "MMK" }));
  const placementRows = approvedPlacement.map((p) => ({ amount: Number(p.amount), currency: p.currency }));
  const sessionRows = approvedSession.map((p) => ({ amount: Number(p.amount), currency: p.currency }));
  const pendingRows = pending.map((p) => ({ amount: Number(p.amount), currency: p.currency }));

  // Platform Net = placement fees (100%) + 15% of direct session payments
  // NOTE: credit topups are deferred revenue (liability) until credits are spent
  const netPlatformRows = [
    ...placementRows,
    ...sessionRows.map((r) => ({ amount: r.amount * PLATFORM_CUT_PERCENT, currency: r.currency })),
  ];

  // Mentor liability — derived from mentor_earnings (source of truth)
  const pendingPayouts = allEarnings.filter((e) => e.status === "pending" && !e.paid_out_at);
  const paidPayouts = allEarnings.filter((e) => e.status === "paid" || e.paid_out_at);
  const mentorShareRows = allEarnings.map((e) => ({ amount: Number(e.amount), currency: e.currency }));
  const mentorOwedRows = pendingPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency }));
  const mentorPaidRows = paidPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency }));

  // Partner payouts
  const partnerOwed = allPartner.filter((s) => s.status === "finalized" && !s.paid_at);
  const partnerPaid = allPartner.filter((s) => !!s.paid_at);
  const partnerOwedRows = partnerOwed.map((s) => ({ amount: Number(s.total_payout || 0), currency: s.currency || "MMK" }));
  const partnerPaidRows = partnerPaid.map((s) => ({ amount: Number(s.total_payout || 0), currency: s.currency || "MMK" }));

  // ===== Card definitions =====
  type Card = {
    key: ViewKey;
    label: { en: string; my: string };
    rows: { amount: number; currency: string }[];
    hint: { en: string; my: string };
    icon: typeof Wallet;
    tone: string;
    group: "in" | "platform" | "mentor" | "partner";
  };

  const cards: Card[] = [
    {
      key: "topups",
      label: { en: "Credit Top-ups", my: "Credit ဖြည့်ခြင်း" },
      rows: topupRows,
      hint: { en: "Cash from job seekers & mentees", my: "Job seeker / mentee ထံမှ" },
      icon: Coins,
      tone: "border-emerald/30 bg-emerald/5",
      group: "in",
    },
    {
      key: "placement_in",
      label: { en: "Placement Fees", my: "ခန့်အပ်ခ" },
      rows: placementRows,
      hint: { en: "Paid by employers", my: "Employer မှ ပေးချေ" },
      icon: Briefcase,
      tone: "border-emerald/30 bg-emerald/5",
      group: "in",
    },
    {
      key: "session_in",
      label: { en: "Direct Session Payments", my: "Session ပေးချေ" },
      rows: sessionRows,
      hint: { en: "Non-credit session bookings", my: "Credit မဟုတ်သော session" },
      icon: ArrowDownCircle,
      tone: "border-emerald/30 bg-emerald/5",
      group: "in",
    },
    {
      key: "pending_in",
      label: { en: "Pending Review", my: "စစ်ဆေးရန်" },
      rows: pendingRows,
      hint: { en: "Awaiting admin verification", my: "အတည်ပြုရန် ကျန်" },
      icon: Clock,
      tone: "border-warning/30 bg-warning/5",
      group: "in",
    },
    {
      key: "net_platform",
      label: { en: "Net Platform Revenue", my: "Net ပလက်ဖောင်း ဝင်ငွေ" },
      rows: netPlatformRows,
      hint: { en: "Placement fees + 15% direct session cut", my: "Placement + 15% session cut" },
      icon: PiggyBank,
      tone: "border-primary/30 bg-primary/5",
      group: "platform",
    },
    {
      key: "mentor_share",
      label: { en: "Mentor Share (85%)", my: "Mentor ဝေစု (85%)" },
      rows: mentorShareRows,
      hint: { en: "= Owed + Paid Out", my: "= ပေးရန် + ပေးချေပြီး" },
      icon: Wallet,
      tone: "border-border bg-card",
      group: "mentor",
    },
    {
      key: "mentor_owed",
      label: { en: "Mentor Owed", my: "Mentor ပေးရန်" },
      rows: mentorOwedRows,
      hint: { en: "Liability — not yet paid", my: "မပေးရသေး" },
      icon: ArrowUpCircle,
      tone: "border-warning/30 bg-warning/5",
      group: "mentor",
    },
    {
      key: "mentor_paid",
      label: { en: "Mentor Paid Out", my: "Mentor ပေးချေပြီး" },
      rows: mentorPaidRows,
      hint: { en: "Cash already sent to mentors", my: "ပေးချေပြီး" },
      icon: Banknote,
      tone: "border-emerald/30 bg-emerald/5",
      group: "mentor",
    },
    {
      key: "partner_owed",
      label: { en: "Partner Owed", my: "Partner ပေးရန်" },
      rows: partnerOwedRows,
      hint: { en: "Finalized rev-share, unpaid", my: "Finalized, မပေးရသေး" },
      icon: Handshake,
      tone: "border-warning/30 bg-warning/5",
      group: "partner",
    },
    {
      key: "partner_paid",
      label: { en: "Partner Paid Out", my: "Partner ပေးချေပြီး" },
      rows: partnerPaidRows,
      hint: { en: "Rev-share already paid", my: "ပေးချေပြီး" },
      icon: Handshake,
      tone: "border-emerald/30 bg-emerald/5",
      group: "partner",
    },
  ];

  // ===== Detail rows for the active card =====
  const detailRows = useMemo(() => {
    const paymentToRow = (p: any, amountOverride?: number, titleSuffix?: string) => ({
      id: p.id,
      title:
        (lang === "my"
          ? paymentTypeLabels[p.payment_type]?.my
          : paymentTypeLabels[p.payment_type]?.en) ||
        p.payment_type ||
        "Payment",
      subtitle: `${(p.payment_method || "").toUpperCase()} · ${shortRef(p.id)}${titleSuffix ? " · " + titleSuffix : ""}`,
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
      status: (e.status === "paid" || e.paid_out_at) ? "approved" : "pending",
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

    const topupToRow = (t: any) => ({
      id: t.id,
      title: lang === "my" ? "Credit ဖြည့်" : "Credit Top-up",
      subtitle: `${shortRef(t.user_id)} · ${t.credits?.toLocaleString() || 0} credits`,
      amount: Number(t.mmk_amount || 0),
      currency: "MMK",
      status: "approved",
      date: t.created_at,
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

    switch (view) {
      case "topups":
        return allTopups.map(topupToRow);
      case "placement_in":
        return approvedPlacement.map((p) => paymentToRow(p));
      case "session_in":
        return approvedSession.map((p) => paymentToRow(p));
      case "pending_in":
        return pending.map((p) => paymentToRow(p));
      case "net_platform":
        return [
          ...approvedPlacement.map((p) => paymentToRow(p)),
          ...approvedSession.map((p) => paymentToRow(p, Number(p.amount) * PLATFORM_CUT_PERCENT, "15% cut")),
        ];
      case "mentor_share":
        return allEarnings.map(earningToRow);
      case "mentor_owed":
        return pendingPayouts.map(earningToRow);
      case "mentor_paid":
        return paidPayouts.map(earningToRow);
      case "partner_owed":
        return partnerOwed.map(partnerToRow);
      case "partner_paid":
        return partnerPaid.map(partnerToRow);
      default:
        return [];
    }
  }, [view, approvedPlacement, approvedSession, pending, allEarnings, pendingPayouts, paidPayouts, allTopups, partnerOwed, partnerPaid, lang, markPaid]);

  const activeCard = cards.find((c) => c.key === view)!;
  const isLoading =
    view === "topups" ? loadingTopups :
    view === "mentor_share" || view === "mentor_owed" || view === "mentor_paid" ? loadingEarnings :
    view === "partner_owed" || view === "partner_paid" ? loadingPartner :
    loadingPayments;

  // Reconciliation
  const sum = (rows: { amount: number }[]) => rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const mentorReconciles = Math.round(sum(mentorOwedRows) + sum(mentorPaidRows)) === Math.round(sum(mentorShareRows));
  const totalCashIn = sum(topupRows) + sum(placementRows) + sum(sessionRows);
  const totalCashOut = sum(mentorPaidRows) + sum(partnerPaidRows);

  return (
    <div className={hideHeader ? "" : "min-h-screen bg-background pb-24"}>
      {!hideHeader && <PageHeader title={lang === "my" ? "ငွေကြေး စီမံခန့်ခွဲမှု" : "Platform Finances"} showBack />}
      <div className={hideHeader ? "" : "px-5"}>
        {/* Top-line ribbon */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "ဝင်ငွေ စုစုပေါင်း" : "Total Cash In"}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatMoney(totalCashIn, "MMK", lang)}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "Net Platform" : "Net Platform Revenue"}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatTotals(netPlatformRows, lang)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "ပေးချေပြီး စုစုပေါင်း" : "Total Cash Out"}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatMoney(totalCashOut, "MMK", lang)}</p>
          </div>
        </div>

        {/* INCOMING */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {lang === "my" ? "ဝင်ငွေ" : "Incoming"}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.filter((c) => c.group === "in").map((c) => (
            <CardButton key={c.key} card={c} active={view === c.key} onClick={() => setView(c.key)} lang={lang} />
          ))}
        </div>

        {/* PLATFORM */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {lang === "my" ? "ပလက်ဖောင်း ထိန်းသိမ်း" : "Platform Keeps"}
        </p>
        <div className="mb-4 grid grid-cols-1 gap-3">
          {cards.filter((c) => c.group === "platform").map((c) => (
            <CardButton key={c.key} card={c} active={view === c.key} onClick={() => setView(c.key)} lang={lang} />
          ))}
        </div>

        {/* MENTOR */}
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "my" ? "Mentor ပေးချေမှု" : "Owed to Mentors"}
          </p>
          {!mentorReconciles && (
            <span className="text-[10px] text-warning">
              {lang === "my" ? "ကိန်းဂဏန်း မညီသေး" : "Totals don’t reconcile"}
            </span>
          )}
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {cards.filter((c) => c.group === "mentor").map((c) => (
            <CardButton key={c.key} card={c} active={view === c.key} onClick={() => setView(c.key)} lang={lang} />
          ))}
        </div>

        {/* PARTNER */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {lang === "my" ? "Partner ပေးချေမှု" : "Owed to Partners"}
        </p>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {cards.filter((c) => c.group === "partner").map((c) => (
            <CardButton key={c.key} card={c} active={view === c.key} onClick={() => setView(c.key)} lang={lang} />
          ))}
        </div>

        {/* Reconciliation strip */}
        <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-foreground">
              {lang === "my" ? "စစ်ဆေးခြင်း" : "Reconciliation"}
            </span>
            <span>
              Cash In = Top-ups {formatMoney(sum(topupRows), "MMK", lang)} + Placement {formatMoney(sum(placementRows), "MMK", lang)} + Direct Sessions {formatMoney(sum(sessionRows), "MMK", lang)}
            </span>
            <span>·</span>
            <span className={mentorReconciles ? "text-emerald" : "text-warning"}>
              Mentor Owed + Paid = {formatMoney(sum(mentorOwedRows) + sum(mentorPaidRows), "MMK", lang)} ↔ Share = {formatTotals(mentorShareRows, lang)}
            </span>
            <span>·</span>
            <span>Credit top-ups are deferred revenue — recognized as platform revenue only when credits are spent on sessions/features.</span>
          </div>
        </div>

        {/* Details */}
        <div className="mb-3 flex items-center gap-2">
          <activeCard.icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">
            {lang === "my" ? activeCard.label.my : activeCard.label.en}
          </h3>
          <span className="text-xs text-muted-foreground">· {formatTotals(activeCard.rows, lang)}</span>
        </div>

        <FinanceLedger
          isLoading={isLoading}
          totals={[]}
          rows={detailRows as any}
          emptyText={{
            my: "မှတ်တမ်း မရှိသေးပါ",
            en: "No records for this view",
          }}
        />
      </div>
    </div>
  );
};

function CardButton({
  card,
  active,
  onClick,
  lang,
}: {
  card: any;
  active: boolean;
  onClick: () => void;
  lang: "my" | "en";
}) {
  const Icon = card.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`rounded-xl border p-3.5 text-left transition-all ${card.tone} ${
        active ? "ring-2 ring-primary" : "hover:border-foreground/20"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {lang === "my" ? card.label.my : card.label.en}
        </p>
      </div>
      <p className="text-base font-bold text-foreground">{formatTotals(card.rows, lang)}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {lang === "my" ? card.hint.my : card.hint.en}
      </p>
    </motion.button>
  );
}

export default AdminFinance;
