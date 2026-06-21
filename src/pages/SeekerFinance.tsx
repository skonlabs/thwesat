import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/PageHeader";
import FinanceLedger from "@/components/finance/FinanceLedger";
import FinanceFilters, { applyFinanceFilters, type StatusFilter } from "@/components/finance/FinanceFilters";
import { paymentTypeLabels, shortRef } from "@/lib/finance";
import { useUserFinance } from "@/hooks/use-user-finance";

const SeekerFinance = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [currency, setCurrency] = useState<string>("all");

  const { data: rows, isLoading } = useUserFinance(user?.id);
  const all = rows || [];
  const approved = all.filter((p) => p.status === "approved");
  const pendingApproval = all.filter((p) => p.status === "pending" && !!p.proof_url);
  const pending = all.filter((p) => p.status === "pending" && !p.proof_url);
  const filtered = useMemo(() => applyFinanceFilters(all, status, currency), [all, status, currency]);
  const currencies = useMemo(() => all.map((p) => p.currency || "MMK"), [all]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title={lang === "my" ? "ငွေကြေး မှတ်တမ်း" : "My Finances"} showBack />
      <div className="px-5">
        <FinanceLedger
          isLoading={isLoading}
          totals={[
            {
              label: { my: "ပေးချေပြီး", en: "Paid Out" },
              rows: approved.map((p) => ({ amount: p.amount, currency: p.currency })),
              tone: "border-emerald/30",
            },
            {
              label: { my: "အတည်ပြုရန် စောင့်ဆိုင်း", en: "Pending Approval" },
              rows: pendingApproval.map((p) => ({ amount: p.amount, currency: p.currency })),
              tone: "border-warning/30",
            },
            {
              label: { my: "ပေးချေရန်", en: "Pending" },
              rows: pending.map((p) => ({ amount: p.amount, currency: p.currency })),
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
              ? (p.display_label?.my || paymentTypeLabels[p.payment_type]?.my || p.payment_type)
              : (p.display_label?.en || paymentTypeLabels[p.payment_type]?.en || p.payment_type),
            subtitle: `${p.payment_method?.toUpperCase?.() || ""} · ${shortRef(p.id)}`,
            amount: p.amount,
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
