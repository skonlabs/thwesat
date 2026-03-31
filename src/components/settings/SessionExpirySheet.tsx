import { Check, Clock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface SessionExpirySheetProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { id: "1h", label: { my: "၁ နာရီ", en: "1 hour" }, desc: { my: "အလုံခြုံဆုံး - မကြာခဏ Login ပြန်ဝင်ရန် လိုပါမည်", en: "Most secure — requires frequent re-login" } },
  { id: "24h", label: { my: "၂၄ နာရီ", en: "24 hours" }, desc: { my: "အကြံပြုထားသော ပုံမှန်အချိန်", en: "Recommended default duration" } },
  { id: "7d", label: { my: "၇ ရက်", en: "7 days" }, desc: { my: "တစ်ပတ်တစ်ကြိမ် Login ပြန်ဝင်ရပါမည်", en: "Re-login required once a week" } },
  { id: "30d", label: { my: "၃၀ ရက်", en: "30 days" }, desc: { my: "အဆင်ပြေဆုံး - လုံခြုံရေး နည်းပါသည်", en: "Most convenient — less secure" } },
];

const SessionExpirySheet = ({ open, onClose, value, onChange }: SessionExpirySheetProps) => {
  const { lang } = useLanguage();

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "Session သက်တမ်း" : "Session Expiry"}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        {lang === "my"
          ? "Session ကုန်ဆုံးပြီးနောက် Login ပြန်ဝင်ရပါမည်"
          : "You'll need to sign in again after the session expires"}
      </p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              onChange(opt.id);
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              value === opt.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card active:bg-muted"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              value === opt.id ? "bg-primary/20" : "bg-muted"
            }`}>
              <Clock className={`h-5 w-5 ${value === opt.id ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{opt.label[lang]}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc[lang]}</p>
            </div>
            {value === opt.id && <Check className="h-5 w-5 text-primary" strokeWidth={1.5} />}
          </button>
        ))}
      </div>
    </SettingsBottomSheet>
  );
};

export default SessionExpirySheet;
