import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Briefcase, Clock, Bookmark, Shield, CreditCard, AlertTriangle, X, Check, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useJobs, useSavedJobIds, useToggleSaveJob, useApplications, type Job } from "@/hooks/use-jobs";
import { formatJobSalary, translateJobLocation, translateJobTags, translateJobTitle, translateJobType } from "@/lib/job-localization";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import ListSkeleton from "@/components/ListSkeleton";
import { sanitizeJobPaymentMethods } from "@/lib/payment-methods";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Tokenize a free-text string into lowercase keywords (>=3 chars). */
function tokenize(input: string | null | undefined): Set<string> {
  if (!input) return new Set();
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s+#./-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

/** Score a job for the current job seeker based on profile + CV signals. Higher = better match. */
function scoreJobForSeeker(job: Job, signals: {
  skills: Set<string>;
  keywords: Set<string>;
  preferredTypes: Set<string>;
  location: string;
}): number {
  let score = 0;
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  for (const s of jobSkills) {
    if (signals.skills.has(s)) score += 10;
    else if ([...signals.skills].some((u) => s.includes(u) || u.includes(s))) score += 5;
  }
  const haystack = `${job.title || ""} ${job.title_my || ""} ${job.description || ""} ${job.requirements || ""} ${(job.categories || []).join(" ")} ${job.category || ""} ${job.company || ""}`.toLowerCase();
  for (const kw of signals.keywords) {
    if (haystack.includes(kw)) score += 2;
  }
  if (signals.preferredTypes.size > 0) {
    if (job.role_type && signals.preferredTypes.has(job.role_type.toLowerCase())) score += 6;
    if (job.job_type && signals.preferredTypes.has(job.job_type.toLowerCase())) score += 4;
  }
  if (signals.location && job.location && job.location.toLowerCase().includes(signals.location.toLowerCase())) {
    score += 4;
  }
  if (job.is_featured) score += 1;
  if (job.is_verified) score += 1;
  return score;
}

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "နည်းပညာ", en: "Tech" },
  { my: "ဒီဇိုင်း", en: "Design" },
  { my: "စီမံခန့်ခွဲမှု", en: "Management" },
  { my: "အကျိုးပြု အဖွဲ့အစည်း", en: "NGO" },
  { my: "ဘာသာပြန်", en: "Translation" },
  { my: "ငွေကြေး", en: "Finance" },
];

const jobTypes = [
  { value: "all", labelEn: "All Types", labelMy: "အားလုံး" },
  { value: "remote_full", labelEn: "Remote Full-time", labelMy: "အဝေးထိန်း အပြည့်အဝ" },
  { value: "remote_contract", labelEn: "Remote Contract", labelMy: "အဝေးထိန်း ကန်ထရိုက်" },
  { value: "hybrid", labelEn: "Hybrid", labelMy: "ရောစပ်" },
];

const locationOptions = [
  { value: "Remote", labelEn: "Remote", labelMy: "အဝေးထိန်း" },
  { value: "Yangon", labelEn: "Yangon", labelMy: "ရန်ကုန်" },
  { value: "Mandalay", labelEn: "Mandalay", labelMy: "မန္တလေး" },
  { value: "Bangkok", labelEn: "Bangkok", labelMy: "ဘန်ကောက်" },
  { value: "Chiang Mai", labelEn: "Chiang Mai", labelMy: "ချင်းမိုင်" },
  { value: "Mae Sot", labelEn: "Mae Sot", labelMy: "မဲဆောက်" },
  { value: "Singapore", labelEn: "Singapore", labelMy: "စင်ကာပူ" },
  { value: "Kuala Lumpur", labelEn: "Kuala Lumpur", labelMy: "ကွာလာလမ်ပူ" },
  { value: "Penang", labelEn: "Penang", labelMy: "ပီနန်" },
  { value: "Tokyo", labelEn: "Tokyo", labelMy: "တိုကျို" },
  { value: "Seoul", labelEn: "Seoul", labelMy: "ဆိုးလ်" },
  { value: "Hong Kong", labelEn: "Hong Kong", labelMy: "ဟောင်ကောင်" },
  { value: "Taipei", labelEn: "Taipei", labelMy: "ထိုင်ပေ" },
  { value: "Dubai", labelEn: "Dubai", labelMy: "ဒူဘိုင်း" },
];

// Cards use the consistent card surface to match the editorial navy/gold theme.

