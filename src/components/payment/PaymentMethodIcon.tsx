import { cn } from "@/lib/utils";

interface Meta { label: string; bg: string; fg: string; mark: string }

const META: Record<string, Meta> = {
  kbzpay:  { label: "KBZPay",  bg: "bg-[#0A4DA1]", fg: "text-white", mark: "K" },
  cbpay:   { label: "CB Pay",  bg: "bg-[#7B1F2A]", fg: "text-white", mark: "CB" },
  wavepay: { label: "Wave Pay",bg: "bg-[#F47C20]", fg: "text-white", mark: "W" },
  ayapay:  { label: "AYA Pay", bg: "bg-[#E22531]", fg: "text-white", mark: "A" },
};

export function PaymentMethodIcon({ method, className }: { method: string; className?: string }) {
  const m = META[method];
  if (!m) return null;
  return (
    <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-tight", m.bg, m.fg, className)}>
      {m.mark}
    </span>
  );
}

export function PaymentMethodChip({ method, selected, onClick, type }: { method: string; selected: boolean; onClick: () => void; type?: "button" }) {
  const m = META[method];
  if (!m) return null;
  return (
    <button
      type={type || "button"}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={m.label}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected ? "border-emerald bg-emerald/10 text-emerald" : "border-border bg-card text-muted-foreground",
      )}
    >
      <PaymentMethodIcon method={method} />
      <span>{m.label}</span>
    </button>
  );
}
