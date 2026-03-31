import { useLanguage } from "@/hooks/use-language";
import { Globe } from "lucide-react";

const LanguageToggle = ({ variant = "pill" }: { variant?: "pill" | "icon" | "flag" }) => {
  const { lang, toggleLang } = useLanguage();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleLang}
        className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-card transition-all active:scale-95"
        aria-label="Toggle language"
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span>{lang === "my" ? "EN" : "မြ"}</span>
      </button>
    );
  }

  if (variant === "flag") {
    return (
      <button
        onClick={toggleLang}
        className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all active:scale-95"
        aria-label="Toggle language"
      >
        <span>{lang === "my" ? "🇬🇧 EN" : "🇲🇲 မြန်မာ"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-card transition-all active:scale-95"
      aria-label="Toggle language"
    >
      <Globe className="h-3.5 w-3.5 text-primary" />
      <span>{lang === "my" ? "English" : "မြန်မာ"}</span>
    </button>
  );
};

export default LanguageToggle;
