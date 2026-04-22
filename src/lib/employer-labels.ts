// Unified EN/MY labels for employer-facing screens.
// Use these everywhere instead of inline strings to avoid drift.

export type Lang = "my" | "en";

export const employerLabels = {
  job: { my: "အလုပ်", en: "Job" },
  jobSingular: { my: "အလုပ်ခေါ်စာ", en: "Job Listing" },
  listings: { my: "အလုပ်ခေါ်စာများ", en: "Job Listings" },
  application: { my: "လျှောက်လွှာ", en: "Application" },
  applications: { my: "လျှောက်ထားသူများ", en: "Applications" },
  applicant: { my: "လျှောက်ထားသူ", en: "Applicant" },
  placement: { my: "ခန့်အပ်မှု", en: "Placement" },
  placements: { my: "ခန့်အပ်ပြီးသူများ", en: "Placements" },
  placementFee: { my: "ခန့်အပ်ခ", en: "Placement Fee" },
  featured: { my: "ထူးခြား", en: "Featured" },
  applicationMethod: { my: "လျှောက်ထားနည်း", en: "Application Method" },
  filteredByJob: { my: "အလုပ်အလိုက်", en: "Filtered by job" },
  switchJob: { my: "အလုပ်ပြောင်းရန်", en: "Switch listing" },
  allJobs: { my: "အလုပ်အားလုံး", en: "All listings" },
  postJob: { my: "အလုပ်ခေါ်စာ တင်ရန်", en: "Post a Job" },
  editJob: { my: "အလုပ် ပြင်ဆင်ရန်", en: "Edit Job" },
  noApplications: { my: "လျှောက်ထားသူ မရှိသေးပါ", en: "No applications yet" },
  noPlacements: { my: "ခန့်အပ်ပြီးသူ မရှိသေးပါ", en: "No placements yet" },
  noListings: { my: "အလုပ်ခေါ်စာ မရှိသေးပါ", en: "No job listings yet" },
} as const;

export const t = (lang: Lang, key: keyof typeof employerLabels) => employerLabels[key][lang];

export const applicationMethodOptions = [
  { value: "platform", label: { my: "ThweSat မှ", en: "Via Platform" }, icon: "📩" },
  { value: "external", label: { my: "ပြင်ပလင့်ခ်", en: "External URL" }, icon: "🔗" },
  { value: "email", label: { my: "အီးမေးလ်", en: "Via Email" }, icon: "✉️" },
] as const;

export const getApplicationMethodLabel = (method: string | null | undefined, lang: Lang) => {
  const m = applicationMethodOptions.find(o => o.value === method) || applicationMethodOptions[0];
  return { label: m.label[lang], icon: m.icon };
};

// URL validator used by EmployerEditJob external URL input
export const isValidUrl = (value: string): boolean => {
  if (!value || !value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
