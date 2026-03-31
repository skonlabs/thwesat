import { Check, Type } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface FontEncodingSheetProps {
  open: boolean;
  onClose: () => void;
}

const FontEncodingSheet = ({ open, onClose }: FontEncodingSheetProps) => {
  const { lang } = useLanguage();

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "ဖောင့် Encoding" : "Font Encoding"}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Type className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Unicode</p>
            <p className="text-[11px] text-muted-foreground">
              {lang === "my" ? "လက်ရှိ အသုံးပြုနေသော Encoding" : "Currently active encoding"}
            </p>
          </div>
          <Check className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-semibold text-foreground">
            {lang === "my" ? "Unicode အကြောင်း" : "About Unicode"}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {lang === "my"
              ? "ThweSone သည် Unicode (UTF-8) Encoding ကိုသာ အသုံးပြုပါသည်။ ၎င်းသည် နိုင်ငံတကာ စံနှုန်းဖြစ်ပြီး မြန်မာ၊ အင်္ဂလိပ်နှင့် အခြားဘာသာစကားများကို မှန်ကန်စွာ ပြသပေးပါသည်။ Zawgyi Encoding ကို ပံ့ပိုးမပေးပါ။"
              : "ThweSone exclusively uses Unicode (UTF-8) encoding. This is the international standard that correctly displays Myanmar, English, and other languages. Zawgyi encoding is not supported."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-semibold text-foreground">
            {lang === "my" ? "Zawgyi သုံးနေပါသလား?" : "Using Zawgyi?"}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {lang === "my"
              ? "သင့်ဖုန်းတွင် Zawgyi အသုံးပြုနေပါက မြန်မာစာ ကြည့်ရာတွင် ပြဿနာ ရှိနိုင်ပါသည်။ ဖုန်း Settings > Language > Keyboard မှ Unicode keyboard သို့ ပြောင်းပါ။"
              : "If your device uses Zawgyi, Myanmar text may display incorrectly. Switch to a Unicode keyboard via your device Settings > Language > Keyboard."}
          </p>
        </div>
      </div>
    </SettingsBottomSheet>
  );
};

export default FontEncodingSheet;
