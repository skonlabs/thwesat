import { useLanguage } from "@/hooks/use-language";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="group flex h-9 items-center gap-1.5 rounded-xl bg-muted/80 pl-2 pr-3 text-xs font-semibold text-foreground transition-all hover:bg-primary/10 active:scale-95"
      aria-label="Toggle language"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-card text-[13px] leading-none shadow-sm">
        {lang === "my" ? "🇬🇧" : "🇲🇲"}
      </span>
      <span className="tracking-wide group-hover:text-primary">{lang === "my" ? "EN" : "မြ"}</span>
    </button>
  );
};

export default LanguageToggle;
