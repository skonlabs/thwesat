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
  // Custom value — present cleanly (snake_case → Title Case for English; raw for Burmese)
  if (lang === "my") return value;
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Resolve the canonical list of categories for a job, supporting both the
 * legacy single `category` field and the newer `categories` array.
 */
export const resolveJobCategories = (job: {
  category?: string | null;
  categories?: string[] | null;
}): string[] => {
  if (job.categories && job.categories.length > 0) {
    return job.categories.filter((c) => !!c && c.trim().length > 0);
  }
  if (job.category && job.category.trim().length > 0) return [job.category];
  return [];
};

// ---------------------------------------------------------------------------
// Typo-tolerant matching (Levenshtein distance + token overlap heuristic)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/**
 * Score how well a preset matches a search query.
 * Lower score = better match. Returns Infinity when the option should be hidden.
 */
function scoreOption(option: JobCategoryOption, queryLower: string, queryRaw: string): number {
  if (!queryLower) return 0;
  const candidates = [
    option.value.toLowerCase().replace(/_/g, " "),
    option.label.en.toLowerCase(),
  ];
  const burmese = option.label.my; // do not lowercase Burmese
  let best = Infinity;

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === queryLower) return -100; // perfect match wins
    if (candidate.startsWith(queryLower)) best = Math.min(best, -50);
    else if (candidate.includes(queryLower)) best = Math.min(best, -20);

    // Token-level prefix match (e.g. "mark" → "marketing")
    for (const token of candidate.split(/[^a-z0-9]+/)) {
      if (!token) continue;
      if (token === queryLower) best = Math.min(best, -40);
      else if (token.startsWith(queryLower)) best = Math.min(best, -25);
    }

    // Fuzzy distance for typo tolerance (only when query is reasonably long)
    if (queryLower.length >= 3) {
      const dist = levenshtein(queryLower, candidate);
      const threshold = Math.max(1, Math.floor(candidate.length / 3));
      if (dist <= threshold) {
        best = Math.min(best, dist * 5);
      } else {
        // Also try against each token
        for (const token of candidate.split(/[^a-z0-9]+/)) {
          if (token.length < 3) continue;
          const td = levenshtein(queryLower, token);
          const tt = Math.max(1, Math.floor(token.length / 3));
          if (td <= tt) best = Math.min(best, td * 5 + 1);
        }
      }
    }
  }

  // Direct substring on Burmese
  if (burmese && queryRaw && burmese.includes(queryRaw)) {
    best = Math.min(best, -30);
  }

  return best;
}

/**
 * Search and rank presets against a query, applying typo-tolerant matching.
 * Returns presets sorted by relevance — best match first.
 */
export function searchCategoryPresets(query: string): JobCategoryOption[] {
  const trimmed = query.trim();
  if (!trimmed) return JOB_CATEGORY_PRESETS;
  const lower = trimmed.toLowerCase();

  const scored = JOB_CATEGORY_PRESETS.map((option) => ({
    option,
    score: scoreOption(option, lower, trimmed),
  })).filter((s) => s.score !== Infinity);

  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.option);
}
