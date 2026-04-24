import { useLanguage } from "@/hooks/use-language";
import { Globe } from "lucide-react";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground transition-colors active:bg-muted"
      aria-label={lang === "my" ? "ဘာသာစကား ပြောင်းရန်" : "Toggle language"}
    >
      <Globe className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
      <span className={lang === "my" ? "" : "leading-relaxed"}>{lang === "my" ? "EN" : "မြန်မာ"}</span>
    </button>
  );
};

export default LanguageToggle;
