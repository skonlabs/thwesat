export interface TranslateLanguage {
  code: string;
  label: string;
  flag: string;
}

export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { code: "my", label: "မြန်မာ (Burmese)", flag: "🇲🇲" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "th", label: "ไทย (Thai)", flag: "🇹🇭" },
  { code: "zh-CN", label: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "ja", label: "日本語 (Japanese)", flag: "🇯🇵" },
  { code: "ko", label: "한국어 (Korean)", flag: "🇰🇷" },
  { code: "ms", label: "Bahasa Melayu (Malay)", flag: "🇲🇾" },
  { code: "vi", label: "Tiếng Việt (Vietnamese)", flag: "🇻🇳" },
];
