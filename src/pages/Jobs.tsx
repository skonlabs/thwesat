import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Briefcase, Clock, Bookmark, Shield, CreditCard, AlertTriangle, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useJobs, useSavedJobIds, useToggleSaveJob, useApplications, type Job } from "@/hooks/use-jobs";
import { formatJobSalary, translateJobLocation, translateJobTags, translateJobTitle, translateJobType } from "@/lib/job-localization";

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
  { value: "all", labelEn: "All Locations", labelMy: "နေရာအားလုံး" },
  { value: "Remote", labelEn: "Remote", labelMy: "အဝေးထိန်း" },
  { value: "Bangkok, TH", labelEn: "Bangkok", labelMy: "ဘန်ကောက်" },
  { value: "Singapore", labelEn: "Singapore", labelMy: "စင်ကာပူ" },
];

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

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterDiasporaSafe, setFilterDiasporaSafe] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterVisa, setFilterVisa] = useState(false);
  const [showScamAlert, setShowScamAlert] = useState(true);

  const activeFilterCount = [filterType !== "all", filterLocation !== "all", filterDiasporaSafe, filterVerified, filterVisa].filter(Boolean).length;

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === "" ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      (job.skills || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || job.category === activeCategory;
    const matchesType = filterType === "all" || filterType.split(",").some(t => t === job.role_type || t === job.job_type);
    const matchesLocation = filterLocation === "all" || job.location === filterLocation;
    const matchesDiaspora = !filterDiasporaSafe || job.is_diaspora_safe;
    const matchesVerified = !filterVerified || job.is_verified;
    const matchesVisa = !filterVisa || job.visa_sponsorship;
    return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesDiaspora && matchesVerified && matchesVisa;
  });

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
      <div className="px-5 pt-4">
        <div className="mb-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အလုပ်ခေါင်းစဉ်၊ ကုမ္ပဏီ..." : "Job title, company..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <Button onClick={() => {}} variant="default" size="sm" className="rounded-xl px-4">
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <button onClick={() => setShowFilters(true)} className="relative flex items-center justify-center rounded-xl border border-border bg-card px-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{activeFilterCount}</span>
            )}
          </button>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat.en ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {lang === "my" ? cat.my : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] bg-black/40" onClick={() => setShowFilters(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-16 z-[60] mx-auto max-w-lg rounded-t-2xl bg-card">
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
                      { label: lang === "my" ? "ပြည်ပ လုံခြုံသာ" : "Diaspora Safe only", value: filterDiasporaSafe, set: setFilterDiasporaSafe },
                      { label: lang === "my" ? "အတည်ပြုပြီးသာ" : "Verified only", value: filterVerified, set: setFilterVerified },
                      { label: lang === "my" ? "ဗီဇာပံ့ပိုးသာ" : "Visa sponsorship", value: filterVisa, set: setFilterVisa },
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

      <div className="space-y-2.5 px-5 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading jobs..."}</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No jobs found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search or filters"}</p>
          </div>
        ) : (
          filteredJobs.map((job, i) => {
            const featured = isFeatured(job);
            const isSaved = savedJobIds.includes(job.id);
            const hasApplied = applications.some((a: any) => a.job_id === job.id);
            const postedAgo = formatTimeAgo(job.created_at);

            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-xl border bg-card p-4 shadow-card ${featured ? "border-accent/40" : "border-border"}`} onClick={() => navigate(`/jobs/${job.id}`)}>
                {featured && (
                  <div className="mb-2 flex items-center gap-1">
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-gold-dark">⭐ {lang === "my" ? "အထူးအသား" : "Featured"}</span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                      <Briefcase className="h-5 w-5 text-gold-dark" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground" onClick={(e) => handleToggleSave(job.id, e)}>
                    <Bookmark className={`h-5 w-5 ${isSaved ? "fill-accent text-accent" : ""}`} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {translateJobTags(job.skills, lang).map((tag) => (<span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {translateJobLocation(job.location, lang)}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" strokeWidth={1.5} /> {translateJobType(job.role_type || job.job_type, lang)}</span>
                  </div>
                  <span className="text-xs font-semibold text-gold-dark">{formatJobSalary(job, lang)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{lang === "my" ? `${postedAgo.my} အကြာက` : `${postedAgo.en} ago`}</span>
                    {(job.payment_methods || []).length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <CreditCard className="h-2.5 w-2.5" strokeWidth={1.5} /> {(job.payment_methods || []).join(", ")}
                      </span>
                    )}
                  </div>
                  {hasApplied ? (
                    <span className="flex items-center gap-1 rounded-lg bg-emerald/10 px-2.5 py-1 text-xs font-medium text-emerald">
                      <Check className="h-3 w-3" strokeWidth={2} /> {lang === "my" ? "လျှောက်ပြီး" : "Applied"}
                    </span>
                  ) : (
                    <Button variant="default" size="sm" className="rounded-lg text-xs">{lang === "my" ? "လျှောက်ထားရန်" : "Apply"}</Button>
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
