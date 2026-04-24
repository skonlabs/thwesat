import { create } from "zustand";

type Language = "my" | "en";

interface LanguageState {
  lang: Language;
  /** True once the user has explicitly chosen a language (toggle or login restore). */
  isExplicit: boolean;
  setLang: (lang: Language, explicit?: boolean) => void;
  toggleLang: () => void;
}

const stored = localStorage.getItem("thwesat_lang") as Language | null;
const explicitFlag = localStorage.getItem("thwesat_lang_explicit") === "1";

export const useLanguage = create<LanguageState>((set) => ({
  lang: stored || "en",
  isExplicit: explicitFlag,
  setLang: (lang, explicit = true) => {
    localStorage.setItem("thwesat_lang", lang);
    if (explicit) localStorage.setItem("thwesat_lang_explicit", "1");
    set({ lang, isExplicit: explicit || explicitFlag });
  },
  toggleLang: () =>
    set((state) => {
      const next = state.lang === "my" ? "en" : "my";
      localStorage.setItem("thwesat_lang", next);
      localStorage.setItem("thwesat_lang_explicit", "1");
      return { lang: next, isExplicit: true };
    }),
}));

// Translation helper
type Bilingual = { my: string; en: string };

export function t(texts: Bilingual, lang: Language): string {
  return texts[lang];
}
