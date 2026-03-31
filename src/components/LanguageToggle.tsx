import { useLanguage } from "@/hooks/use-language";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all active:scale-95 hover:shadow-md"
      aria-label="Toggle language"
    >
      <span className="text-sm leading-none">{lang === "my" ? "🇬🇧" : "🇲🇲"}</span>
      <span className="leading-none">{lang === "my" ? "EN" : "မြန်မာ"}</span>
    </button>
  );
};

export default LanguageToggle;
