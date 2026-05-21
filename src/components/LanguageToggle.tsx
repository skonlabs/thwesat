import { useLanguage } from "@/hooks/use-language";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();
  // Show the flag/label of the language you'll switch TO
  const nextFlag = lang === "my" ? "🇬🇧" : "🇲🇲";
  const nextLabel = lang === "my" ? "EN" : "မြန်မာ";

  return (
    <button
      onClick={toggleLang}
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-current/20 px-2.5 font-semibold text-current transition-colors active:bg-current/10"
      aria-label={lang === "my" ? "ဘာသာစကား ပြောင်းရန်" : "Toggle language"}
    >
      <span className="text-base leading-none" aria-hidden>{nextFlag}</span>
      <span
        className={lang === "my" ? "text-sm" : "text-[11px] leading-[1.8] inline-block"}
        style={lang === "my" ? undefined : { fontFamily: "'Padauk', 'Myanmar Text', sans-serif" }}
      >
        {nextLabel}
      </span>
    </button>
  );
};

export default LanguageToggle;
