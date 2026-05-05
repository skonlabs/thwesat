export const SUPPORTED_JOB_PAYMENT_METHODS = ["Wise"] as const;

export type SupportedJobPaymentMethod = (typeof SUPPORTED_JOB_PAYMENT_METHODS)[number];

export function sanitizeJobPaymentMethods(methods: string[] | null | undefined): SupportedJobPaymentMethod[] {
  const supported = new Set<string>(SUPPORTED_JOB_PAYMENT_METHODS);
  return Array.from(new Set((methods || []).filter((method) => supported.has(method)))) as SupportedJobPaymentMethod[];
}

export const platformPaymentMethodLabels: Record<string, string> = {
  kbzpay: "KBZPay",
  cbpay: "CB Pay",
  wavepay: "Wave Pay",
  ayapay: "AYA Pay",
};

export function getPlatformPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return platformPaymentMethodLabels[method] || "—";
}