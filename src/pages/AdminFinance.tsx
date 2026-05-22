import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ArrowDownCircle, ArrowUpCircle, Wallet, Clock, Banknote, PiggyBank } from "lucide-react";
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
  | "gross"
  | "pending_in"
  | "net_platform"
  | "mentor_share"
  | "mentor_owed"
  | "mentor_paid";

const AdminFinance = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewKey>("gross");

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

  const approved = allPayments.filter((p) => p.status === "approved");
  const pending = allPayments.filter((p) => p.status === "pending");

  // Incoming
  const grossRows = approved.map((p) => ({ amount: Number(p.amount), currency: p.currency }));
  const pendingRows = pending.map((p) => ({ amount: Number(p.amount), currency: p.currency }));

  // Platform Net (placement fees 100% + 15% of mentor_session approved)
  const netPlatformRows = approved.flatMap((p) => {
    if (p.payment_type === "mentor_session") {
      return [{ amount: Number(p.amount) * PLATFORM_CUT_PERCENT, currency: p.currency }];
    }
    if (p.payment_type === "placement_fee") {
      return [{ amount: Number(p.amount), currency: p.currency }];
    }
    return [];
  });

  // Mentor liability — derived from mentor_earnings (single source of truth)
  const pendingPayouts = allEarnings.filter((e) => e.status === "pending" && !e.paid_out_at);
  const paidPayouts = allEarnings.filter((e) => e.status === "paid" || e.paid_out_at);
  const mentorShareRows = allEarnings.map((e) => ({ amount: Number(e.amount), currency: e.currency }));
  const mentorOwedRows = pendingPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency }));
  const mentorPaidRows = paidPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency }));

  // ===== Card definitions =====
  type Card = {
    key: ViewKey;
    label: { en: string; my: string };
    rows: { amount: number; currency: string }[];
    hint: { en: string; my: string };
    icon: typeof Wallet;
    tone: string;
    group: "in" | "platform" | "out";
  };

  const cards: Card[] = [
    {
      key: "gross",
      label: { en: "Gross Revenue", my: "စုစုပေါင်း ဝင်ငွေ" },
      rows: grossRows,
      hint: { en: "All approved user payments", my: "အတည်ပြုပြီး ပေးချေမှု အားလုံး" },
      icon: ArrowDownCircle,
      tone: "border-emerald/30 bg-emerald/5",
      group: "in",
    },
    {
      key: "pending_in",
      label: { en: "Pending Review", my: "စစ်ဆေးရန် ပေးချေမှု" },
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
      hint: { en: "Placement fees + 15% session cut", my: "Placement fees + 15% cut" },
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
      group: "out",
    },
    {
      key: "mentor_owed",
      label: { en: "Mentor Owed", my: "Mentor ပေးရန်" },
      rows: mentorOwedRows,
      hint: { en: "Liability — not yet paid", my: "မပေးရသေး" },
      icon: ArrowUpCircle,
      tone: "border-warning/30 bg-warning/5",
      group: "out",
    },
    {
      key: "mentor_paid",
      label: { en: "Mentor Paid Out", my: "Mentor ပေးချေပြီး" },
      rows: mentorPaidRows,
      hint: { en: "Cash already sent to mentors", my: "ပေးချေပြီး" },
      icon: Banknote,
      tone: "border-emerald/30 bg-emerald/5",
      group: "out",
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

    switch (view) {
      case "gross":
        return approved.map((p) => paymentToRow(p));
      case "pending_in":
        return pending.map((p) => paymentToRow(p));
      case "net_platform":
        return approved
          .filter((p) => p.payment_type === "placement_fee" || p.payment_type === "mentor_session")
          .map((p) =>
            p.payment_type === "mentor_session"
              ? paymentToRow(p, Number(p.amount) * PLATFORM_CUT_PERCENT, "15% cut")
              : paymentToRow(p),
          );
      case "mentor_share":
        return allEarnings.map(earningToRow);
      case "mentor_owed":
        return pendingPayouts.map(earningToRow);
      case "mentor_paid":
        return paidPayouts.map(earningToRow);
      default:
        return [];
    }
  }, [view, approved, pending, allEarnings, pendingPayouts, paidPayouts, lang, markPaid]);

  const activeCard = cards.find((c) => c.key === view)!;
  const isLoading = view === "mentor_share" || view === "mentor_owed" || view === "mentor_paid"
    ? loadingEarnings
    : loadingPayments;

  // Reconciliation note
  const sum = (rows: { amount: number }[]) => rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const reconciles = Math.round(sum(mentorOwedRows) + sum(mentorPaidRows)) === Math.round(sum(mentorShareRows));

  return (
    <div className={hideHeader ? "" : "min-h-screen bg-background pb-24"}>
      {!hideHeader && <PageHeader title={lang === "my" ? "ငွေကြေး စီမံခန့်ခွဲမှု" : "Platform Finances"} showBack />}
      <div className={hideHeader ? "" : "px-5"}>
        {/* INCOMING */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {lang === "my" ? "ဝင်ငွေ" : "Incoming"}
        </p>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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

        {/* OUTGOING */}
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {lang === "my" ? "Mentor ပေးချေမှု" : "Owed to Mentors"}
          </p>
          {!reconciles && (
            <span className="text-[10px] text-warning">
              {lang === "my" ? "ကိန်းဂဏန်း မညီသေး" : "Totals don’t reconcile"}
            </span>
          )}
        </div>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {cards.filter((c) => c.group === "out").map((c) => (
            <CardButton key={c.key} card={c} active={view === c.key} onClick={() => setView(c.key)} lang={lang} />
          ))}
        </div>

        {/* Reconciliation summary */}
        <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-foreground">
              {lang === "my" ? "စစ်ဆေးခြင်း" : "Reconciliation"}
            </span>
            <span>Gross = {formatTotals(grossRows, lang)}</span>
            <span>·</span>
            <span>Net Platform + Mentor Share ≈ Gross (drift = credit-funded sessions)</span>
            <span>·</span>
            <span className={reconciles ? "text-emerald" : "text-warning"}>
              Owed + Paid = {formatMoney(sum(mentorOwedRows) + sum(mentorPaidRows), "MMK", lang)} ↔ Share = {formatTotals(mentorShareRows, lang)}
            </span>
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
