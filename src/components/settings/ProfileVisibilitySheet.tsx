import { Check, Users, Globe, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface ProfileVisibilitySheetProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
}

const options = [
  {
    id: "members",
    icon: Users,
    label: { my: "အဖွဲ့ဝင်များသာ", en: "Members Only" },
    desc: { my: "ThweSat အဖွဲ့ဝင်များသာ သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်", en: "Only registered ThweSat members can see your profile" },
  },
  {
    id: "public",
    icon: Globe,
    label: { my: "အားလုံးမြင်နိုင်", en: "Public" },
    desc: { my: "မည်သူမဆို သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်", en: "Anyone on the internet can see your profile" },
  },
  {
    id: "private",
    icon: Lock,
    label: { my: "ကိုယ်တိုင်သာ", en: "Private" },
    desc: { my: "သင်သာလျှင် သင့်ပရိုဖိုင်ကို မြင်နိုင်ပါသည်", en: "Only you can see your profile" },
  },
];

const ProfileVisibilitySheet = ({ open, onClose, value, onChange }: ProfileVisibilitySheetProps) => {
  const { lang } = useLanguage();

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "ပရိုဖိုင် မြင်နိုင်မှု" : "Profile Visibility"}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        {lang === "my"
          ? "သင့်ပရိုဖိုင်ကို မည်သူမြင်နိုင်သည်ကို ရွေးချယ်ပါ"
          : "Choose who can see your profile information"}
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
              <opt.icon className={`h-5 w-5 ${value === opt.id ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
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

export default ProfileVisibilitySheet;
