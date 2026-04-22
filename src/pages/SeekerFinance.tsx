import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { applyFinanceFilters, type StatusFilter } from "@/components/finance/FinanceFilters";
import { paymentTypeLabels, shortRef } from "@/lib/finance";

const SeekerFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["seeker-finance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const all = payments || [];
  const approved = all.filter((p) => p.status === "approved");
  const pending = all.filter((p) => p.status === "pending");
  const filtered = useMemo(() => applyFinanceFilters(all, status, currency), [all, status, currency]);
  const currencies = useMemo(() => all.map((p) => p.currency || "USD"), [all]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေကြေး မှတ်တမ်း" : "My Finances"} showBack />
      <div className="px-5">
        <FinanceLedger
          isLoading={isLoading}
          totals={[
            {
              label: { my: "ပေးချေပြီး", en: "Total Paid" },
              rows: approved.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
              tone: "border-emerald/30",
            },
            {
              label: { my: "စစ်ဆေးနေသည်", en: "Pending" },
              rows: pending.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
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
          rows={filtered.map((p) => ({
            id: p.id,
            title: lang === "my"
              ? paymentTypeLabels[p.payment_type]?.my || p.payment_type
              : paymentTypeLabels[p.payment_type]?.en || p.payment_type,
            subtitle: `${p.payment_method?.toUpperCase?.() || ""} · ${shortRef(p.id)}`,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            date: p.created_at,
            onClick: () => navigate("/payments/history"),
          }))}
          emptyText={{ my: "ငွေပေးချေမှု မှတ်တမ်း မရှိသေးပါ", en: "No payments match these filters" }}
        />
      </div>
    </div>
  );
};

export default SeekerFinance;
