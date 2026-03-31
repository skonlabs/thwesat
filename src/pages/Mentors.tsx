import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "Tech", en: "Tech" },
  { my: "Design", en: "Design" },
  { my: "Business", en: "Business" },
  { my: "Legal", en: "Legal" },
  { my: "Career", en: "Career" },
];

const mentors = [
  { name: "ဒေါ်ခင်မြတ်နိုး", nameEn: "Khin Myat Noe", role: "Senior Software Engineer", company: "Grab, Singapore", location: "Singapore", rating: 4.9, reviews: 47, expertise: ["React", "System Design", "Career Coaching"], avatar: "KM", available: true, category: "Tech" },
  { name: "ဦးဇော်မင်း", nameEn: "Zaw Min", role: "Product Designer", company: "Agoda, Bangkok", location: "Bangkok, TH", rating: 4.8, reviews: 32, expertise: ["UI/UX", "Design Systems", "Portfolio Review"], avatar: "ZM", available: true, category: "Design" },
  { name: "ဒေါ်သီတာ", nameEn: "Thida", role: "Immigration Lawyer", company: "Independent", location: "Bangkok, TH", rating: 5.0, reviews: 89, expertise: ["Thai Work Permit", "Pink Card", "Visa"], avatar: "TH", available: false, category: "Legal" },
  { name: "ဦးအောင်ကျော်", nameEn: "Aung Kyaw", role: "Engineering Manager", company: "LINE, Tokyo", location: "Tokyo, JP", rating: 4.7, reviews: 21, expertise: ["Leadership", "Interview Prep", "Japan Work"], avatar: "AK", available: true, category: "Career" },
];

const Mentors = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = search === "" ||
      m.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()) ||
      m.expertise.some(e => e.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">{lang === "my" ? "လမ်းညွှန်သူများ" : "Mentors"}</h1>
        <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "အတွေ့အကြုံရှင်များနှင့် ချိတ်ဆက်ပါ" : "Connect with experienced mentors"}</p>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "လမ်းညွှန်သူ ရှာဖွေရန်..." : "Search mentors..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${activeCategory === cat.en ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>
              {lang === "my" ? cat.my : cat.en}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-6 pb-6">
        {filteredMentors.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
            <Search className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No mentors found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search"}</p>
          </motion.div>
        ) : (
          filteredMentors.map((mentor, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="cursor-pointer rounded-2xl bg-card p-4 shadow-card" onClick={() => navigate("/mentors/detail")}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">{mentor.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? mentor.name : mentor.nameEn}</h3>
                      <p className="text-[11px] text-muted-foreground">{mentor.role}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="text-xs font-semibold text-foreground">{mentor.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({mentor.reviews})</span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{mentor.company}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mentor.expertise.map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {mentor.location}</span>
                  {mentor.available ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> {lang === "my" ? "ရရှိနိုင်" : "Available"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {lang === "my" ? "အလုပ်များနေ" : "Busy"}
                    </span>
                  )}
                </div>
                <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={e => { e.stopPropagation(); navigate("/mentors/detail"); }}>
                  <MessageCircle className="mr-1 h-3.5 w-3.5" /> {lang === "my" ? "ချိတ်ဆက်" : "Connect"}
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Mentors;
