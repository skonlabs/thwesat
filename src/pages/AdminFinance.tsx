import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { applyFinanceFilters, type StatusFilter } from "@/components/finance/FinanceFilters";
import { Button } from "@/components/ui/button";
import { paymentTypeLabels, shortRef, formatTotals } from "@/lib/finance";

type Tab = "revenue" | "payouts";

const AdminFinance = () => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("revenue");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-finance-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
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
        .limit(500);
      return data || [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mentor_earnings")
        .update({ status: "paid", paid_out_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-finance-earnings"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to mark paid"),
  });

  const allPayments = payments || [];
  const approved = allPayments.filter((p) => p.status === "approved");
  const pending = allPayments.filter((p) => p.status === "pending");

  const platformRevenueRows = approved.flatMap((p) => {
    if (p.payment_type === "mentor_session") {
      return [{ amount: Number(p.amount) * 0.15, currency: p.currency }];
    }
    return [{ amount: Number(p.amount), currency: p.currency }];
  });

  const allEarnings = earnings || [];
  const pendingPayouts = allEarnings.filter((e) => e.status === "pending" && !e.paid_out_at);
  const paidOutTotal = allEarnings.filter((e) => e.status === "paid" || e.paid_out_at);

  // Filtering
  const paymentCurrencies = useMemo(() => allPayments.map((p) => p.currency || "USD"), [allPayments]);
  const earningsCurrencies = useMemo(() => allEarnings.map((e) => e.currency || "USD"), [allEarnings]);
  const filteredPayments = useMemo(
    () => applyFinanceFilters(allPayments, status, currency),
    [allPayments, status, currency],
  );
  const filteredEarnings = useMemo(() => {
    return allEarnings.filter((e) => {
      const isPaid = e.status === "paid" || !!e.paid_out_at;
      const effective = isPaid ? "approved" : "pending";
      if (status !== "all" && effective !== status) return false;
      if (currency !== "all" && (e.currency || "USD").toUpperCase() !== currency) return false;
      return true;
    });
  }, [allEarnings, status, currency]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေကြေး စီမံခန့်ခွဲမှု" : "Platform Finances"} showBack />
      <div className="px-5">
        {/* Top totals */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald/30 bg-card p-3.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "Platform ဝင်ငွေ" : "Platform Revenue"}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">{formatTotals(platformRevenueRows, lang)}</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-card p-3.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "စစ်ဆေးရန်" : "Pending Review"}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatTotals(pending.map((p) => ({ amount: Number(p.amount), currency: p.currency })), lang)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "Mentor ပေးချေပြီး" : "Mentor Paid Out"}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatTotals(paidOutTotal.map((e) => ({ amount: Number(e.amount), currency: e.currency })), lang)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "Mentor ပေးရန်" : "Mentor Owed"}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatTotals(pendingPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency })), lang)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(["revenue", "payouts"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatus("all"); setCurrency("all"); }}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {t === "revenue"
                ? (lang === "my" ? "ဝင်ငွေ" : "Revenue")
                : (lang === "my" ? "Mentor Payouts" : "Mentor Payouts")}
            </button>
          ))}
        </div>

        <FinanceFilters
          status={status}
          onStatusChange={setStatus}
          currency={currency}
          onCurrencyChange={setCurrency}
          availableCurrencies={tab === "revenue" ? paymentCurrencies : earningsCurrencies}
        />

        {tab === "revenue" ? (
          <FinanceLedger
            isLoading={loadingPayments}
            totals={[
              {
                label: { my: "ပရီမီယံ", en: "Premium" },
                rows: approved.filter((p) => p.payment_type === "subscription").map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              },
              {
                label: { my: "အလုပ်ရှင်", en: "Employer Plans" },
                rows: approved.filter((p) => p.payment_type === "employer_subscription").map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              },
              {
                label: { my: "ခန့်အပ်ခ", en: "Placement Fees" },
                rows: approved.filter((p) => p.payment_type === "placement_fee").map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              },
              {
                label: { my: "Mentor (ပလက်ဖောင်း ၁၅%)", en: "Mentor (15% cut)" },
                rows: approved.filter((p) => p.payment_type === "mentor_session").map((p) => ({ amount: Number(p.amount) * 0.15, currency: p.currency })),
              },
            ]}
            rows={filteredPayments.map((p) => ({
              id: p.id,
              title: lang === "my" ? paymentTypeLabels[p.payment_type]?.my || p.payment_type : paymentTypeLabels[p.payment_type]?.en || p.payment_type,
              subtitle: `${p.payment_method?.toUpperCase?.() || ""} · ${shortRef(p.id)}`,
              amount: Number(p.amount),
              currency: p.currency,
              status: p.status,
              date: p.created_at,
            }))}
            emptyText={{ my: "ဝင်ငွေ မှတ်တမ်း မရှိသေးပါ", en: "No revenue matches these filters" }}
          />
        ) : (
          <FinanceLedger
            isLoading={loadingEarnings}
            totals={[
              {
                label: { my: "ပေးရန်", en: "Owed to Mentors" },
                rows: pendingPayouts.map((e) => ({ amount: Number(e.amount), currency: e.currency })),
                tone: "border-warning/30",
              },
              {
                label: { my: "ပေးချေပြီး", en: "Paid Out" },
                rows: paidOutTotal.map((e) => ({ amount: Number(e.amount), currency: e.currency })),
                tone: "border-emerald/30",
              },
            ]}
            rows={filteredEarnings.map((e) => ({
              id: e.id,
              title: lang === "my" ? "Session ဝင်ငွေ" : "Session Earning",
              subtitle: `${shortRef(e.mentor_id)} · ${shortRef(e.booking_id || e.id)}`,
              amount: Number(e.amount),
              currency: e.currency,
              status: (e.status === "paid" || e.paid_out_at) ? "approved" : "pending",
              date: e.created_at,
              trailing: (e.status === "pending" && !e.paid_out_at) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 h-6 rounded-full px-2 text-[10px]"
                  disabled={markPaid.isPending}
                  onClick={(ev: any) => { ev.stopPropagation(); markPaid.mutate(e.id); }}
                >
                  <Check className="mr-1 h-3 w-3" />
                  {lang === "my" ? "ပေးချေပြီး" : "Mark Paid"}
                </Button>
              ) : null,
            }))}
            emptyText={{ my: "Mentor ဝင်ငွေ မရှိသေးပါ", en: "No mentor earnings match these filters" }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminFinance;
