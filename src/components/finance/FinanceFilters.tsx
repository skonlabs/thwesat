import { useLanguage } from "@/hooks/use-language";

export type StatusFilter = "all" | "approved" | "pending";

interface FinanceFiltersProps {
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  currency: string; // "all" | "USD" | "MMK" | ...
  onCurrencyChange: (c: string) => void;
  availableCurrencies: string[];
}

const STATUS_OPTIONS: { key: StatusFilter; my: string; en: string }[] = [
  { key: "all", my: "အားလုံး", en: "All" },
  { key: "approved", my: "ပေးချေပြီး", en: "Paid" },
  { key: "pending", my: "စစ်ဆေးနေသည်", en: "Pending" },
];

export default function FinanceFilters({
  status,
  onStatusChange,
  currency,
  onCurrencyChange,
  availableCurrencies,
}: FinanceFiltersProps) {
  const { lang } = useLanguage();
  const currencies = ["all", ...Array.from(new Set(availableCurrencies.map((c) => c.toUpperCase())))];

  return (
    <div className="mb-4 -mx-1 flex flex-wrap items-center gap-1.5 px-1">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onStatusChange(opt.key)}
          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            status === opt.key
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
          }`}
        >
          {lang === "my" ? opt.my : opt.en}
        </button>
      ))}
      {currencies.length > 1 && (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          {currencies.map((c) => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors ${
                currency === c
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {c === "all" ? (lang === "my" ? "ငွေကြေးအားလုံး" : "All ccy") : c}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Apply status + currency filters to a list of payment-like rows. */
export function applyFinanceFilters<T extends { status?: string; currency?: string }>(
  rows: T[],
  status: StatusFilter,
  currency: string,
): T[] {
  return rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (currency !== "all" && (r.currency || "USD").toUpperCase() !== currency) return false;
    return true;
  });
}
