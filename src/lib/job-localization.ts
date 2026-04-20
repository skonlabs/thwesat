type Language = "my" | "en";

type SalaryLike = {
  salary_min?: number | null;
  salary_max?: number | null;
};

const titleMap: Record<string, string> = {
  "customer support specialist": "ဖောက်သည်ပံ့ပိုးမှု အထူးကျွမ်းကျင်သူ",
  "data entry operator": "ဒေတာထည့်သွင်းရေး အော်ပရေတာ",
  "ui/ux designer": "UI/UX ဒီဇိုင်နာ",
};

const locationMap: Record<string, string> = {
  remote: "အဝေးထိန်း",
  bangkok: "ဘန်ကောက်",
  "bangkok, th": "ဘန်ကောက်၊ ထိုင်း",
  "bangkok, thailand": "ဘန်ကောက်၊ ထိုင်း",
  singapore: "စင်ကာပူ",
  thailand: "ထိုင်း",
};

const categoryMap: Record<string, string> = {
  tech: "နည်းပညာ",
  design: "ဒီဇိုင်း",
  management: "စီမံခန့်ခွဲမှု",
  ngo: "အကျိုးပြု အဖွဲ့အစည်း",
  translation: "ဘာသာပြန်",
  finance: "ငွေကြေး",
};

const jobTypeMap: Record<string, string> = {
  full_time: "အချိန်ပြည့်",
  part_time: "အချိန်ပိုင်း",
  contract: "စာချုပ်",
  hybrid: "ရောစပ်",
  remote: "အဝေးထိန်း",
  remote_full: "အဝေးထိန်း အချိန်ပြည့်",
  remote_contract: "အဝေးထိန်း စာချုပ်",
  remote_partial: "အဝေးထိန်း အချိန်ပိုင်း",
  onsite: "ရုံးတွင်း",
  freelance: "လွတ်လပ်အလုပ်",
};

const jobTypeMapEn: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  hybrid: "Hybrid",
  remote: "Remote",
  remote_full: "Remote Full-time",
  remote_contract: "Remote Contract",
  remote_partial: "Remote Part-time",
  onsite: "On-site",
  freelance: "Freelance",
};

const tagMap: Record<string, string> = {
  english: "အင်္ဂလိပ်",
  "customer service": "ဖောက်သည်ဝန်ဆောင်မှု",
  communication: "ဆက်သွယ်ရေး",
  "problem solving": "ပြဿနာ ဖြေရှင်းမှု",
  "data entry": "ဒေတာထည့်သွင်းမှု",
  "ui design": "UI ဒီဇိုင်း",
  "ux research": "UX သုတေသန",
  prototyping: "ပရိုတိုটাইပ် ပြုလုပ်မှု",
  "design systems": "ဒီဇိုင်း စနစ်များ",
  translation: "ဘာသာပြန်",
  "graphic design": "ဂရပ်ဖစ် ဒီဇိုင်း",
  bookkeeping: "စာရင်းကိုင်ထိန်းသိမ်းမှု",
  accounting: "စာရင်းကိုင်",
};

const paymentMethodMap: Record<string, string> = {
  "bank transfer": "ဘဏ်လွှဲ",
  cash: "ငွေသား",
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeJobType(value: string): string {
  return normalize(value).replace(/[\s-]+/g, "_");
}

function translateFromMap(value: string | null | undefined, map: Record<string, string>, lang: Language, normalizer: (input: string) => string = normalize): string {
  if (!value) return "";
  if (lang !== "my") return value;
  return map[normalizer(value)] || value;
}

export function translateJobTitle(title: string, titleMy: string | null | undefined, lang: Language): string {
  if (lang !== "my") return title;
  return titleMy || translateFromMap(title, titleMap, lang);
}

export function translateJobLocation(location: string | null | undefined, lang: Language): string {
  if (!location) return lang === "my" ? "အဝေးထိန်း" : "Remote";
  return translateFromMap(location, locationMap, lang);
}

export function translateJobCategory(category: string | null | undefined, lang: Language): string {
  return category ? translateFromMap(category, categoryMap, lang) : "";
}

export function translateJobType(jobType: string | null | undefined, lang: Language): string {
  if (!jobType) return lang === "my" ? "အချိန်ပြည့်" : "Full-time";
  return translateFromMap(jobType, jobTypeMap, lang, normalizeJobType);
}

export function translateJobTags(tags: string[] | null | undefined, lang: Language): string[] {
  return (tags || []).map((tag) => translateFromMap(tag, tagMap, lang));
}

export function translatePaymentMethods(methods: string[] | null | undefined, lang: Language): string[] {
  return (methods || []).map((method) => translateFromMap(method, paymentMethodMap, lang));
}

export function formatJobSalary(job: SalaryLike, lang: Language): string {
  const min = job.salary_min;
  const max = job.salary_max;

  if (!min && !max) return lang === "my" ? "ညှိနှိုင်းနိုင်" : "Negotiable";

  const unit = lang === "my" ? "လ" : "mo";

  if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}/${unit}`;
  if (min) return `$${min.toLocaleString()}+/${unit}`;
  return `${lang === "my" ? "အများဆုံး" : "Up to"} $${max?.toLocaleString()}/${unit}`;
}