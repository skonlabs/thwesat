export type JobCategoryOption = {
  value: string;
  label: { en: string; my: string };
};

// Comprehensive preset list — users can also enter a custom category.
export const JOB_CATEGORY_PRESETS: JobCategoryOption[] = [
  { value: "tech", label: { en: "Tech / Software", my: "နည်းပညာ" } },
  { value: "design", label: { en: "Design", my: "ဒီဇိုင်း" } },
  { value: "pm", label: { en: "Product / Project Management", my: "စီမံခန့်ခွဲမှု" } },
  { value: "marketing", label: { en: "Marketing", my: "မားကတ်တင်း" } },
  { value: "sales", label: { en: "Sales / Business Dev", my: "အရောင်း" } },
  { value: "customer_support", label: { en: "Customer Support", my: "ဖောက်သည် ဝန်ဆောင်မှု" } },
  { value: "operations", label: { en: "Operations / Admin", my: "လုပ်ငန်းလည်ပတ်မှု" } },
  { value: "finance", label: { en: "Finance / Accounting", my: "ငွေကြေး" } },
  { value: "hr", label: { en: "HR / Recruiting", my: "လူ့စွမ်းအား အရင်းအမြစ်" } },
  { value: "legal", label: { en: "Legal", my: "ဥပဒေ" } },
  { value: "translation", label: { en: "Translation / Content", my: "ဘာသာပြန်" } },
  { value: "education", label: { en: "Education / Teaching", my: "ပညာရေး" } },
  { value: "healthcare", label: { en: "Healthcare", my: "ကျန်းမာရေး" } },
  { value: "hospitality", label: { en: "Hospitality / F&B", my: "ဧည့်ဝန်ဆောင်မှု" } },
  { value: "logistics", label: { en: "Logistics / Supply Chain", my: "ထောက်ပံ့ပို့ဆောင်ရေး" } },
  { value: "construction", label: { en: "Construction / Trades", my: "ဆောက်လုပ်ရေး" } },
  { value: "manufacturing", label: { en: "Manufacturing", my: "ထုတ်လုပ်မှု" } },
  { value: "ngo", label: { en: "NGO / Non-profit", my: "အကျိုးပြု အဖွဲ့အစည်း" } },
  { value: "data", label: { en: "Data / Analytics", my: "ဒေတာ" } },
  { value: "media", label: { en: "Media / Creative", my: "မီဒီယာ" } },
  { value: "other", label: { en: "Other", my: "အခြား" } },
];

export const getCategoryLabel = (value: string | null | undefined, lang: "en" | "my"): string => {
  if (!value) return "";
  const preset = JOB_CATEGORY_PRESETS.find((c) => c.value === value);
  if (preset) return lang === "my" ? preset.label.my : preset.label.en;
  return value;
};
