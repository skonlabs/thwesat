import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Star, SlidersHorizontal, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAllProfiles } from "@/hooks/use-profiles";
import PageHeader from "@/components/PageHeader";

const skillCategories = ["All", "React", "Node.js", "Python", "UI/UX", "Project Management", "Translation", "Marketing"];

const experienceOptions = [
  { value: "all", labelEn: "Any", labelMy: "အားလုံး" },
  { value: "junior", labelEn: "Junior", labelMy: "Junior" },
  { value: "mid", labelEn: "Mid", labelMy: "Mid" },
  { value: "senior", labelEn: "Senior", labelMy: "Senior" },
];

const locationOptions = [
  { value: "all", labelEn: "All Locations", labelMy: "နေရာအားလုံး" },
  { value: "Remote", labelEn: "Remote", labelMy: "Remote" },
  { value: "Bangkok", labelEn: "Bangkok", labelMy: "ဘန်ကောက်" },
  { value: "Chiang Mai", labelEn: "Chiang Mai", labelMy: "ချင်းမိုင်" },
  { value: "Kuala Lumpur", labelEn: "Kuala Lumpur", labelMy: "ကွာလာလမ်ပူ" },
];

const SearchTalent = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: profiles = [], isLoading } = useAllProfiles();
  const [search, setSearch] = useState("");
  const [activeSkill, setActiveSkill] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterExp, setFilterExp] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterAvailable, setFilterAvailable] = useState(false);

  const activeFilterCount = [filterExp !== "all", filterLocation !== "all", filterAvailable].filter(Boolean).length;

  const matchExp = (exp: string | null) => {
    if (filterExp === "all") return true;
    if (!exp) return filterExp === "junior";
    const lower = exp.toLowerCase();
    if (filterExp === "junior") return lower.includes("junior") || lower.includes("entry") || lower === "";
    if (filterExp === "mid") return lower.includes("mid") || lower.includes("intermediate");
    return lower.includes("senior") || lower.includes("lead") || lower.includes("principal");
  };

  const filtered = profiles.filter(p => {
    const matchesSearch = !search || 
      p.display_name.toLowerCase().includes(search.toLowerCase()) || 
      (p.headline || "").toLowerCase().includes(search.toLowerCase()) || 
      (p.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesSkill = activeSkill === "All" || (p.skills || []).some(s => s.toLowerCase().includes(activeSkill.toLowerCase()));
    const matchesExp = matchExp(p.experience);
    const matchesLoc = filterLocation === "all" || (p.location || "").toLowerCase().includes(filterLocation.toLowerCase());
    const matchesAvail = !filterAvailable || p.remote_ready;
    return matchesSearch && matchesSkill && matchesExp && matchesLoc && matchesAvail;
  });

  const clearFilters = () => {
    setFilterExp("all");
    setFilterLocation("all");
    setFilterAvailable(false);
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "ဝန်ထမ်းရှာဖွေရန်" : "Search Talent"} />
      <div className="px-5">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "my" ? "နာမည်၊ ကျွမ်းကျင်မှု ရှာရန်..." : "Search by name, skill..."}
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <button onClick={() => setShowFilters(true)} className="relative flex items-center justify-center rounded-xl border border-border bg-card px-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {skillCategories.map(s => (
            <button key={s} onClick={() => setActiveSkill(s)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeSkill === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {s === "All" ? (lang === "my" ? "အားလုံး" : "All") : s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ဦး တွေ့ရှိ" : "talent found"}</p>

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
                          <button onClick={clearFilters} className="text-xs text-primary">{lang === "my" ? "ရှင်းလင်းမည်" : "Clear all"}</button>
                        )}
                        <button onClick={() => setShowFilters(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "အတွေ့အကြုံ" : "Experience"}</p>
                        <div className="flex flex-wrap gap-2">
                          {experienceOptions.map(opt => (
                            <button key={opt.value} onClick={() => setFilterExp(opt.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterExp === opt.value ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                              {lang === "my" ? opt.labelMy : opt.labelEn}
                            </button>
                          ))}
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
                        <button onClick={() => setFilterAvailable(!filterAvailable)} className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-3">
                          <span className="text-sm text-foreground">{lang === "my" ? "ရနိုင်သူများသာ" : "Available only"}</span>
                          <div className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${filterAvailable ? "bg-primary" : "border border-border"}`}>
                            {filterAvailable && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </div>
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-border px-5 py-4">
                      <Button onClick={() => setShowFilters(false)} className="w-full rounded-xl">
                        {lang === "my" ? `ရလဒ် ${filtered.length} ခု ပြရန်` : `Show ${filtered.length} results`}
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {filtered.map((talent, i) => (
                <motion.button
                  key={talent.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate("/profile")}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {talent.display_name?.slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{talent.display_name}</h3>
                          <p className="text-[11px] text-muted-foreground">{talent.headline || ""} {talent.experience ? `· ${talent.experience}` : ""}</p>
                        </div>
                        {talent.remote_ready ? (
                          <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">{lang === "my" ? "ရနိုင်" : "Available"}</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{lang === "my" ? "မရနိုင်" : "Unavailable"}</span>
                        )}
                      </div>
                      {talent.location && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {talent.location}</span>
                        </div>
                      )}
                      {(talent.skills || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(talent.skills || []).slice(0, 5).map(s => (
                            <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1} />
                  <p className="text-sm font-medium text-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No results found"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search"}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchTalent;
