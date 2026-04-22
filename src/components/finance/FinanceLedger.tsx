import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, RotateCcw, DollarSign, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { formatMoney, formatTotals, paymentStatusLabels, type Money } from "@/lib/finance";

type StatusKey = "pending" | "approved" | "rejected" | "revoked" | string;

const statusIcons: Record<string, LucideIcon> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  revoked: RotateCcw,
};

export type LedgerRow = {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  currency: string;
  status: StatusKey;
  date: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
};

interface FinanceLedgerProps {
  totals: { label: { my: string; en: string }; rows: Money[]; tone?: string }[];
  rows: LedgerRow[];
  isLoading?: boolean;
  emptyText?: { my: string; en: string };
}

export default function FinanceLedger({ totals, rows, isLoading, emptyText }: FinanceLedgerProps) {
  const { lang } = useLanguage();

  return (
    <div>
      {/* Totals strip */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {totals.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`rounded-xl border border-border bg-card p-3.5 ${t.tone || ""}`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? t.label.my : t.label.en}
            </p>
            <p className="mt-1 text-base font-bold text-foreground">{formatTotals(t.rows, lang)}</p>
          </motion.div>
        ))}
      </div>

      {/* Ledger */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-12 text-center">
          <DollarSign className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            {lang === "my"
              ? emptyText?.my || "မှတ်တမ်း မရှိသေးပါ"
              : emptyText?.en || "No records yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const sc = paymentStatusLabels[r.status] || paymentStatusLabels.pending;
            const Icon = statusIcons[r.status] || Clock;
            const Wrapper: any = r.onClick ? motion.button : motion.div;
            return (
              <Wrapper
                key={r.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={r.onClick}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left active:bg-muted/30"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${sc.tone}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                  {r.subtitle && (
                    <p className="truncate text-[10px] text-muted-foreground">{r.subtitle}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatMoney(r.amount, r.currency, lang)}</p>
                  <p className={`text-[10px] font-medium ${sc.tone.split(" ")[1]}`}>
                    {lang === "my" ? sc.my : sc.en}
                  </p>
                  {r.trailing}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
