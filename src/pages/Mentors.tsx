import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MapPin, MessageCircle, SlidersHorizontal, X, Check, GraduationCap, Send, Calendar } from "lucide-react";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useMentorProfiles } from "@/hooks/use-mentor-data";
import { useRole } from "@/hooks/use-role";
import { useStartConversation } from "@/hooks/use-start-conversation";
import { useSearchParamState } from "@/hooks/use-search-param-state";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListSkeleton from "@/components/ListSkeleton";

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "နည်းပညာ", en: "Tech" },
  { my: "ဒီဇိုင်း", en: "Design" },
  { my: "စီးပွားရေး", en: "Business" },
  { my: "ဥပဒေ", en: "Legal" },
  { my: "အသက်မွေးမှု", en: "Career" },
  { my: "ဥပဒေ အကြံပေး", en: "Legal Advice" },
  { my: "အလုပ်လုပ်ခွင့်", en: "Work Permit" },
  { my: "လူဝင်မှုကြီးကြပ်ရေး", en: "Immigration" },
  { my: "ဘာသာစကား", en: "Language" },
  { my: "စိတ်ကျန်းမာရေး", en: "Mental Health" },
  { my: "ငွေကြေးစီမံခန့်ခွဲမှု", en: "Finance" },
];

const locationOptions = [
  { value: "all", labelEn: "All Locations", labelMy: "နေရာအားလုံး" },
  { value: "Singapore", labelEn: "Singapore", labelMy: "စင်ကာပူ" },
  { value: "Bangkok, TH", labelEn: "Bangkok", labelMy: "ဘန်ကောက်" },
  { value: "Tokyo, JP", labelEn: "Tokyo", labelMy: "တိုကျို" },
];

const ratingOptions = [
  { value: "all", labelEn: "Any Rating", labelMy: "အားလုံး" },
  { value: "4.5", labelEn: "4.5+", labelMy: "၄.၅+" },
  { value: "4.8", labelEn: "4.8+", labelMy: "၄.၈+" },
];

function expertiseToCategory(expertise: string[]): string {
  const joined = expertise.join(" ").toLowerCase();
  if (joined.includes("react") || joined.includes("system") || joined.includes("tech") || joined.includes("software") || joined.includes("data")) return "Tech";
  if (joined.includes("ui") || joined.includes("design") || joined.includes("portfolio") || joined.includes("ux")) return "Design";
  if (joined.includes("law") || joined.includes("legal") || joined.includes("advice")) return "Legal Advice";
  if (joined.includes("permit") || joined.includes("work permit") || joined.includes("pink card")) return "Work Permit";
  if (joined.includes("visa") || joined.includes("immigration") || joined.includes("passport")) return "Immigration";
  if (joined.includes("language") || joined.includes("english") || joined.includes("japanese") || joined.includes("thai")) return "Language";
  if (joined.includes("mental") || joined.includes("wellbeing") || joined.includes("counseling") || joined.includes("stress")) return "Mental Health";
  if (joined.includes("finance") || joined.includes("money") || joined.includes("tax") || joined.includes("remittance")) return "Finance";
  if (joined.includes("career") || joined.includes("interview") || joined.includes("leadership") || joined.includes("resume")) return "Career";
  return "Business";
}

