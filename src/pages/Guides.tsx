import { motion } from "framer-motion";
import { Shield, ChevronRight, FileText, AlertTriangle, Globe, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useGuides } from "@/hooks/use-guides-data";

const categoryIcons: Record<string, typeof FileText> = {
  Visa: FileText,
  Finance: Globe,
  Legal: Shield,
  Safety: AlertTriangle,
};

const Guides = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: guides = [], isLoading } = useGuides();

  // Group guides by country for the country selector
  const countryMap = new Map<string, { flag: string; count: number }>();
  guides.forEach(g => {
    if (g.country && g.country !== "Global") {
      const existing = countryMap.get(g.country);
      if (existing) {
        existing.count++;
      } else {
        countryMap.set(g.country, { flag: g.country_flag || "🌐", count: 1 });
      }
    }
  });

  const countries = Array.from(countryMap.entries()).map(([name, data]) => ({
    nameEn: name,
    flag: data.flag,
    guides: data.count,
  }));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"} />
      <div className="px-5 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "နိုင်ငံအလိုက် ရွေးချယ်ပါ" : "Select by Country"}</h2>
            <div className="mb-5 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {countries.map((country, i) => (
                <motion.button key={country.nameEn} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    const firstGuide = guides.find(g => g.country === country.nameEn);
                    if (firstGuide) navigate(`/guides/${firstGuide.id}`);
                  }}
                  className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-3 active:bg-muted">
                  <span className="text-2xl">{country.flag}</span>
                  <span className="text-[11px] font-medium text-foreground">{country.nameEn}</span>
                  <span className="text-[10px] text-muted-foreground">{country.guides} {lang === "my" ? "ခု" : "guides"}</span>
                </motion.button>
              ))}
            </div>

            <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "လူကြိုက်များသော လမ်းညွှန်ချက်များ" : "Featured Guides"}</h2>
            <div className="space-y-2.5 pb-6">
              {guides.map((guide, i) => {
                const IconComp = categoryIcons[guide.category] || BookOpen;
                return (
                  <motion.button key={guide.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(`/guides/${guide.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <IconComp className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-snug text-foreground">{lang === "my" && guide.title_my ? guide.title_my : guide.title}</h3>
                        {guide.is_new && (
                          <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">NEW</span>
                        )}
                      </div>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Guides;
