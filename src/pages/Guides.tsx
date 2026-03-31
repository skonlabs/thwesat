import { motion } from "framer-motion";
import { Shield, ChevronRight, MapPin, FileText, AlertTriangle, BookOpen, Globe } from "lucide-react";

const countries = [
  { name: "ထိုင်း", nameEn: "Thailand", flag: "🇹🇭", guides: 12, popular: true },
  { name: "ဂျပန်", nameEn: "Japan", flag: "🇯🇵", guides: 8, popular: true },
  { name: "စင်ကာပူ", nameEn: "Singapore", flag: "🇸🇬", guides: 6, popular: true },
  { name: "မလေးရှား", nameEn: "Malaysia", flag: "🇲🇾", guides: 5, popular: false },
  { name: "တောင်ကိုရီးယား", nameEn: "South Korea", flag: "🇰🇷", guides: 4, popular: false },
];

const featuredGuides = [
  { title: "ထိုင်း Pink Card လျှောက်ထားနည်း", titleEn: "Thai Pink Card Application Guide", icon: FileText, category: "ဗီဇာ · Visa", readTime: "10 မိနစ်", isNew: true },
  { title: "Remote Work အတွက် Payoneer ဖွင့်နည်း", titleEn: "Setting Up Payoneer for Remote Work", icon: Globe, category: "ငွေကြေး · Finance", readTime: "7 မိနစ်", isNew: true },
  { title: "ထိုင်းတွင် အလုပ်ပါမစ် ရယူနည်း", titleEn: "Getting a Work Permit in Thailand", icon: Shield, category: "ဥပဒေ · Legal", readTime: "15 မိနစ်", isNew: false },
  { title: "အလိမ်အညာ ရှောင်ကြဉ်နည်း", titleEn: "How to Avoid Common Scams", icon: AlertTriangle, category: "လုံခြုံရေး · Safety", readTime: "8 မိနစ်", isNew: false },
];

const Guides = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">လမ်းညွှန်ချက်များ</h1>
        <p className="mb-6 text-xs text-muted-foreground">
          Legal & practical guides · ဥပဒေရေးရာနှင့် လက်တွေ့ လမ်းညွှန်ချက်များ
        </p>

        {/* Country selector */}
        <h2 className="mb-3 text-sm font-semibold text-foreground">နိုင်ငံအလိုက် ရွေးချယ်ပါ</h2>
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {countries.map((country, i) => (
            <motion.button
              key={country.nameEn}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-card p-3 px-5 shadow-card"
            >
              <span className="text-2xl">{country.flag}</span>
              <span className="text-[11px] font-medium text-foreground">{country.nameEn}</span>
              <span className="text-[10px] text-muted-foreground">{country.guides} guides</span>
            </motion.button>
          ))}
        </div>

        {/* Featured guides */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">လူကြိုက်များသော လမ်းညွှန်ချက်များ</h2>
        </div>

        <div className="space-y-3 pb-6">
          {featuredGuides.map((guide, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <guide.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{guide.title}</h3>
                  {guide.isNew && (
                    <span className="flex-shrink-0 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
                      NEW
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{guide.titleEn}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {guide.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">📖 {guide.readTime}</span>
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
