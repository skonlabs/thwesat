import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Briefcase, Clock, Star, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

const categories = [
  { my: "အားလုံး", en: "All" },
  { my: "Tech", en: "Tech" },
  { my: "Design", en: "Design" },
  { my: "Management", en: "Management" },
  { my: "Finance", en: "Finance" },
  { my: "Teaching", en: "Teaching" },
];

const allJobs = [
  { title: "Senior React Developer", company: "TechCorp Asia", location: "Remote", type: "Full-time", salary: "$3,000 - $5,000/mo", postedAgo: { my: "2 နာရီ", en: "2 hours" }, saved: false, tags: ["React", "TypeScript", "Node.js"], category: "Tech" },
  { title: "UI/UX Designer", company: "DesignStudio BKK", location: "Bangkok, TH", type: "Full-time", salary: "$2,000 - $3,500/mo", postedAgo: { my: "5 နာရီ", en: "5 hours" }, saved: true, tags: ["Figma", "UI Design", "Prototyping"], category: "Design" },
  { title: "Project Coordinator", company: "NGO Partners", location: "Remote", type: "Contract", salary: "$1,800 - $2,800/mo", postedAgo: { my: "1 ရက်", en: "1 day" }, saved: false, tags: ["Project Mgmt", "English", "Reporting"], category: "Management" },
  { title: "Full Stack Developer", company: "StartupHub SG", location: "Singapore", type: "Full-time", salary: "$4,000 - $6,000/mo", postedAgo: { my: "1 ရက်", en: "1 day" }, saved: false, tags: ["Python", "React", "AWS"], category: "Tech" },
  { title: "Digital Marketing Manager", company: "Growth Co", location: "Remote", type: "Part-time", salary: "$1,500 - $2,500/mo", postedAgo: { my: "2 ရက်", en: "2 days" }, saved: true, tags: ["SEO", "Social Media", "Analytics"], category: "Finance" },
];

const Jobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [savedJobs, setSavedJobs] = useState<Record<number, boolean>>(
    Object.fromEntries(allJobs.map((j, i) => [i, j.saved]))
  );

  const filteredJobs = allJobs.filter(job => {
    const matchesSearch = search === "" || 
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || job.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSave = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedJobs(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">{lang === "my" ? "အလုပ်အကိုင်များ" : "Jobs"}</h1>
        <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "အဝေးထိန်း အလုပ်များ ရှာဖွေပါ" : "Browse remote opportunities"}</p>
        <div className="mb-4 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "my" ? "အလုပ်ခေါင်းစဉ်၊ ကုမ္ပဏီ..." : "Job title, company..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <button className="flex items-center justify-center rounded-xl border border-border bg-card px-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button key={cat.en} onClick={() => setActiveCategory(cat.en)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${activeCategory === cat.en ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"}`}>{lang === "my" ? cat.my : cat.en}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3 px-6 pb-6">
        {filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 text-center">
            <Briefcase className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရလဒ် မတွေ့ပါ" : "No jobs found"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ရှာဖွေမှုကို ပြောင်းကြည့်ပါ" : "Try adjusting your search or filters"}</p>
          </motion.div>
        ) : (
          filteredJobs.map((job, i) => {
            const origIndex = allJobs.indexOf(job);
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="cursor-pointer rounded-2xl bg-card p-4 shadow-card" onClick={() => navigate("/jobs/detail")}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Briefcase className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground" onClick={(e) => toggleSave(origIndex, e)}>
                    <Bookmark className={`h-4 w-4 ${savedJobs[origIndex] ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.tags.map((tag) => (<span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {job.location}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {job.type}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">{job.salary}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{lang === "my" ? `${job.postedAgo.my} အကြာက` : `${job.postedAgo.en} ago`}</span>
                  <Button variant="default" size="sm" className="rounded-lg text-xs">{lang === "my" ? "လျှောက်ထားရန်" : "Apply"}</Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Jobs;
