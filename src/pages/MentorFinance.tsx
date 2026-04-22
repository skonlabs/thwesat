import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { type StatusFilter } from "@/components/finance/FinanceFilters";
import { shortRef } from "@/lib/finance";

const MentorFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");

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
        <div className="mb-4 rounded-xl border border-border bg-accent/10 p-3">
          <p className="text-[11px] text-muted-foreground">
            {lang === "my"
              ? "Session တစ်ခုစီတွင် ၈၅% ဝင်ငွေအဖြစ် ရရှိပါသည်။ ပလက်ဖောင်းအား Admin မှ payout ထုတ်ပေးပါသည်။"
              : "You earn 85% of each paid session. Payouts are issued by an admin — no action required from you."}
          </p>
        </div>

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
