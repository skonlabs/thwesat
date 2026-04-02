import { motion } from "framer-motion";
import { Bookmark, MapPin, Briefcase, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useSavedJobs, useToggleSaveJob } from "@/hooks/use-jobs";
import { formatJobSalary, translateJobLocation, translateJobTitle, translateJobType } from "@/lib/job-localization";

const SavedJobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: savedJobs, isLoading } = useSavedJobs();
  const toggleSave = useToggleSaveJob();

  const handleRemove = (jobId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSave.mutate({ jobId, isSaved: true });
  };

  const jobs = (savedJobs || []).map(s => s.jobs).filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs"} />
      <div className="space-y-3 px-5 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bookmark className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "သိမ်းထားသော အလုပ် မရှိပါ" : "No saved jobs"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "အလုပ်များကို Bookmark နှိပ်ပြီး သိမ်းထားပါ" : "Bookmark jobs to save them here"}</p>
          </div>
        ) : (
          jobs.map((job: any, i: number) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="rounded-xl border border-border bg-card p-4 active:bg-muted">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                </div>
                <button onClick={(e) => handleRemove(job.id, job.title, e)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive active:bg-destructive/10">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" strokeWidth={1.5} /> {translateJobLocation(job.location, lang)}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" strokeWidth={1.5} /> {translateJobType(job.job_type, lang)}</span>
                </div>
                <span className="text-xs font-semibold text-primary">{formatJobSalary(job, lang)}</span>
              </div>
              <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
                <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                  {lang === "my" ? "ကြည့်ရှုရန်" : "View"}
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
