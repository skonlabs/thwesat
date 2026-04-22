// Unified currency formatting helper used across jobs, mentors, plans, payments.
// MMK is rounded to nearest 1000 (project rule from memory).
export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined, lang: "my" | "en" = "en"): string {
  if (amount == null || isNaN(amount)) return lang === "my" ? "ညှိနှိုင်း" : "Negotiable";
  const cur = (currency || "USD").toUpperCase();
  if (cur === "MMK") {
    const rounded = Math.round(amount / 1000) * 1000;
    return `${rounded.toLocaleString()} ${lang === "my" ? "ကျပ်" : "MMK"}`;
  }
  if (cur === "USD") return `$${amount.toLocaleString()}`;
  if (cur === "THB") return `฿${amount.toLocaleString()}`;
  if (cur === "SGD") return `S$${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${cur}`;
}

export function formatCurrencyRange(min: number | null | undefined, max: number | null | undefined, currency: string | null | undefined, lang: "my" | "en" = "en", per?: "mo" | "hr"): string {
  const suffix = per ? `/${per === "mo" ? (lang === "my" ? "လ" : "mo") : (lang === "my" ? "နာရီ" : "hr")}` : "";
  if (!min && !max) return lang === "my" ? "ညှိနှိုင်းနိုင်" : "Negotiable";
  if (min && max) return `${formatCurrency(min, currency, lang)}–${formatCurrency(max, currency, lang)}${suffix}`;
  if (min) return `${formatCurrency(min, currency, lang)}+${suffix}`;
  return `${lang === "my" ? "အများဆုံး" : "Up to"} ${formatCurrency(max!, currency, lang)}${suffix}`;
}
