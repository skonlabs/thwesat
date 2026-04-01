import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const checklist = [
  { my: "ကုမ္ပဏီ ဝဘ်ဆိုဒ် ရှိ၍ တရားဝင်", en: "Company website exists & legitimate" },
  { my: "ငွေပေးချေနည်း တကယ်ရှိ", en: "Payment methods accessible to diaspora" },
  { my: "လစာနှုန်း သဘာဝကျ", en: "Salary range realistic" },
  { my: "Scam အညွှန်းကိန်း မရှိ", en: "No scam indicators" },
];

const AdminJobQueue = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["admin-pending-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const selected = jobs.find((j: any) => j.id === selectedId);

  const updateJob = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-jobs"] }),
  });

  const handleApprove = (id: string) => {
    updateJob.mutate({ id, status: "active" }, {
      onSuccess: () => { setSelectedId(null); },
    });
  };

  const handleReject = () => {
    if (!selectedId) return;
    updateJob.mutate({ id: selectedId, status: "rejected" }, {
      onSuccess: () => { setSelectedId(null); setShowReject(false); setRejectionReason(""); },
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာ စစ်ဆေးရေး" : "Job Verification Queue"} />
      <div className="px-5">
        <p className="mb-4 text-xs text-muted-foreground">{jobs.length} {lang === "my" ? "ခု စစ်ဆေးရန်ရှိ" : "pending review"}</p>
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any, i: number) => (
              <motion.button key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedId(job.id)} className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{job.company}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {formatTime(job.created_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {job.salary_min && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">${job.salary_min}-${job.salary_max}</span>}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{job.job_type}</span>
                  {job.requires_embassy && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">Embassy Required</span>}
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
        )}
      </div>

      {/* Review Sheet */}
      <AnimatePresence>
        {selected && !showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <h2 className="mb-1 text-lg font-bold text-foreground">{selected.title}</h2>
              <p className="mb-4 text-sm text-muted-foreground">{selected.company} · ${selected.salary_min || 0}-${selected.salary_max || 0}</p>
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
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowReject(true)}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ငြင်းပယ်" : "Reject"}</Button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => handleApprove(selected.id)}><CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အတည်ပြု" : "Approve"}</Button>
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
