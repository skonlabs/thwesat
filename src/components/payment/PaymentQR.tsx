import { useLanguage } from "@/hooks/use-language";

interface PaymentQRProps {
  /** Admin-uploaded or admin-generated QR image URL. */
  qrUrl?: string;
  label?: string;
  size?: number;
}

/**
 * Renders the payment QR set by an admin. We deliberately do NOT generate a
 * QR from any publicly displayed field (e.g. phone number) — that would let
 * anyone reproduce the same code and impersonate the merchant. If no admin
 * QR is configured, we render nothing here so the on-screen account details
 * remain the source of truth.
 */
const PaymentQR = ({ qrUrl, label, size = 144 }: PaymentQRProps) => {
  const { lang } = useLanguage();
  if (!qrUrl) return null;

  const caption =
    label ?? (lang === "my" ? "QR ကို ဖတ်၍ ပေးချေနိုင်ပါသည်" : "Scan QR to pay");

  return (
    <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
      <div className="rounded-lg bg-white p-2">
        <img
          src={qrUrl}
          alt="Payment QR"
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{caption}</p>
    </div>
  );
};

export default PaymentQR;
