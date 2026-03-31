import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, MessageCircle, ChevronRight, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const skillCategories = ["All", "React", "Node.js", "Python", "UI/UX", "Project Management", "Translation", "Marketing"];

const mockTalent = [
  { id: 1, name: "Maung Maung", nameMy: "မောင်မောင်", headline: "Full Stack Developer", skills: ["React", "Node.js", "TypeScript"], location: "Bangkok, TH", experience: 4, rating: 4.8, reviews: 12, avatar: "MM", available: true },
  { id: 2, name: "Thiri Win", nameMy: "သီရိဝင်း", headline: "UI/UX Designer", skills: ["Figma", "UI/UX", "CSS"], location: "Remote", experience: 3, rating: 4.6, reviews: 8, avatar: "TW", available: true },
  { id: 3, name: "Aung Kyaw", nameMy: "အောင်ကျော်", headline: "Senior Backend Developer", skills: ["Python", "AWS", "Django"], location: "Chiang Mai, TH", experience: 6, rating: 4.9, reviews: 20, avatar: "AK", available: false },
  { id: 4, name: "Hnin Si", nameMy: "နှင်းဆီ", headline: "Project Manager", skills: ["Project Management", "Agile", "Scrum"], location: "Remote", experience: 5, rating: 4.7, reviews: 15, avatar: "HS", available: true },
  { id: 5, name: "Zaw Min", nameMy: "ဇော်မင်း", headline: "React Native Developer", skills: ["React", "React Native", "TypeScript"], location: "KL, MY", experience: 3, rating: 4.5, reviews: 6, avatar: "ZM", available: true },
];

const SearchTalent = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeSkill, setActiveSkill] = useState("All");

  const filtered = mockTalent.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.headline.toLowerCase().includes(search.toLowerCase()) || t.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesSkill = activeSkill === "All" || t.skills.some(s => s.toLowerCase().includes(activeSkill.toLowerCase()));
    return matchesSearch && matchesSkill;
  });

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "ဝန်ထမ်းရှာဖွေရန်" : "Search Talent"} />
      <div className="px-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "my" ? "နာမည်၊ ကျွမ်းကျင်မှု ရှာရန်..." : "Search by name, skill..."}
            className="h-11 rounded-xl pl-10"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {skillCategories.map(s => (
            <button key={s} onClick={() => setActiveSkill(s)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeSkill === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {s === "All" ? (lang === "my" ? "အားလုံး" : "All") : s}
            </button>
          ))}
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {lang === "my" ? "ဦး တွေ့ရှိ" : "talent found"}</p>

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
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{talent.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? talent.nameMy : talent.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{talent.headline} · {talent.experience} {lang === "my" ? "နှစ်" : "yrs"}</p>
                    </div>
                    {talent.available ? (
                      <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">{lang === "my" ? "ရနိုင်" : "Available"}</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{lang === "my" ? "မရနိုင်" : "Unavailable"}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {talent.location}</span>
                    <span className="flex items-center gap-1 text-[11px] text-primary"><Star className="h-3 w-3 fill-primary" strokeWidth={0} /> {talent.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({talent.reviews})</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {talent.skills.map(s => (
                      <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                    ))}
                  </div>
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
      </div>
    </div>
  );
};

export default SearchTalent;
