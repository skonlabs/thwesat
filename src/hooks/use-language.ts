import { create } from "zustand";

type Language = "my" | "en";

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const useLanguage = create<LanguageState>((set) => ({
  lang: (localStorage.getItem("thwesone_lang") as Language) || "en",
  setLang: (lang) => {
    localStorage.setItem("thwesone_lang", lang);
    set({ lang });
  },
  toggleLang: () =>
    set((state) => {
      const next = state.lang === "my" ? "en" : "my";
      localStorage.setItem("thwesone_lang", next);
      return { lang: next };
    }),
}));

// Translation helper
type Bilingual = { my: string; en: string };

export function t(texts: Bilingual, lang: Language): string {
  return texts[lang];
}
