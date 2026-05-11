import { useLanguage } from "@/hooks/use-language";
import { Globe } from "lucide-react";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-current/20 px-2.5 font-semibold text-current transition-colors active:bg-current/10"
      aria-label={lang === "my" ? "ဘာသာစကား ပြောင်းရန်" : "Toggle language"}
    >
      <Globe className="h-4 w-4 shrink-0 text-current" strokeWidth={1.5} />
      <span className={lang === "my" ? "text-xs" : "text-sm leading-[1.8] inline-block"} style={lang === "my" ? undefined : { fontFamily: "'Padauk', 'Myanmar Text', sans-serif" }}>{lang === "my" ? "EN" : "မြန်မာ"}</span>
    </button>
  );
};

export default LanguageToggle;
