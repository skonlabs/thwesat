import { motion } from "framer-motion";
import { Shield, ChevronRight, FileText, AlertTriangle, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const countries = [
  { name: "ထိုင်း", nameEn: "Thailand", flag: "🇹🇭", guides: 12 },
  { name: "ဂျပန်", nameEn: "Japan", flag: "🇯🇵", guides: 8 },
  { name: "စင်ကာပူ", nameEn: "Singapore", flag: "🇸🇬", guides: 6 },
  { name: "မလေးရှား", nameEn: "Malaysia", flag: "🇲🇾", guides: 5 },
  { name: "တောင်ကိုရီးယား", nameEn: "South Korea", flag: "🇰🇷", guides: 4 },
];

const featuredGuides = [
  { title: "ထိုင်း Pink Card လျှောက်ထားနည်း", titleEn: "Thai Pink Card Application Guide", icon: FileText, category: { my: "ဗီဇာ", en: "Visa" }, readTime: { my: "10 မိနစ်", en: "10 min" }, isNew: true },
  { title: "Remote Work အတွက် Payoneer ဖွင့်နည်း", titleEn: "Setting Up Payoneer for Remote Work", icon: Globe, category: { my: "ငွေကြေး", en: "Finance" }, readTime: { my: "7 မိနစ်", en: "7 min" }, isNew: true },
  { title: "ထိုင်းတွင် အလုပ်ပါမစ် ရယူနည်း", titleEn: "Getting a Work Permit in Thailand", icon: Shield, category: { my: "ဥပဒေ", en: "Legal" }, readTime: { my: "15 မိနစ်", en: "15 min" }, isNew: false },
  { title: "အလိမ်အညာ ရှောင်ကြဉ်နည်း", titleEn: "How to Avoid Common Scams", icon: AlertTriangle, category: { my: "လုံခြုံရေး", en: "Safety" }, readTime: { my: "8 မိနစ်", en: "8 min" }, isNew: false },
];

const Guides = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"} />
      <div className="px-5 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "နိုင်ငံအလိုက် ရွေးချယ်ပါ" : "Select by Country"}</h2>
        <div className="mb-5 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {countries.map((country, i) => (
            <motion.button key={country.nameEn} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-3">
              <span className="text-2xl">{country.flag}</span>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? country.name : country.nameEn}</span>
              <span className="text-[10px] text-muted-foreground">{country.guides} {lang === "my" ? "ခု" : "guides"}</span>
            </motion.button>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "လူကြိုက်များသော လမ်းညွှန်ချက်များ" : "Featured Guides"}</h2>
        <div className="space-y-2.5 pb-6">
          {featuredGuides.map((guide, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <guide.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug text-foreground">{lang === "my" ? guide.title : guide.titleEn}</h3>
                  {guide.isNew && (
                    <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">NEW</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{lang === "my" ? guide.category.my : guide.category.en}</span>
                  <span className="text-[10px] text-muted-foreground">{lang === "my" ? guide.readTime.my : guide.readTime.en}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Guides;
