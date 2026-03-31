import { useLanguage } from "@/hooks/use-language";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 shadow-card transition-all active:scale-95"
      aria-label="Toggle language"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm leading-none">
        {lang === "my" ? "🇬🇧" : "🇲🇲"}
      </span>
      <span className="pr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
        {lang === "my" ? "EN" : "MM"}
      </span>
    </button>
  );
};

export default LanguageToggle;
