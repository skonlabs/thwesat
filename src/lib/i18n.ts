// Bilingual fallback helper. Always returns a non-empty string when possible.
// Use everywhere a record has both `field` and `field_my` columns.
export function pickLocalized(en: string | null | undefined, my: string | null | undefined, lang: "my" | "en"): string {
  if (lang === "my") return (my && my.trim()) ? my : (en || "");
  return (en && en.trim()) ? en : (my || "");
}
