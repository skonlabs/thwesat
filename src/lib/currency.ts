// Unified currency formatting helper used across jobs, mentors, plans, payments.
// MMK is rounded to the nearest 100 Ks (smallest denomination in circulation).
import { roundMmk } from "./finance";

export function formatCurrency(amount: number | null | undefined, _currency?: string | null, lang: "my" | "en" = "en"): string {
  if (amount == null || isNaN(amount)) return lang === "my" ? "ညှိနှိုင်း" : "Negotiable";
  return `${roundMmk(amount).toLocaleString()} Ks`;
}

export function formatCurrencyRange(min: number | null | undefined, max: number | null | undefined, currency: string | null | undefined, lang: "my" | "en" = "en", per?: "mo" | "hr"): string {
  const suffix = per ? `/${per === "mo" ? (lang === "my" ? "လ" : "mo") : (lang === "my" ? "နာရီ" : "hr")}` : "";
  if (!min && !max) return lang === "my" ? "ညှိနှိုင်းနိုင်" : "Negotiable";
  if (min && max) return `${formatCurrency(min, currency, lang)}–${formatCurrency(max, currency, lang)}${suffix}`;
  if (min) return `${formatCurrency(min, currency, lang)}+${suffix}`;
  return `${lang === "my" ? "အများဆုံး" : "Up to"} ${formatCurrency(max!, currency, lang)}${suffix}`;
}
