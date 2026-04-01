import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronRight, FileText, AlertTriangle, Globe, BookOpen, Briefcase, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useGuides } from "@/hooks/use-guides-data";

const categoryIcons: Record<string, typeof FileText> = {
  visa: FileText,
  finance: Globe,
  legal: Shield,
  safety: AlertTriangle,
  employment: Briefcase,
  essentials: Heart,
  general: BookOpen,
  Visa: FileText,
  Finance: Globe,
  Legal: Shield,
  Safety: AlertTriangle,
};

const categoryLabels: Record<string, { en: string; my: string }> = {
  all: { en: "All", my: "အားလုံး" },
  visa: { en: "Visa", my: "ဗီဇာ" },
  employment: { en: "Jobs", my: "အလုပ်" },
  essentials: { en: "Essentials", my: "မရှိမဖြစ်" },
  safety: { en: "Safety", my: "ဘေးကင်းရေး" },
};

const Guides = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: guides = [], isLoading } = useGuides();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const countryMap = new Map<string, { flag: string; count: number }>();
  guides.forEach(g => {
    if (g.country && g.country !== "Global") {
      const existing = countryMap.get(g.country);
      if (existing) existing.count++;
      else countryMap.set(g.country, { flag: g.country_flag || "🌐", count: 1 });
    }
  });

  const countries = Array.from(countryMap.entries()).map(([name, data]) => ({
    nameEn: name, flag: data.flag, guides: data.count,
  }));

  const filtered = guides.filter(g => {
    if (selectedCountry && g.country !== selectedCountry) return false;
    if (selectedCategory !== "all" && g.category?.toLowerCase() !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"} />
      <div className="px-5 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "နိုင်ငံအလိုက် ရွေးချယ်ပါ" : "Select by Country"}</h2>
            <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedCountry(null)}
                className={`flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border px-5 py-3 transition-colors ${!selectedCountry ? "border-primary bg-primary/10" : "border-border bg-card active:bg-muted"}`}>
                <span className="text-2xl">🌏</span>
                <span className="text-[11px] font-medium text-foreground">{lang === "my" ? "အားလုံး" : "All"}</span>
                <span className="text-[10px] text-muted-foreground">{guides.length}</span>
              </motion.button>
              {countries.map((country, i) => (
                <motion.button key={country.nameEn} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedCountry(country.nameEn === selectedCountry ? null : country.nameEn)}
                  className={`flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border px-5 py-3 transition-colors ${selectedCountry === country.nameEn ? "border-primary bg-primary/10" : "border-border bg-card active:bg-muted"}`}>
                  <span className="text-2xl">{country.flag}</span>
                  <span className="text-[11px] font-medium text-foreground">{country.nameEn}</span>
                  <span className="text-[10px] text-muted-foreground">{country.guides}</span>
                </motion.button>
              ))}
            </div>

            {/* Category filter */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button key={key} onClick={() => setSelectedCategory(key)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${selectedCategory === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground active:bg-muted/80"}`}>
                  {lang === "my" ? label.my : label.en}
                </button>
              ))}
            </div>

            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {selectedCountry ? `${selectedCountry} ${lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"}` : (lang === "my" ? "လမ်းညွှန်ချက်များ" : "All Guides")}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">({filtered.length})</span>
            </h2>
            <div className="space-y-2.5 pb-6">
              {filtered.map((guide, i) => {
                const IconComp = categoryIcons[guide.category] || BookOpen;
                return (
                  <motion.button key={guide.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/guides/${guide.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <IconComp className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-snug text-foreground">{lang === "my" && guide.title_my ? guide.title_my : guide.title}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{guide.category}</span>
                        <span className="text-[10px] text-muted-foreground">{guide.read_time_minutes || 5} {lang === "my" ? "မိနစ်" : "min"}</span>
                        {guide.country_flag && <span className="text-[10px]">{guide.country_flag}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  </motion.button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{lang === "my" ? "လမ်းညွှန်ချက် မတွေ့ပါ" : "No guides found"}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Guides;
