// Payment methods supported across the platform.
// All flows (employer placement fees, wallet top-ups, mentor sessions) use
// the same set of Myanmar mobile-money providers with manual proof verification.
export const SUPPORTED_PAYMENT_METHODS = ["kbzpay", "cbpay", "wavepay", "ayapay"] as const;
export type SupportedPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];

// Backwards-compat aliases (kept so existing imports keep working).
export const SUPPORTED_JOB_PAYMENT_METHODS = SUPPORTED_PAYMENT_METHODS;
export type SupportedJobPaymentMethod = SupportedPaymentMethod;

export const platformPaymentMethodLabels: Record<string, string> = {
  kbzpay: "KBZPay",
  cbpay: "CB Pay",
  wavepay: "Wave Pay",
  ayapay: "AYA Pay",
};

export function sanitizeJobPaymentMethods(methods: string[] | null | undefined): SupportedPaymentMethod[] {
  const supported = new Set<string>(SUPPORTED_PAYMENT_METHODS);
  return Array.from(new Set((methods || []).filter((m) => supported.has(m)))) as SupportedPaymentMethod[];
}

export function getPlatformPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return platformPaymentMethodLabels[method] || "—";
}
