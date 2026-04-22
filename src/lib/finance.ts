// Shared helpers for the finance/money screens.
// We deliberately do NOT convert across currencies — totals are shown
// per-currency to keep the books accurate.

export type Money = { amount: number; currency: string };

export function formatMoney(amount: number, currency: string, lang: "my" | "en" = "en") {
  const c = (currency || "USD").toUpperCase();
  if (c === "MMK") {
    return `${Math.round(amount).toLocaleString()} ${lang === "my" ? "ကျပ်" : "MMK"}`;
  }
  if (c === "USD") return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${c}`;
}

/** Aggregate a list of {amount, currency} into per-currency totals. */
export function sumByCurrency(rows: Money[]): Money[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r || !r.amount) continue;
    const c = (r.currency || "USD").toUpperCase();
    map.set(c, (map.get(c) || 0) + Number(r.amount));
  }
  return Array.from(map.entries()).map(([currency, amount]) => ({ currency, amount }));
}

export function formatTotals(rows: Money[], lang: "my" | "en" = "en"): string {
  const totals = sumByCurrency(rows);
  if (totals.length === 0) return formatMoney(0, "USD", lang);
  return totals.map((t) => formatMoney(t.amount, t.currency, lang)).join(" + ");
}

export const paymentTypeLabels: Record<string, { my: string; en: string }> = {
  subscription: { my: "ပရီမီယံ စာရင်းသွင်းခြင်း", en: "Premium Subscription" },
  employer_subscription: { my: "အလုပ်ရှင် အစီအစဉ်", en: "Employer Plan" },
  mentor_session: { my: "Mentor Session", en: "Mentor Session" },
  placement_fee: { my: "ခန့်အပ်ခ", en: "Placement Fee" },
};

export const paymentStatusLabels: Record<string, { my: string; en: string; tone: string }> = {
  pending: { my: "စစ်ဆေးနေသည်", en: "Pending", tone: "bg-warning/10 text-warning" },
  approved: { my: "အတည်ပြုပြီး", en: "Approved", tone: "bg-emerald/10 text-emerald" },
  rejected: { my: "ပယ်ချပြီး", en: "Rejected", tone: "bg-destructive/10 text-destructive" },
  revoked: { my: "ရုပ်သိမ်းပြီး", en: "Revoked", tone: "bg-destructive/10 text-destructive" },
};

export function shortRef(id: string | null | undefined): string {
  if (!id) return "";
  return `#${id.slice(0, 8).toUpperCase()}`;
}