const Mentors = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { role } = useRole();
  const { startConversation } = useStartConversation();
  const { data: mentors = [], isLoading } = useMentorProfiles();
  const [search, setSearch] = useSearchParamState("q", "");
  const [activeCategory, setActiveCategory] = useSearchParamState("cat", "All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useSearchParamState("loc", "all");
  const [filterRating, setFilterRating] = useSearchParamState("rating", "all");
  const [filterAvailableRaw, setFilterAvailableRaw] = useSearchParamState("avail", "0");
  const filterAvailable = filterAvailableRaw === "1";
  const setFilterAvailable = (v: boolean) => setFilterAvailableRaw(v ? "1" : "0");

  // Fetch next available slot per mentor
  const mentorIds = mentors.map(m => m.id);
  const { data: nextSlots = {} } = useQuery({
    queryKey: ["mentor-next-slots", mentorIds],
    queryFn: async () => {
      if (!mentorIds.length) return {};
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mentor_availability_slots")
        .select("mentor_id, slot_date, start_time")
        .in("mentor_id", mentorIds)
        .eq("is_booked", false)
        .not("slot_date", "is", null)
        .gte("slot_date", today)
        .order("slot_date").order("start_time");
      const map: Record<string, { date: string; time: string }> = {};
      (data || []).forEach((s: any) => {
        if (!map[s.mentor_id]) map[s.mentor_id] = { date: s.slot_date, time: s.start_time };
      });
      return map;
    },
    enabled: mentorIds.length > 0,
  });

  const activeFilterCount = [filterLocation !== "all", filterRating !== "all", filterAvailable].filter(Boolean).length;

  const filteredMentors = mentors.filter(m => {
    const name = m.profile?.display_name || "";
    const role = m.title || "";
    const expertise = m.expertise || [];
    const category = expertiseToCategory(expertise);
    const matchesSearch = search === "" ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      role.toLowerCase().includes(search.toLowerCase()) ||
      expertise.some(e => e.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || category === activeCategory;
    const matchesLoc = filterLocation === "all" || m.location === filterLocation;
    const matchesRating = filterRating === "all" || (m.rating_avg || 0) >= parseFloat(filterRating);
    const matchesAvail = !filterAvailable || m.is_available;
    return matchesSearch && matchesCategory && matchesLoc && matchesRating && matchesAvail;
  });

  const clearFilters = () => {
    setFilterLocation("all");
    setFilterRating("all");
    setFilterAvailable(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်သူများ" : "Mentors"} />
      <div className="px-5 pt-4">
        <div className="mb-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "လမ်းညွှန်သူ ရှာဖွေရန်..." : "Search mentors..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
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

        {role !== "mentor" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <GraduationCap className="h-4.5 w-4.5 text-accent-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">
                {lang === "my" ? "လမ်းညွှန်သူ ဖြစ်လိုပါသလား?" : "Want to become a mentor?"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {lang === "my" ? "သင့်အတွေ့အကြုံကို မျှဝေပါ" : "Share your experience & earn"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-accent text-xs font-semibold text-accent-foreground"
              onClick={() => navigate("/become-mentor")}
            >
              {lang === "my" ? "စတင်ရန်" : "Get Started"}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] bg-foreground/40" onClick={() => setShowFilters(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed inset-x-0 bottom-16 z-[60] mx-auto max-w-3xl rounded-t-2xl bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">{lang === "my" ? "စစ်ထုတ်ရန်" : "Filters"}</h2>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-accent font-medium">{lang === "my" ? "ရှင်းလင်းမည်" : "Clear all"}</button>}
                  <button onClick={() => setShowFilters(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
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
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{lang === "my" ? "အဆင့်သတ်မှတ်ချက်" : "Minimum Rating"}</p>
                  <div className="flex flex-wrap gap-2">
                    {ratingOptions.map(opt => (
                      <button key={opt.value} onClick={() => setFilterRating(opt.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterRating === opt.value ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>
                        {lang === "my" ? opt.labelMy : opt.labelEn}
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
                  {lang === "my" ? `ရလဒ် ${filteredMentors.length} ခု ပြရန်` : `Show ${filteredMentors.length} results`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="space-y-3 px-5 pb-24">
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : filteredMentors.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No mentors found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search or filters"}</p>
            {(activeCategory !== "All" || filterLocation !== "all" || filterRating !== "all" || filterAvailable || search) && (
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => { clearFilters(); setActiveCategory("All"); setSearch(""); }}>
                {lang === "my" ? "စစ်ထုတ်မှု ဖြုတ်ရန်" : "Clear filters"}
              </Button>
            )}
          </div>
        ) : (
          filteredMentors.map((mentor, i) => {
            const name = mentor.profile?.display_name || (lang === "my" ? "လမ်းညွှန်သူ" : "Mentor");
            const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
            return (
              <motion.div key={mentor.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-4" onClick={() => navigate(`/mentors/${mentor.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                          <RoleBadge type="mentor" />
                          <UserStatusBadge status={mentor.status || "offline"} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{mentor.title}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {(mentor.rating_avg || 0) > 0 ? (
                          <>
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" strokeWidth={1.5} />
                            <span className="text-xs font-semibold text-foreground">{mentor.rating_avg}</span>
                            <span className="text-[10px] text-muted-foreground">({mentor.total_sessions || 0})</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{lang === "my" ? "အသစ်" : "New"}</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{mentor.company}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(mentor.expertise || []).map((tag) => (
                    <span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {mentor.location || (lang === "my" ? "မသတ်မှတ်ရသေး" : "Location not set")}</span>
                    {nextSlots[mentor.id] && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {lang === "my" ? "နောက်ဆုံး လပ်" : "Next"}: {nextSlots[mentor.id].date} · {nextSlots[mentor.id].time}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={e => { e.stopPropagation(); startConversation(mentor.id); }}>
                      <Send className="mr-1 h-3 w-3" strokeWidth={1.5} /> {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                    </Button>
                    <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={e => { e.stopPropagation(); navigate(`/mentors/${mentor.id}`); }}>
                      {lang === "my" ? "ပရိုဖိုင်" : "Profile"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Mentors;