// Application status badges shown on job cards (seeker perspective).
// Built from the shared registry so labels stay in sync with My Applications.
import { getApplicationStatusMeta } from "@/lib/status-labels";
const APP_BADGE_KEYS = [
  "applied", "submitted", "viewed", "shortlisted", "interview", "interviewed",
  "offered", "placed", "rejected", "withdrawn",
] as const;
const applicationStatusLabel: Record<string, { my: string; en: string; tone: string }> = Object.fromEntries(
  APP_BADGE_KEYS.map((k) => {
    const m = getApplicationStatusMeta(k, "seeker");
    return [k, { my: m.my, en: m.en, tone: m.color }];
  })
);

function formatTimeAgo(dateStr: string | null): { my: string; en: string } {
  if (!dateStr) return { my: "မကြာသေးမီ", en: "Recently" };
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return { my: "ယခု", en: "Just now" };
  if (hours < 24) return { my: `${hours} နာရီ`, en: `${hours} hours` };
  return { my: `${days} ရက်`, en: `${days} days` };
}

const Jobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: jobs = [], isLoading } = useJobs();
  const { data: savedJobIds = [] } = useSavedJobIds();
  const { data: applications = [] } = useApplications();
  const toggleSaveMutation = useToggleSaveJob();
  const { user } = useAuth();
  const { role } = useRole();
  const isSeeker = role === "jobseeker";

  const [search, setSearch] = useSearchParamState("q", "");
  const [activeCategory, setActiveCategory] = useSearchParamState("cat", "All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useSearchParamState("type", "all");
  const [filterLocation, setFilterLocation] = useSearchParamState("loc", "all");
  const [filterDiasporaSafe, setFilterDiasporaSafeRaw] = useSearchParamState("safe", "0");
  const [filterVerified, setFilterVerifiedRaw] = useSearchParamState("verified", "0");
  const [filterVisa, setFilterVisaRaw] = useSearchParamState("visa", "0");
  const setFilterDiasporaSafe = (v: boolean) => setFilterDiasporaSafeRaw(v ? "1" : "0");
  const setFilterVerified = (v: boolean) => setFilterVerifiedRaw(v ? "1" : "0");
  const setFilterVisa = (v: boolean) => setFilterVisaRaw(v ? "1" : "0");
  const diasporaOn = filterDiasporaSafe === "1";
  const verifiedOn = filterVerified === "1";
  const visaOn = filterVisa === "1";
  const [showScamAlert, setShowScamAlert] = useState(true);

  const activeFilterCount = [filterType !== "all", filterLocation !== "all", diasporaOn, verifiedOn, visaOn].filter(Boolean).length;

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === "" ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      (job.skills || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const jobCats = (job.categories && job.categories.length > 0) ? job.categories : (job.category ? [job.category] : []);
    const matchesCategory = activeCategory === "All" || jobCats.some(c => c === activeCategory || c.toLowerCase() === activeCategory.toLowerCase());
    const matchesType = filterType === "all" || filterType.split(",").some(t => t === job.role_type || t === job.job_type);
    const matchesLocation = filterLocation === "all" || job.location === filterLocation;
    const matchesDiaspora = !diasporaOn || job.is_diaspora_safe;
    const matchesVerified = !verifiedOn || job.is_verified;
    const matchesVisa = !visaOn || job.visa_sponsorship;
    return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesDiaspora && matchesVerified && matchesVisa;
  });

  // Fetch the seeker's profile + latest CV filename to drive personalized matching.
  const { data: seekerSignals } = useQuery({
    queryKey: ["seeker-match-signals", user?.id],
    enabled: !!user && isSeeker,
    queryFn: async () => {
      const [{ data: profile }, { data: cv }] = await Promise.all([
        supabase.from("profiles").select("skills, headline, bio, experience, location, preferred_work_types").eq("id", user!.id).maybeSingle(),
        supabase
          .from("cv_documents")
          .select("file_name, parsed_text, parsed_data")
          .eq("user_id", user!.id)
          .order("is_primary", { ascending: false })
          .order("parsed_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const profileSkills = (profile?.skills || []).map((s: string) => s.toLowerCase());
      const cvSkills = Array.isArray((cv?.parsed_data as any)?.skills)
        ? (cv!.parsed_data as any).skills.map((s: string) => String(s).toLowerCase())
        : [];
      const skillsArr = Array.from(new Set([...profileSkills, ...cvSkills]));
      const keywords = new Set<string>([
        ...tokenize(profile?.headline),
        ...tokenize(profile?.bio),
        ...tokenize(profile?.experience),
        ...tokenize(cv?.file_name),
        ...tokenize(cv?.parsed_text),
      ]);
      const preferredTypes = new Set<string>((profile?.preferred_work_types || []).map((s: string) => s.toLowerCase()));
      return {
        hasProfile: skillsArr.length > 0 || !!profile?.headline || !!cv?.parsed_text,
        skills: new Set<string>(skillsArr),
        keywords,
        preferredTypes,
        location: profile?.location || "",
      };
    },
  });

  const userActivelyFiltering = !!search || activeCategory !== "All" || activeFilterCount > 0;
  const personalize = isSeeker && !!seekerSignals?.hasProfile && !userActivelyFiltering;

  const sortedJobs = useMemo(() => {
    if (!personalize || !seekerSignals) return filteredJobs;
    const scored = filteredJobs.map((j) => ({ j, s: scoreJobForSeeker(j, seekerSignals) }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.j);
  }, [filteredJobs, personalize, seekerSignals]);

  const clearFilters = () => {
    setFilterType("all");
    setFilterLocation("all");
    setFilterDiasporaSafe(false);
    setFilterVerified(false);
    setFilterVisa(false);
  };

  const handleToggleSave = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = savedJobIds.includes(jobId);
    toggleSaveMutation.mutate({ jobId, isSaved });
  };

  const isFeatured = (job: Job) => {
    return (job.salary_max || 0) >= 5000 || (job.applicant_count || 0) >= 20;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်အကိုင်များ" : "Jobs"} />
      <div className="border-b border-border bg-background px-5 pb-4 pt-3 md:px-8">
        <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အလုပ်ခေါင်းစဉ်၊ ကုမ္ပဏီ..." : "Job title, company..."} className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70" />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(true)} className="relative flex items-center justify-center rounded-xl border border-border bg-card px-3 hover:bg-muted/40">
            <SlidersHorizontal className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{activeFilterCount}</span>
            )}
          </button>
        </div>
        <div className="mb-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat.en ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground/70 hover:bg-muted/40"}`}>
              {lang === "my" ? cat.my : cat.en}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {showScamAlert && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-destructive">{lang === "my" ? "⚠️ အလိမ်အညာ သတိပေးချက်" : "⚠️ Scam Alert"}</p>
                <p className="mt-0.5 text-[10px] text-shell-foreground/70">
                  {lang === "my" ? "Processing Fee တောင်းသော Remote Job ကမ်းလှမ်းချက်များကို သတိထားပါ" : "Beware of remote job offers asking for processing fees"}
                </p>
              </div>
              <button onClick={() => setShowScamAlert(false)} className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] bg-black/40" onClick={() => setShowFilters(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-16 z-[60] mx-auto max-w-3xl rounded-t-2xl bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">{lang === "my" ? "စစ်ထုတ်ရန်" : "Filters"}</h2>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-accent font-medium">{lang === "my" ? "ရှင်းလင်းမည်" : "Clear all"}</button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "အလုပ်အမျိုးအစား" : "Job Type"}</p>
                  <p className="mb-2 text-[10px] text-muted-foreground">{lang === "my" ? "တစ်ခုထက်ပို ရွေးချယ်နိုင်သည်" : "Select multiple types"}</p>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.filter(jt => jt.value !== "all").map(jt => {
                      const selected = filterType.split(",").filter(Boolean).includes(jt.value);
                      return (
                        <button key={jt.value} onClick={() => {
                          const current = filterType === "all" ? [] : filterType.split(",").filter(Boolean);
                          const next = selected ? current.filter(v => v !== jt.value) : [...current, jt.value];
                          setFilterType(next.length === 0 ? "all" : next.join(","));
                        }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                          {lang === "my" ? jt.labelMy : jt.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "တည်နေရာ" : "Location"}</p>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map(loc => (
                      <button key={loc.value} onClick={() => setFilterLocation(loc.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterLocation === loc.value ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                        {lang === "my" ? loc.labelMy : loc.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "လုံခြုံရေး" : "Safety & Trust"}</p>
                  <div className="space-y-2">
                    {[
                      { label: lang === "my" ? "ပြည်ပ လုံခြုံသာ" : "Diaspora Safe only", value: diasporaOn, set: setFilterDiasporaSafe },
                      { label: lang === "my" ? "အတည်ပြုပြီးသာ" : "Verified only", value: verifiedOn, set: setFilterVerified },
                      { label: lang === "my" ? "ဗီဇာပံ့ပိုးသာ" : "Visa sponsorship", value: visaOn, set: setFilterVisa },
                    ].map(toggle => (
                      <button key={toggle.label} onClick={() => toggle.set(!toggle.value)} className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-3">
                        <span className="text-sm text-foreground">{toggle.label}</span>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${toggle.value ? "bg-primary" : "border border-border"}`}>
                          {toggle.value && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-5 py-4">
                <Button onClick={() => setShowFilters(false)} className="w-full rounded-xl">
                  {lang === "my" ? `ရလဒ် ${filteredJobs.length} ခု ပြရန်` : `Show ${filteredJobs.length} results`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl space-y-2.5 px-5 pb-24 pt-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-8 md:pb-12 lg:grid-cols-3">
        {personalize && sortedJobs.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 md:col-span-2 lg:col-span-3">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
            <p className="text-[11px] text-foreground/80">
              {lang === "my" ? "သင့်ပရိုဖိုင်နှင့် ကိုက်ညီသော အလုပ်များ ဦးစွာပြထားသည်" : "Sorted by best match for your profile & resume"}
            </p>
          </div>
        )}
        {isLoading ? (
          <div className="md:col-span-2 lg:col-span-3"><ListSkeleton count={5} /></div>
        ) : sortedJobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center md:col-span-2 lg:col-span-3">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No jobs found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {activeFilterCount > 0 || activeCategory !== "All" || search
                ? (lang === "my" ? "စစ်ထုတ်မှုကို ဖြုတ်ပြီး ပြန်ကြည့်ပါ" : "Try clearing filters or search")
                : (lang === "my" ? "မကြာမီ အလုပ်အသစ်များ ထွက်လာမည်" : "New jobs are added regularly")}
            </p>
            {(activeFilterCount > 0 || activeCategory !== "All" || search) && (
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => { clearFilters(); setActiveCategory("All"); setSearch(""); }}>
                {lang === "my" ? "စစ်ထုတ်မှု ဖြုတ်ရန်" : "Clear filters"}
              </Button>
            )}
          </div>
        ) : (
          sortedJobs.map((job, i) => {
            const featured = isFeatured(job);
            const isSaved = savedJobIds.includes(job.id);
            const application = applications.find((a: any) => a.job_id === job.id);
            const status = application?.status;
            const statusMeta = status ? (applicationStatusLabel[status] || applicationStatusLabel.applied) : null;
            const postedAgo = formatTimeAgo(job.created_at);
            const visiblePaymentMethods = sanitizeJobPaymentMethods(job.payment_methods);

            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover ${featured ? "border-accent/40" : "border-border"}`} onClick={() => navigate(`/jobs/${job.id}`)}>
                {featured && (
                  <span aria-hidden className="absolute inset-y-3 left-0 w-0.5 rounded-r bg-accent" />
                )}
                {featured && (
                  <div className="mb-2 flex items-center gap-1">
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-dark">★ {lang === "my" ? "အထူးအသား" : "Featured"}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/8">
                      <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <button className="flex-shrink-0 text-muted-foreground transition-colors hover:text-accent" onClick={(e) => handleToggleSave(job.id, e)} aria-label={isSaved ? "Unsave job" : "Save job"}>
                    <Bookmark className={`h-5 w-5 ${isSaved ? "fill-accent text-accent" : ""}`} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {job.is_verified && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-medium text-emerald">✓ {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}</span>
                  )}
                  {job.is_diaspora_safe && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-medium text-emerald">
                      <Shield className="h-2.5 w-2.5" strokeWidth={2} /> {lang === "my" ? "ပြည်ပ လုံခြုံ" : "Diaspora Safe"}
                    </span>
                  )}
                  {job.requires_embassy && (
                    <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} /> {lang === "my" ? "သံရုံးလိုအပ်" : "Embassy docs"}
                    </span>
                  )}
                  {job.visa_sponsorship && (
                    <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-medium text-primary">{lang === "my" ? "ဗီဇာ ပံ့ပိုး" : "Visa sponsor"}</span>
                  )}
                </div>
                {translateJobTags(job.skills, lang).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {translateJobTags(job.skills, lang).slice(0, 4).map((tag) => (<span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex min-w-0 items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} /> <span className="truncate">{translateJobLocation(job.location, lang)}</span></span>
                    <span className="hidden items-center gap-1 sm:flex"><Clock className="h-3 w-3" strokeWidth={1.5} /> {translateJobType(job.role_type || job.job_type, lang)}</span>
                  </div>
                  <span className="flex-shrink-0 whitespace-nowrap text-xs font-semibold text-foreground">{formatJobSalary(job, lang)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{lang === "my" ? `${postedAgo.my} အကြာက` : `${postedAgo.en} ago`}</span>
                    {visiblePaymentMethods.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <CreditCard className="h-2.5 w-2.5" strokeWidth={1.5} /> {visiblePaymentMethods.join(", ")}
                      </span>
                    )}
                  </div>
                  {statusMeta ? (
                    <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${statusMeta.tone}`}>
                      <Check className="h-3 w-3" strokeWidth={2} /> {lang === "my" ? statusMeta.my : statusMeta.en}
                    </span>
                  ) : (
                    <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>{lang === "my" ? "လျှောက်ထားရန်" : "Apply"}</Button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Jobs;
