import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Briefcase, Clock, Bookmark, Shield, CreditCard, AlertTriangle, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "Tech", en: "Tech" },
  { my: "Design", en: "Design" },
  { my: "စီမံခန့်ခွဲမှု", en: "Management" },
  { my: "NGO", en: "NGO" },
  { my: "ဘာသာပြန်", en: "Translation" },
  { my: "ငွေကြေး", en: "Finance" },
];

const jobTypes = [
  { value: "all", labelEn: "All Types", labelMy: "အားလုံး" },
  { value: "remote_full", labelEn: "Remote Full-time", labelMy: "Remote အပြည့်" },
  { value: "remote_contract", labelEn: "Remote Contract", labelMy: "Remote ကန်ထရိုက်" },
  { value: "hybrid", labelEn: "Hybrid", labelMy: "Hybrid" },
];

const locationOptions = [
  { value: "all", labelEn: "All Locations", labelMy: "နေရာအားလုံး" },
  { value: "Remote", labelEn: "Remote", labelMy: "Remote" },
  { value: "Bangkok, TH", labelEn: "Bangkok", labelMy: "ဘန်ကောက်" },
  { value: "Singapore", labelEn: "Singapore", labelMy: "စင်ကာပူ" },
];

const allJobs = [
  { title: "Senior React Developer", company: "TechCorp Asia", location: "Remote", type: "remote_full", typeLabel: { my: "Remote အပြည့်", en: "Remote Full-time" }, salary: "$3,000–$5,000/mo", postedAgo: { my: "2 နာရီ", en: "2 hours" }, saved: false, tags: ["React", "TypeScript", "Node.js"], category: "Tech", diasporaSafe: true, verified: true, paymentMethods: ["Wise", "Payoneer"], requiresEmbassy: false, visaSponsorship: false, featured: true },
  { title: "UI/UX Designer", company: "DesignStudio BKK", location: "Bangkok, TH", type: "hybrid", typeLabel: { my: "Hybrid", en: "Hybrid" }, salary: "$2,000–$3,500/mo", postedAgo: { my: "5 နာရီ", en: "5 hours" }, saved: true, tags: ["Figma", "UI Design", "Prototyping"], category: "Design", diasporaSafe: true, verified: true, paymentMethods: ["Bank Transfer"], requiresEmbassy: true, visaSponsorship: true, featured: false },
  { title: "Project Coordinator", company: "NGO Partners", location: "Remote", type: "remote_contract", typeLabel: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" }, salary: "$1,800–$2,800/mo", postedAgo: { my: "1 ရက်", en: "1 day" }, saved: false, tags: ["Project Mgmt", "English", "Reporting"], category: "NGO", diasporaSafe: true, verified: true, paymentMethods: ["Wise"], requiresEmbassy: false, visaSponsorship: false, featured: false },
  { title: "Full Stack Developer", company: "StartupHub SG", location: "Singapore", type: "remote_full", typeLabel: { my: "Remote အပြည့်", en: "Remote Full-time" }, salary: "$4,000–$6,000/mo", postedAgo: { my: "1 ရက်", en: "1 day" }, saved: false, tags: ["Python", "React", "AWS"], category: "Tech", diasporaSafe: false, verified: true, paymentMethods: ["Payoneer", "Bank Transfer"], requiresEmbassy: false, visaSponsorship: true, featured: true },
  { title: "Myanmar-English Translator", company: "LangBridge", location: "Remote", type: "remote_contract", typeLabel: { my: "Remote ကန်ထရိုက်", en: "Remote Contract" }, salary: "$1,200–$2,000/mo", postedAgo: { my: "2 ရက်", en: "2 days" }, saved: false, tags: ["Translation", "Burmese", "English"], category: "Translation", diasporaSafe: true, verified: false, paymentMethods: ["Wise"], requiresEmbassy: false, visaSponsorship: false, featured: false },
];

const Jobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterDiasporaSafe, setFilterDiasporaSafe] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterVisa, setFilterVisa] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Record<number, boolean>>(
    Object.fromEntries(allJobs.map((j, i) => [i, j.saved]))
  );

  const activeFilterCount = [filterType !== "all", filterLocation !== "all", filterDiasporaSafe, filterVerified, filterVisa].filter(Boolean).length;

  const filteredJobs = allJobs.filter(job => {
    const matchesSearch = search === "" ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || job.category === activeCategory;
    const matchesType = filterType === "all" || job.type === filterType;
    const matchesLocation = filterLocation === "all" || job.location === filterLocation;
    const matchesDiaspora = !filterDiasporaSafe || job.diasporaSafe;
    const matchesVerified = !filterVerified || job.verified;
    const matchesVisa = !filterVisa || job.visaSponsorship;
    return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesDiaspora && matchesVerified && matchesVisa;
  });

  const clearFilters = () => {
    setFilterType("all");
    setFilterLocation("all");
    setFilterDiasporaSafe(false);
    setFilterVerified(false);
    setFilterVisa(false);
  };

  const toggleSave = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedJobs(prev => ({ ...prev, [i]: !prev[i] }));
    toast({
      title: savedJobs[i]
        ? (lang === "my" ? "သိမ်းဆည်းမှု ဖယ်ရှားပြီး" : "Removed from saved")
        : (lang === "my" ? "သိမ်းဆည်းပြီးပါပြီ" : "Saved!"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "အလုပ်အကိုင်များ" : "Jobs"} />
      <div className="px-5 pt-4">
        <div className="mb-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အလုပ်ခေါင်းစဉ်၊ ကုမ္ပဏီ..." : "Job title, company..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setShowFilters(true)} className="relative flex items-center justify-center rounded-xl border border-border bg-card px-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{activeFilterCount}</span>
            )}
          </button>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat.en ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {lang === "my" ? cat.my : cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowFilters(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">{lang === "my" ? "စစ်ထုတ်ရန်" : "Filters"}</h2>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-gold-dark font-medium">{lang === "my" ? "ရှင်းလင်းမည်" : "Clear all"}</button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "အလုပ်အမျိုးအစား" : "Job Type"}</p>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.map(jt => (
                      <button key={jt.value} onClick={() => setFilterType(jt.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterType === jt.value ? "bg-accent text-accent-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                        {lang === "my" ? jt.labelMy : jt.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "တည်နေရာ" : "Location"}</p>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map(loc => (
                      <button key={loc.value} onClick={() => setFilterLocation(loc.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterLocation === loc.value ? "bg-accent text-accent-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                        {lang === "my" ? loc.labelMy : loc.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "လုံခြုံရေး" : "Safety & Trust"}</p>
                  <div className="space-y-2">
                    {[
                      { label: lang === "my" ? "Diaspora Safe သာ" : "Diaspora Safe only", value: filterDiasporaSafe, set: setFilterDiasporaSafe },
                      { label: lang === "my" ? "အတည်ပြုပြီးသာ" : "Verified only", value: filterVerified, set: setFilterVerified },
                      { label: lang === "my" ? "ဗီဇာပံ့ပိုးသာ" : "Visa sponsorship", value: filterVisa, set: setFilterVisa },
                    ].map(toggle => (
                      <button key={toggle.label} onClick={() => toggle.set(!toggle.value)} className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-3">
                        <span className="text-sm text-foreground">{toggle.label}</span>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${toggle.value ? "bg-accent" : "border border-border"}`}>
                          {toggle.value && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
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

      <div className="space-y-2.5 px-5 pb-6">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No jobs found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search or filters"}</p>
          </div>
        ) : (
          filteredJobs.map((job, i) => {
            const origIndex = allJobs.indexOf(job);
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-xl border bg-card p-4 shadow-card ${job.featured ? "border-primary/40" : "border-border"}`} onClick={() => navigate("/jobs/detail")}>
                {job.featured && (
                  <div className="mb-2 flex items-center gap-1">
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-gold-dark">⭐ {lang === "my" ? "အထူးအသား" : "Featured"}</span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <Briefcase className="h-5 w-5 text-gold-dark" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground" onClick={(e) => toggleSave(origIndex, e)}>
                    <Bookmark className={`h-5 w-5 ${savedJobs[origIndex] ? "fill-primary text-primary" : ""}`} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.verified && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-medium text-emerald">✓ {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}</span>
                  )}
                  {job.diasporaSafe && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-medium text-emerald">
                      <Shield className="h-2.5 w-2.5" strokeWidth={2} /> Diaspora Safe
                    </span>
                  )}
                  {job.requiresEmbassy && (
                    <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} /> {lang === "my" ? "သံရုံးလိုအပ်" : "Embassy docs"}
                    </span>
                  )}
                  {job.visaSponsorship && (
                    <span className="rounded-full bg-navy/8 px-2 py-0.5 text-[9px] font-medium text-navy">{lang === "my" ? "ဗီဇာ ပံ့ပိုး" : "Visa sponsor"}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.tags.map((tag) => (<span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {job.location}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? job.typeLabel.my : job.typeLabel.en}</span>
                  </div>
                  <span className="text-xs font-semibold text-gold-dark">{job.salary}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{lang === "my" ? `${job.postedAgo.my} အကြာက` : `${job.postedAgo.en} ago`}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <CreditCard className="h-2.5 w-2.5" strokeWidth={1.5} /> {job.paymentMethods.join(", ")}
                    </span>
                  </div>
                  <Button variant="gold" size="sm" className="rounded-lg text-xs">{lang === "my" ? "လျှောက်ထားရန်" : "Apply"}</Button>
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
