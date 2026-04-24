import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, MapPin, Briefcase, Clock, Trash2, Shield, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";
import { useSavedJobs, useToggleSaveJob } from "@/hooks/use-jobs";
import { formatJobSalary, translateJobLocation, translateJobTitle, translateJobType } from "@/lib/job-localization";
import ListSkeleton from "@/components/ListSkeleton";

function relativeDate(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (lang === "my") {
    if (mins < 1) return "ယခုလေး";
    if (mins < 60) return `${mins} မိနစ် အရင်က`;
    if (hours < 24) return `${hours} နာရီ အရင်က`;
    if (days < 7) return `${days} ရက် အရင်က`;
    if (weeks < 5) return `${weeks} ပတ် အရင်က`;
    return `${months} လ အရင်က`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

const SavedJobs = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: savedJobs, isLoading } = useSavedJobs();
  const toggleSave = useToggleSaveJob();
  const [confirmRemoveJobId, setConfirmRemoveJobId] = useState<string | null>(null);

  const handleRemoveConfirm = () => {
    if (!confirmRemoveJobId) return;
    toggleSave.mutate({ jobId: confirmRemoveJobId, isSaved: true });
    setConfirmRemoveJobId(null);
  };

  // savedJobs entries include created_at from the saved_jobs table
  const savedEntries = (savedJobs || []).filter((s: any) => s.jobs);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "သိမ်းထားသော အလုပ်များ" : "Saved Jobs"} backPath="/jobs" />
      <div className="space-y-3 px-5 pb-24">
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : savedEntries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bookmark className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "သိမ်းထားသော အလုပ် မရှိပါ" : "No saved jobs"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "အလုပ်များကို Bookmark နှိပ်ပြီး သိမ်းထားပါ" : "Bookmark jobs to save them here"}</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/jobs")}>
              {lang === "my" ? "အလုပ်ရှာဖွေရန်" : "Browse Jobs"}
            </Button>
          </div>
        ) : (
          savedEntries.map((saved: any, i: number) => {
            const job = saved.jobs;
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/jobs/${job.id}?from=saved`)}
                className="rounded-xl border border-border bg-card p-4 active:bg-muted">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                        {job.is_diaspora_safe && (
                          <span className="flex items-center rounded bg-emerald/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald">
                            <Shield className="mr-0.5 h-2.5 w-2.5" strokeWidth={2} />{lang === "my" ? "လုံခြုံ" : "Safe"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                      {(saved.created_at || saved.saved_at) && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Calendar className="h-3 w-3" strokeWidth={1.5} />
                          {lang === "my"
                            ? `သိမ်းသည့်ရက်: ${relativeDate(saved.saved_at || saved.created_at, lang)}`
                            : `Saved ${relativeDate(saved.saved_at || saved.created_at, lang)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmRemoveJobId(job.id); }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive active:bg-destructive/10"
                  >
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
                  <Button variant="default" size="sm" className="rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}?from=saved`); }}>
                    {lang === "my" ? "ကြည့်ရှုရန်" : "View"}
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Remove confirmation dialog */}
      <AnimatePresence>
        {confirmRemoveJobId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6"
            onClick={() => setConfirmRemoveJobId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="mb-2 text-base font-bold text-foreground">
                {lang === "my" ? "သိမ်းထားသော အလုပ်မှ ဖယ်ရှားမည်လား?" : "Remove this job from saved?"}
              </h3>
              <p className="mb-5 text-xs text-muted-foreground">
                {lang === "my"
                  ? "အလုပ်ကြော်ငြာမှ ထပ်မံ သိမ်းနိုင်ပါသည်။"
                  : "You can save it again from the job listing."}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmRemoveJobId(null)}>
                  {lang === "my" ? "မလုပ်တော့" : "Cancel"}
                </Button>
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={handleRemoveConfirm}>
                  {lang === "my" ? "ဖယ်ရှားရန်" : "Remove"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedJobs;
