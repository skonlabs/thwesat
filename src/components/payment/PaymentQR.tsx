import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/hooks/use-language";

interface PaymentQRProps {
  /** Optional pre-rendered QR image URL provided by admin (e.g. KBZPay merchant QR). */
  qrUrl?: string;
  /** Fallback string encoded as a generated QR (typically phone number). */
  value?: string;
  label?: string;
  size?: number;
}

const PaymentQR = ({ qrUrl, value, label, size = 144 }: PaymentQRProps) => {
  const { lang } = useLanguage();
  if (!qrUrl && !value) return null;

  const caption =
    label ?? (lang === "my" ? "QR ကို ဖတ်၍ ပေးချေနိုင်ပါသည်" : "Scan QR to pay");

  return (
    <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
      <div className="rounded-lg bg-white p-2">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Payment QR"
            width={size}
            height={size}
            className="object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          <QRCodeSVG value={value!} size={size} level="M" includeMargin={false} />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">{caption}</p>
    </div>
  );
};

export default PaymentQR;
