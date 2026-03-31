import { motion } from "framer-motion";
import { Bookmark, MapPin, Briefcase, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const savedJobs = [
  { title: "Senior React Developer", company: "TechCorp Asia", location: "Remote", salary: "$3,000 - $5,000/mo", savedDate: "Mar 28", type: "Full-time" },
  { title: "Digital Marketing Manager", company: "Growth Co", location: "Remote", salary: "$1,500 - $2,500/mo", savedDate: "Mar 25", type: "Part-time" },
  { title: "Product Designer", company: "Creative Lab", location: "Bangkok, TH", salary: "$2,500 - $4,000/mo", savedDate: "Mar 20", type: "Full-time" },
];

const SavedJobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs"}</h1>
            <p className="text-xs text-muted-foreground">{savedJobs.length} {lang === "my" ? "ခု" : "jobs"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-6 pb-6">
        {savedJobs.map((job, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                  <p className="text-xs text-muted-foreground">{job.company}</p>
                </div>
              </div>
              <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {job.location}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {job.type}</span>
              </div>
              <span className="text-xs font-semibold text-primary">{job.salary}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[10px] text-muted-foreground">{lang === "my" ? "သိမ်းထားသည်" : "Saved"} {job.savedDate}</span>
              <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={() => navigate("/jobs/detail")}>
                {lang === "my" ? "ကြည့်ရှုရန်" : "View"}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SavedJobs;
