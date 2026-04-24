import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { type StatusFilter } from "@/components/finance/FinanceFilters";
import { shortRef } from "@/lib/finance";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const MentorFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");

  const { data: mentorProfileData } = useQuery({
    queryKey: ["mentor-profile-finance", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("mentor_profiles")
        .select("payment_methods")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: earnings, isLoading } = useQuery({
    queryKey: ["mentor-finance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("mentor_earnings")
        .select("*")
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const all = earnings || [];
  const pending = all.filter((e) => e.status === "pending" && !e.paid_out_at);
  const paidOut = all.filter((e) => e.status === "paid" || !!e.paid_out_at);
  const currencies = useMemo(() => all.map((e) => e.currency || "USD"), [all]);

  // mentor_profiles has no payment_methods column in the current schema.
  // Treat any mentor as having a payment method configured for now; replace
  // with a real check once the column exists.
  const hasPaymentMethod = true;

  const totalEarned = useMemo(() => all.reduce((sum, e) => sum + Number(e.amount || 0), 0), [all]);
  const totalPending = useMemo(() => pending.reduce((sum, e) => sum + Number(e.amount || 0), 0), [pending]);
  const totalPaid = useMemo(() => paidOut.reduce((sum, e) => sum + Number(e.amount || 0), 0), [paidOut]);

  // Map status → "approved"/"pending" buckets that match the filter contract.
  const filtered = useMemo(() => {
    return all.filter((e) => {
      const isPaid = e.status === "paid" || !!e.paid_out_at;
      const effective = isPaid ? "approved" : "pending";
      if (status !== "all" && effective !== status) return false;
      if (currency !== "all" && (e.currency || "USD").toUpperCase() !== currency) return false;
      return true;
    });
  }, [all, status, currency]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ဝင်ငွေ မှတ်တမ်း" : "Mentor Earnings"} showBack />
      <div className="px-5">
        {!hasPaymentMethod && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <AlertDescription className="flex items-center justify-between gap-3 text-sm">
              <span>
                {lang === "my"
                  ? "ပေးချေမှု ရယူနိုင်ရန် Settings တွင် payout method သတ်မှတ်ပါ။"
                  : "Set up your payout method in Settings to receive payouts."}
              </span>
              <Button variant="outline" size="sm" className="shrink-0 rounded-lg text-xs" onClick={() => navigate("/settings")}>
                {lang === "my" ? "Settings" : "Settings"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stat cards */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: lang === "my" ? "စုစုပေါင်း ဝင်ငွေ" : "Total Earned", value: `$${totalEarned.toFixed(2)}`, color: "text-foreground" },
            { label: lang === "my" ? "စောင့်ဆိုင်း" : "Pending", value: `$${totalPending.toFixed(2)}`, color: "text-amber-600 dark:text-amber-400" },
            { label: lang === "my" ? "ပေးချေပြီး" : "Total Paid", value: `$${totalPaid.toFixed(2)}`, color: "text-emerald-600 dark:text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={`text-base font-bold leading-tight ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-xl border border-border bg-accent/10 p-3">
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? "Session တစ်ခုစီတွင် ၈၅% ဝင်ငွေအဖြစ် ရရှိပါသည်။ ပလက်ဖောင်းအား Admin မှ payout ထုတ်ပေးပါသည်။"
              : "You earn 85% of each paid session. Payouts are issued by an admin — no action required from you."}
          </p>
        </div>

        <p className="mb-4 text-[11px] text-muted-foreground text-center">
          {lang === "my"
            ? "Payout များကို admin team မှ ၃-၅ လုပ်ငန်းရက်အတွင်း ဆောင်ရွက်ပေးပါသည်။"
            : "Payouts are processed by the admin team. Allow 3–5 business days."}
        </p>

        <FinanceLedger
          isLoading={isLoading}
          totals={[
            {
              label: { my: "ပေးချေပြီး", en: "Paid Out" },
              rows: paidOut.map((e) => ({ amount: Number(e.amount), currency: e.currency })),
              tone: "border-emerald/30",
            },
            {
              label: { my: "စောင့်ဆိုင်းနေသည်", en: "Pending Payout" },
              rows: pending.map((e) => ({ amount: Number(e.amount), currency: e.currency })),
              tone: "border-warning/30",
            },
          ]}
          rows={[]}
          emptyText={{ my: "", en: "" }}
        />

        <FinanceFilters
          status={status}
          onStatusChange={setStatus}
          currency={currency}
          onCurrencyChange={setCurrency}
          availableCurrencies={currencies}
        />

        <FinanceLedger
          isLoading={isLoading}
          totals={[]}
          rows={filtered.map((e) => ({
            id: e.id,
            title: lang === "my" ? "Session ဝင်ငွေ" : "Session Earning",
            subtitle: shortRef(e.booking_id || e.id),
            amount: Number(e.amount),
            currency: e.currency,
            status: e.status === "paid" || e.paid_out_at ? "approved" : "pending",
            date: e.created_at,
          }))}
          emptyText={{ my: "ဝင်ငွေ မှတ်တမ်း မရှိသေးပါ", en: "No earnings match these filters" }}
        />
      </div>
    </div>
  );
};

export default MentorFinance;
