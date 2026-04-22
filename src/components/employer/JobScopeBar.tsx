import { useState } from "react";
import { Briefcase, ChevronDown, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { employerLabels as L } from "@/lib/employer-labels";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  jobId?: string;
  onSelectJob: (jobId: string | undefined) => void;
}

/**
 * Compact job-context bar shown on application-related employer pages.
 * - Shows current scoped job title (acts as breadcrumb)
 * - Tap to open a dropdown to switch to another listing or "All listings"
 */
const JobScopeBar = ({ jobId, onSelectJob }: Props) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { data: jobs = [] } = useEmployerJobs();
  const [open, setOpen] = useState(false);

  const current = jobs.find((j: any) => j.id === jobId);
  const currentTitle = current
    ? (lang === "my" && current.title_my ? current.title_my : current.title)
    : L.allJobs[lang];

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${jobId ? "border-primary/40 bg-primary/5" : "border-border bg-card"} active:bg-muted/30`}
        aria-expanded={open}
        aria-label={L.switchJob[lang]}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Briefcase className={`h-3.5 w-3.5 shrink-0 ${jobId ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
          <span className="truncate text-xs font-medium text-foreground">
            <span className="text-muted-foreground">{jobId ? `${L.filteredByJob[lang]}: ` : ""}</span>
            {currentTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {jobId && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelectJob(undefined); setOpen(false); }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted"
              aria-label="Clear filter"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-lg"
            >
              <button
                onClick={() => { onSelectJob(undefined); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted active:bg-muted"
              >
                <span>{L.allJobs[lang]}</span>
                {!jobId && <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />}
              </button>
              {jobs.length === 0 ? (
                <div className="px-3 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground">{L.noListings[lang]}</p>
                  <button onClick={() => { setOpen(false); navigate("/employer/post-job"); }} className="mt-1.5 text-[11px] font-medium text-primary">
                    {L.postJob[lang]}
                  </button>
                </div>
              ) : (
                jobs.map((j: any) => {
                  const title = lang === "my" && j.title_my ? j.title_my : j.title;
                  return (
                    <button
                      key={j.id}
                      onClick={() => { onSelectJob(j.id); setOpen(false); }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted active:bg-muted"
                    >
                      <span className="truncate text-xs text-foreground">{title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{j.applicant_count || 0}</span>
                        {jobId === j.id && <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />}
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobScopeBar;
