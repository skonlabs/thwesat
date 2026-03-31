import { motion } from "framer-motion";
import { Shield, ChevronRight, MapPin, FileText, AlertTriangle, BookOpen, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const countries = [
  { name: "ထိုင်း", nameEn: "Thailand", flag: "🇹🇭", guides: 12, popular: true },
  { name: "ဂျပန်", nameEn: "Japan", flag: "🇯🇵", guides: 8, popular: true },
  { name: "စင်ကာပူ", nameEn: "Singapore", flag: "🇸🇬", guides: 6, popular: true },
  { name: "မလေးရှား", nameEn: "Malaysia", flag: "🇲🇾", guides: 5, popular: false },
  { name: "တောင်ကိုရီးယား", nameEn: "South Korea", flag: "🇰🇷", guides: 4, popular: false },
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
      <div className="px-6 pt-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">{lang === "my" ? "လမ်းညွှန်ချက်များ" : "Guides"}</h1>
        <p className="mb-6 text-xs text-muted-foreground">
          {lang === "my" ? "ဥပဒေရေးရာနှင့် လက်တွေ့ လမ်းညွှန်ချက်များ" : "Legal & practical guides"}
        </p>

        <h2 className="mb-3 text-sm font-semibold text-foreground">{lang === "my" ? "နိုင်ငံအလိုက် ရွေးချယ်ပါ" : "Select by Country"}</h2>
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {countries.map((country, i) => (
            <motion.button key={country.nameEn} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-card p-3 px-5 shadow-card">
              <span className="text-2xl">{country.flag}</span>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? country.name : country.nameEn}</span>
              <span className="text-[10px] text-muted-foreground">{country.guides} {lang === "my" ? "ခု" : "guides"}</span>
            </motion.button>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "လူကြိုက်များသော လမ်းညွှန်ချက်များ" : "Featured Guides"}</h2>
        </div>

        <div className="space-y-3 pb-6">
          {featuredGuides.map((guide, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-all active:scale-[0.99]">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <guide.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{lang === "my" ? guide.title : guide.titleEn}</h3>
                  {guide.isNew && (
                    <span className="flex-shrink-0 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">NEW</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{lang === "my" ? guide.category.en : guide.category.en} · {lang === "my" ? guide.readTime.my : guide.readTime.en}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{lang === "my" ? guide.category.my : guide.category.en}</span>
                  <span className="text-[10px] text-muted-foreground">📖 {lang === "my" ? guide.readTime.my : guide.readTime.en}</span>
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Guides;
