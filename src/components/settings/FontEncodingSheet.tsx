import { Check, Type } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import SettingsBottomSheet from "./SettingsBottomSheet";

interface FontEncodingSheetProps {
  open: boolean;
  onClose: () => void;
}

// All supported encodings are Unicode under the hood (we never store Zawgyi).
// The selector lets users pick a *render font* that pairs best with their
// device — Pyidaungsu and Noto Sans Myanmar are both Unicode-correct but ship
// with different glyph metrics. The choice is persisted in user_settings and
// applied via a `data-myanmar-font` attribute on <html> (see main.tsx).
const OPTIONS: { id: string; label: string; sample: string; note: { en: string; my: string } }[] = [
  { id: "system",     label: "System default", sample: "မင်္ဂလာပါ ThweSat", note: { en: "Whatever your device prefers.",            my: "သင့်စက်၏ မူရင်းဖောင့်" } },
  { id: "pyidaungsu", label: "Pyidaungsu",     sample: "မင်္ဂလာပါ ThweSat", note: { en: "Government-standard Myanmar Unicode font.",  my: "အစိုးရ စံသတ်မှတ်ထားသော ယူနီကုဒ်ဖောင့်" } },
  { id: "noto",       label: "Noto Sans Myanmar", sample: "မင်္ဂလာပါ ThweSat", note: { en: "Google's open-source Myanmar Unicode font.", my: "Google ထုတ် ယူနီကုဒ်ဖောင့်" } },
];

const FontEncodingSheet = ({ open, onClose }: FontEncodingSheetProps) => {
  const { lang } = useLanguage();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const current = settings?.font_encoding || "system";

  const select = (id: string) => {
    if (id === current) return;
    updateSettings.mutate({ font_encoding: id } as never);
    // Apply immediately (the global hydrator in main.tsx also re-applies on
    // settings refetch, but doing it here makes the swap feel instantaneous).
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-myanmar-font", id);
    }
  };

  return (
    <SettingsBottomSheet
      open={open}
      onClose={onClose}
      title={lang === "my" ? "ဖောင့် Encoding" : "Font Encoding"}
    >
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const active = opt.id === current;
          return (
            <button
              key={opt.id}
              onClick={() => select(opt.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                active ? "border-primary bg-primary/10" : "border-border bg-card active:bg-muted"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-primary/20" : "bg-muted"}`}>
                <Type className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                <p
                  className="mt-0.5 text-sm text-foreground/80"
                  style={{ fontFamily: opt.id === "pyidaungsu" ? "Pyidaungsu, system-ui" : opt.id === "noto" ? "'Noto Sans Myanmar', system-ui" : undefined }}
                >
                  {opt.sample}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{opt.note[lang]}</p>
              </div>
              {active && <Check className="h-5 w-5 text-primary" strokeWidth={1.5} />}
            </button>
          );
        })}

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-1 text-xs font-semibold text-foreground">
            {lang === "my" ? "Zawgyi သုံးနေပါသလား?" : "Using Zawgyi?"}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {lang === "my"
              ? "ThweSat သည် Unicode (UTF-8) ကိုသာ သိမ်းဆည်းပြသပါသည်။ စက်ပြင်ပ keyboard မှာ Unicode သို့ ပြောင်းပါ။"
              : "ThweSat stores and renders Myanmar text only as Unicode (UTF-8). If your device uses Zawgyi, switch to a Unicode keyboard in your OS settings."}
          </p>
        </div>
      </div>
    </SettingsBottomSheet>
  );
};

export default FontEncodingSheet;
