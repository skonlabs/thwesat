import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ChevronRight, FileText, AlertTriangle, Globe, BookOpen,
  Briefcase, Heart, Search, X, MapPin, Plus, Pencil, Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { useGuides } from "@/hooks/use-guides-data";

const categoryMeta: Record<string, { icon: typeof FileText; en: string; my: string; color: string }> = {
  visa:        { icon: FileText,       en: "Work Permit & Visa",      my: "အလုပ်ပါမစ် & ဗီဇာ",      color: "bg-blue-500/10 text-blue-600" },
  employment:  { icon: Briefcase,      en: "Employment & Jobs",       my: "အလုပ်အကိုင်",            color: "bg-emerald/10 text-emerald" },
  essentials:  { icon: Heart,          en: "Essentials & Daily Life",  my: "နေ့စဉ်ဘဝ မရှိမဖြစ်",    color: "bg-orange-500/10 text-orange-600" },
  safety:      { icon: AlertTriangle,  en: "Safety & Scam Prevention", my: "ဘေးကင်းရေး",            color: "bg-red-500/10 text-red-600" },
  finance:     { icon: Globe,          en: "Finance",                  my: "ငွေကြေး",               color: "bg-purple-500/10 text-purple-600" },
  legal:       { icon: Shield,         en: "Legal",                    my: "ဥပဒေ",                  color: "bg-indigo-500/10 text-indigo-600" },
  general:     { icon: BookOpen,       en: "General",                  my: "အထွေထွေ",               color: "bg-muted text-muted-foreground" },
};

