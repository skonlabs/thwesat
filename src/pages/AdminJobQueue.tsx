import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Clock, Building2, Globe, Shield, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const pendingJobs = [
  { id: 1, title: "Senior React Developer", company: "TechCorp Asia", employer: "John Doe", submitted: "3 hours ago", scamFlags: [], salary: "$3,000-5,000", type: "Remote Full-Time", embassy: false, verified: true },
  { id: 2, title: "Customer Support Agent", company: "QuickHelp Co", employer: "Jane Smith", submitted: "5 hours ago", scamFlags: ["telegram only"], salary: "$500-800", type: "Remote Contract", embassy: false, verified: false },
  { id: 3, title: "Factory Worker", company: "MFG Thailand", employer: "Somchai P.", submitted: "8 hours ago", scamFlags: [], salary: "$400-600", type: "On-site", embassy: true, verified: true },
  { id: 4, title: "Data Entry Clerk", company: "Unknown LLC", employer: "Anon User", submitted: "12 hours ago", scamFlags: ["prepay", "processing fee"], salary: "$2,000-3,000", type: "Remote", embassy: false, verified: false },
];

const checklist = [
  { my: "အလုပ်ရှင် subscription တက်ကြွ", en: "Employer has active subscription" },
  { my: "ကုမ္ပဏီ ဝဘ်ဆိုဒ် ရှိ၍ တရားဝင်", en: "Company website exists & legitimate" },
  { my: "LinkedIn ကိုက်ညီ", en: "LinkedIn page matches" },
  { my: "ငွေပေးချေနည်း တကယ်ရှိ", en: "Payment methods accessible to diaspora" },
  { my: "သံရုံးစာရွက် flag မှန်ကန်", en: "Embassy doc flag correctly set" },
  { my: "လစာနှုန်း သဘာဝကျ", en: "Salary range realistic" },
  { my: "Scam အညွှန်းကိန်း မရှိ", en: "No scam indicators" },
  { my: "လျှောက်ထားနည်း သင့်တော်", en: "Application method appropriate" },
];

const AdminJobQueue = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [jobs, setJobs] = useState(pendingJobs);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const selected = jobs.find(j => j.id === selectedId);

  const handleApprove = (id: number) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setSelectedId(null);
    toast({ title: lang === "my" ? "အတည်ပြုပြီးပါပြီ ✓" : "Listing approved ✓" });
  };

  const handleReject = () => {
    if (selectedId) {
      setJobs(prev => prev.filter(j => j.id !== selectedId));
      setSelectedId(null);
      setShowReject(false);
      setRejectionReason("");
      toast({ title: lang === "my" ? "ငြင်းပယ်ပြီးပါပြီ" : "Listing rejected" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာ စစ်ဆေးရေး" : "Job Verification Queue"} />
      <div className="px-5">
        <p className="mb-4 text-xs text-muted-foreground">{jobs.length} {lang === "my" ? "ခု စစ်ဆေးရန်ရှိ" : "pending review"}</p>

        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.button
              key={job.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedId(job.id)}
              className={`w-full rounded-xl border bg-card p-4 text-left active:bg-muted/30 ${job.scamFlags.length > 0 ? "border-destructive/30" : "border-border"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{job.company} · {job.employer}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {job.submitted}</span>
                  {job.scamFlags.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {lang === "my" ? "Scam သံသယ" : "Flagged"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{job.salary}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{job.type}</span>
                {job.embassy && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">Embassy Required</span>}
                {!job.verified && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">Unverified Employer</span>}
              </div>
            </motion.button>
          ))}
          {jobs.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <CheckCircle className="mb-3 h-10 w-10 text-emerald" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">{lang === "my" ? "စစ်ဆေးစရာ မရှိတော့ပါ" : "All caught up!"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Sheet */}
      <AnimatePresence>
        {selected && !showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 pb-24" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <h2 className="mb-1 text-lg font-bold text-foreground">{selected.title}</h2>
              <p className="mb-4 text-sm text-muted-foreground">{selected.company} · {selected.salary}</p>

              {selected.scamFlags.length > 0 && (
                <div className="mb-4 rounded-xl bg-destructive/5 p-3">
                  <p className="text-xs font-bold text-destructive">⚠️ {lang === "my" ? "Scam အညွှန်းကိန်းများ" : "Scam Flags"}</p>
                  {selected.scamFlags.map((f, i) => (
                    <p key={i} className="mt-1 text-[11px] text-foreground/80">• {f}</p>
                  ))}
                </div>
              )}

              <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "စစ်ဆေးရန် အခြေခံ" : "Review Checklist"}</h3>
              <div className="mb-4 space-y-2">
                {checklist.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))} className="h-4 w-4 rounded border-primary accent-primary" />
                    <span className="text-xs text-foreground">{lang === "my" ? item.my : item.en}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowReject(true)}>
                  <XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                </Button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => handleApprove(selected.id)}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowReject(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ငြင်းပယ်ရသည့် အကြောင်းရင်း" : "Rejection Reason"}</h3>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder={lang === "my" ? "အကြောင်းရင်း ရေးပါ..." : "Explain why..."} className="mb-3 min-h-[80px] rounded-xl" />
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => setShowReject(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleReject} disabled={!rejectionReason}>{lang === "my" ? "ငြင်းပယ်ရန်" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminJobQueue;
