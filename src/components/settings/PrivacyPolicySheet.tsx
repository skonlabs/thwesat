import { Shield } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface PrivacyPolicySheetProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: { my: "အချက်အလက် စုဆောင်းခြင်း", en: "Data Collection" },
    content: {
      my: "သင့်အကောင့် ဖန်တီးစဥ် ပေးထားသော အမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်နှင့် ပရိုဖိုင်အချက်အလက်များကို စုဆောင်းပါသည်။ အက်ပ် အသုံးပြုမှု ပုံစံများကိုလည်း ခွဲခြမ်းစိတ်ဖြာရန် စုဆောင်းပါသည်။",
      en: "We collect your name, email, phone number, and profile information provided during account creation. We also collect app usage patterns for analytics purposes.",
    },
  },
  {
    title: { my: "အချက်အလက် အသုံးပြုခြင်း", en: "How We Use Your Data" },
    content: {
      my: "သင့်အချက်အလက်များကို ဝန်ဆောင်မှု ပေးရန်၊ အကောင့် လုံခြုံမှု ထိန်းသိမ်းရန်နှင့် အတွေ့အကြုံ ပိုကောင်းအောင် လုပ်ဆောင်ရန် အသုံးပြုပါသည်။ တတိယပုဂ္ဂိုလ်များထံ ရောင်းချခြင်း လုံးဝ မပြုလုပ်ပါ။",
      en: "Your data is used to provide services, maintain account security, and improve your experience. We never sell your information to third parties.",
    },
  },
  {
    title: { my: "အချက်အလက် ဖျက်ခြင်း", en: "Data Deletion" },
    content: {
      my: "အချိန်မရွေး သင့်အကောင့်ကို ဖျက်နိုင်ပြီး ၂၄ နာရီအတွင်း ပြန်ရယူနိုင်ပါသည်။ ထိုအချိန်ကျော်ပါက အချက်အလက်အားလုံး အပြီးအပိုင် ဖျက်ပစ်ပါမည်။",
      en: "You can delete your account at any time with a 24-hour recovery window. After that period, all data is permanently removed.",
    },
  },
  {
    title: { my: "လုံခြုံရေး", en: "Security" },
    content: {
      my: "သင့်အချက်အလက်များကို encryption နည်းပညာဖြင့် ကာကွယ်ပါသည်။ စကားဝှက်များကို hashed ပုံစံဖြင့်သာ သိမ်းဆည်းပါသည်။",
      en: "Your data is protected using encryption technology. Passwords are stored in hashed format only.",
    },
  },
];

const PrivacyPolicySheet = ({ open, onClose }: PrivacyPolicySheetProps) => {
  const { lang } = useLanguage();

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "ကိုယ်ရေးကာကွယ်မှု မူဝါဒ" : "Privacy Policy"}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <Shield className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <p className="text-xs text-foreground">
            {lang === "my"
              ? "နောက်ဆုံးအပ်ဒိတ်: ၂၀၂၆ ခုနှစ် မတ်လ"
              : "Last updated: March 2026"}
          </p>
        </div>

        {sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold text-foreground">{section.title[lang]}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{section.content[lang]}</p>
          </div>
        ))}

        <p className="pt-2 text-center text-[10px] text-muted-foreground">
          {lang === "my"
            ? "မေးစရာရှိပါက support@thwesone.com သို့ ဆက်သွယ်ပါ"
            : "For questions, contact support@thwesone.com"}
        </p>
      </div>
    </SettingsBottomSheet>
  );
};

export default PrivacyPolicySheet;