// Regional grouping for better organization
const regionOrder: { en: string; my: string; countries: string[] }[] = [
  { en: "Southeast Asia", my: "အရှေ့တောင်အာရှ", countries: ["Thailand", "Malaysia", "Singapore", "Vietnam", "Philippines", "Indonesia", "Cambodia", "Laos", "Myanmar", "Brunei"] },
  { en: "East Asia", my: "အရှေ့အာရှ", countries: ["Japan", "South Korea", "Taiwan", "Hong Kong", "China", "Mongolia"] },
  { en: "South Asia", my: "တောင်အာရှ", countries: ["India", "Bangladesh", "Nepal", "Sri Lanka", "Pakistan", "Maldives"] },
  { en: "Middle East", my: "အရှေ့အလယ်ပိုင်း", countries: ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"] },
  { en: "Oceania", my: "သမုဒ္ဒရာဒေသ", countries: ["Australia", "New Zealand"] },
];

const Guides = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRoles();
  const { data: guides = [], isLoading } = useGuides();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteGuideId, setDeleteGuideId] = useState<string | null>(null);

  const handleDeleteGuide = async () => {
    if (!deleteGuideId) return;
    const { error } = await supabase.from("guides").delete().eq("id", deleteGuideId);
    if (error) {
      toast.error("Failed to delete guide");
    } else {
      toast.success(lang === "my" ? "လမ်းညွှန်ချက် ဖျက်ပြီး" : "Guide deleted");
      queryClient.invalidateQueries({ queryKey: ["guides"] });
    }
    setDeleteGuideId(null);
  };

  // Build country data
  const countryData = useMemo(() => {
    const map = new Map<string, { flag: string; count: number }>();
    guides.forEach((g) => {
      if (g.country) {
        const existing = map.get(g.country);
        if (existing) existing.count++;
        else map.set(g.country, { flag: g.country_flag || "🌐", count: 1 });
      }
    });
    return map;
  }, [guides]);

  // Group guides by category for a selected country
  const countryGuides = useMemo(() => {
    if (!selectedCountry) return {};
    const grouped: Record<string, typeof guides> = {};
    guides
      .filter((g) => g.country === selectedCountry)
      .forEach((g) => {
        const cat = g.category?.toLowerCase() || "general";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(g);
      });
    return grouped;
  }, [guides, selectedCountry]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.country?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q)
    );
  }, [guides, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"} />
      <div className="px-5 pt-4">
        {/* Admin: Create button */}
        {isAdmin && (
          <Button variant="default" size="sm" className="mb-4 w-full rounded-xl" onClick={() => navigate("/admin/guides/new")}>
            <Plus className="mr-1.5 h-4 w-4" /> {lang === "my" ? "လမ်းညွှန်ချက်အသစ် ဖန်တီးရန်" : "Create New Guide"}
          </Button>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "my" ? "နိုင်ငံ သို့ ခေါင်းစဉ်ဖြင့် ရှာပါ..." : "Search by country or topic..."}
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick help banner */}
            {!isSearching && !selectedCountry && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h3 className="mb-1 text-sm font-bold text-foreground">
                  {lang === "my" ? "📖 ဘာစလုပ်ရမလဲ?" : "📖 Where to Start?"}
                </h3>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  {lang === "my"
                    ? "သင်သွားချင်တဲ့ နိုင်ငံကို ရွေးပါ။ ဗီဇာ၊ အလုပ်၊ နေထိုင်ရေး၊ ဘေးကင်းရေး အကြောင်းအားလုံးကို ဖတ်နိုင်ပါမယ်။"
                    : "Tap any country below to see all guides — visa requirements, job info, daily life tips, and safety advice."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: FileText, label: lang === "my" ? "ဗီဇာ & ပါမစ်" : "Visa & Permits", color: "text-blue-600 bg-blue-500/10" },
                    { icon: Briefcase, label: lang === "my" ? "အလုပ်အကိုင်" : "Jobs & Salary", color: "text-emerald bg-emerald/10" },
                    { icon: Heart, label: lang === "my" ? "နေထိုင်ရေး" : "Daily Life", color: "text-orange-600 bg-orange-500/10" },
                    { icon: AlertTriangle, label: lang === "my" ? "ဘေးကင်းရေး" : "Scam Prevention", color: "text-red-600 bg-red-500/10" },
                  ].map((item) => (
                    <span key={item.label} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${item.color}`}>
                      <item.icon className="h-3 w-3" strokeWidth={2} /> {item.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Search results */}
            {isSearching && (
              <div className="space-y-3 pb-24">
                <p className="mb-2 text-xs text-muted-foreground">
                  {searchResults.length} {lang === "my" ? "ခု တွေ့ရှိသည်" : "results found"}
                </p>
                {searchResults.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} lang={lang} navigate={navigate} isAdmin={isAdmin} onDelete={setDeleteGuideId} />
                ))}
                {searchResults.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {lang === "my" ? "ရှာဖွေမှုနှင့် ကိုက်ညီသည် မရှိပါ" : "No guides match your search"}
                  </p>
                )}
              </div>
            )}

            {/* Country detail view */}
            {!isSearching && selectedCountry && (
              <AnimatePresence mode="wait">
                <motion.div key={selectedCountry} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <button onClick={() => setSelectedCountry(null)}
                    className="mb-4 flex items-center gap-1.5 text-xs font-medium text-primary active:text-primary/70">
                    ← {lang === "my" ? "နိုင်ငံများသို့ ပြန်ရန်" : "Back to countries"}
                  </button>

                  <div className="mb-5 flex items-center gap-3">
                    <span className="text-4xl">{countryData.get(selectedCountry)?.flag || "🌐"}</span>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedCountry}</h2>
                      <p className="text-xs text-muted-foreground">
                        {countryData.get(selectedCountry)?.count || 0} {lang === "my" ? "လမ်းညွှန်ချက်" : "guides available"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pb-24">
                    {Object.entries(categoryMeta).map(([catKey, meta]) => {
                      const catGuides = countryGuides[catKey];
                      if (!catGuides || catGuides.length === 0) return null;
                      return (
                        <div key={catKey}>
                          {catGuides.map((guide) => (
                            <div key={guide.id} className="mb-2 flex items-center gap-2">
                              <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/guides/${guide.id}`)}
                                className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                                  <meta.icon className="h-5 w-5" strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold leading-snug text-foreground">
                                    {lang === "my" ? meta.my : meta.en}
                                  </h3>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {guide.read_time_minutes || 5} {lang === "my" ? "မိနစ် ဖတ်ရန်" : "min read"} · {lang === "my" ? "အတည်ပြုပြီး" : "Verified"}
                                  </p>
                                  {guide.updated_at && (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                                      {lang === "my" ? "နောက်ဆုံးပြင်ဆင်:" : "Updated:"} {new Date(guide.updated_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                              </motion.button>
                              {isAdmin && (
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => navigate(`/admin/guides/${guide.id}`)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => setDeleteGuideId(guide.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Country grid by region */}
            {!isSearching && !selectedCountry && (
              <div className="space-y-3 pb-24">
                {regionOrder.map((region) => {
                  const regionCountries = region.countries
                    .filter((c) => countryData.has(c))
                    .map((c) => ({ name: c, ...countryData.get(c)! }));
                  if (regionCountries.length === 0) return null;

                  return (
                    <motion.div key={region.en} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        {lang === "my" ? region.my : region.en}
                      </h2>
                      <div className="grid grid-cols-3 gap-2">
                        {regionCountries.map((country) => (
                          <button key={country.name} onClick={() => setSelectedCountry(country.name)}
                            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-3 transition-colors active:border-primary active:bg-primary/5">
                            <span className="text-2xl">{country.flag}</span>
                            <span className="text-[11px] font-medium leading-tight text-foreground text-center">{country.name}</span>
                            <span className="text-[10px] text-muted-foreground">{country.count} {lang === "my" ? "ခု" : "guides"}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Guide Confirmation */}
      <AnimatePresence>
        {deleteGuideId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setDeleteGuideId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "ဤလမ်းညွှန်ချက်ကို ဖျက်မည်လား?" : "Delete this guide?"}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{lang === "my" ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။" : "This cannot be undone."}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteGuideId(null)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDeleteGuide}>{lang === "my" ? "ဖျက်ရန်" : "Delete"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Reusable guide card for search results */
function GuideCard({ guide, lang, navigate, isAdmin, onDelete }: { guide: any; lang: string; navigate: (path: string) => void; isAdmin?: boolean; onDelete?: (id: string) => void }) {
  const meta = categoryMeta[guide.category?.toLowerCase()] || categoryMeta.general;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => navigate(`/guides/${guide.id}`)}
        className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {lang === "my" && guide.title_my ? guide.title_my : guide.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {guide.country_flag && <span className="text-xs">{guide.country_flag}</span>}
            <span className="text-[10px] text-muted-foreground">{guide.country}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{guide.category}</span>
            {guide.updated_at && (
              <span className="text-[10px] text-muted-foreground/70">
                {lang === "my" ? "နောက်ဆုံးပြင်ဆင်:" : "Updated:"} {new Date(guide.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
      </button>
      {isAdmin && (
        <div className="flex flex-col gap-1">
          <button onClick={() => navigate(`/admin/guides/${guide.id}`)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete?.(guide.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}

export default Guides;
