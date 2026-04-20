import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Clock, Briefcase, Pause, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const checklist = [
  { my: "ကုမ္ပဏီ ဝဘ်ဆိုဒ် ရှိ၍ တရားဝင်", en: "Company website exists & legitimate" },
  { my: "ငွေပေးချေနည်း တကယ်ရှိ", en: "Payment methods accessible to diaspora" },
  { my: "လစာနှုန်း သဘာဝကျ", en: "Salary range realistic" },
  { my: "Scam အညွှန်းကိန်း မရှိ", en: "No scam indicators" },
];

type FilterType = "all" | "pending" | "active" | "rejected" | "closed";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof Clock }> = {
  pending: { label: { my: "စစ်ဆေးဆဲ", en: "Pending" }, color: "bg-warning/10 text-warning", icon: Clock },
  active: { label: { my: "တက်ကြွ", en: "Active" }, color: "bg-emerald/10 text-emerald", icon: CheckCircle },
  rejected: { label: { my: "ငြင်းပယ်", en: "Rejected" }, color: "bg-destructive/10 text-destructive", icon: XCircle },
  closed: { label: { my: "ပိတ်ပြီး", en: "Closed" }, color: "bg-muted text-muted-foreground", icon: Pause },
};

const AdminJobQueue = () => {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = (searchParams.get("status") as FilterType) || "all";
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch ALL jobs for admin (not just pending)
  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ["admin-all-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const jobs = filter === "all" ? allJobs : allJobs.filter((j: any) => j.status === filter);
  const pendingCount = allJobs.filter((j: any) => j.status === "pending").length;
  const activeCount = allJobs.filter((j: any) => j.status === "active").length;
  const rejectedCount = allJobs.filter((j: any) => j.status === "rejected").length;

  const selected = allJobs.find((j: any) => j.id === selectedId);

  const updateJob = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      // Get job info before update for notification
      const { data: job } = await supabase.from("jobs").select("employer_id, title, title_my").eq("id", id).single();
      const { error } = await supabase.from("jobs").update({
        status,
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      }).eq("id", id);
      if (error) throw error;

      // Notify employer about job status
      if (job) {
        const isApproved = status === "active";
        await supabase.from("notifications").insert({
          user_id: job.employer_id,
          notification_type: "job",
          title: isApproved ? `Your job "${job.title}" has been approved!` : `Your job "${job.title}" was rejected`,
          title_my: isApproved ? `"${job.title_my || job.title}" အလုပ်ကြော်ငြာ အတည်ပြုပြီး!` : `"${job.title_my || job.title}" အလုပ်ကြော်ငြာ ငြင်းပယ်ခံရပြီ`,
          description: isApproved ? "Your job listing is now live and visible to job seekers." : (rejectionReason || "Your job listing did not meet our guidelines."),
          description_my: isApproved ? "သင့်အလုပ်ကြော်ငြာကို အလုပ်ရှာဖွေသူများ မြင်နိုင်ပါပြီ။" : (rejectionReason || "သင့်အလုပ်ကြော်ငြာသည် လမ်းညွှန်ချက်များနှင့် ကိုက်ညီမှု မရှိပါ။"),
          link_path: "/employer/dashboard",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  const handleApprove = (id: string) => {
    updateJob.mutate({ id, status: "active" }, {
      onSuccess: () => { setSelectedId(null); },
    });
  };

  const handleReject = () => {
    if (!selectedId) return;
    updateJob.mutate({ id: selectedId, status: "rejected", rejectionReason }, {
      onSuccess: () => { setSelectedId(null); setShowReject(false); setRejectionReason(""); },
    });
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) {
      toast.error(lang === "my" ? "ဖျက်၍ မရပါ" : "Failed to delete job");
    } else {
      toast.success(lang === "my" ? "အလုပ်ခေါ်စာ ဖျက်ပြီး" : "Job deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-all-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-counts"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
    setDeleteConfirmId(null);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filters: { id: FilterType; label: { my: string; en: string }; count: number }[] = [
    { id: "all", label: { my: "အားလုံး", en: "All" }, count: allJobs.length },
    { id: "pending", label: { my: "စစ်ဆေးရန်", en: "Pending" }, count: pendingCount },
    { id: "active", label: { my: "တက်ကြွ", en: "Active" }, count: activeCount },
    { id: "rejected", label: { my: "ငြင်းပယ်", en: "Rejected" }, count: rejectedCount },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာ စီမံခန့်ခွဲ" : "Job Management"} />
      <div className="px-5">
        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <button onClick={() => setFilter("all")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "all" ? "border-primary" : "border-border"}`}>
            <Briefcase className="mx-auto mb-1 h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{allJobs.length}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စုစုပေါင်း" : "Total"}</p>
          </button>
          <button onClick={() => setFilter("pending")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "pending" ? "border-primary" : "border-border"}`}>
            <Clock className="mx-auto mb-1 h-5 w-5 text-warning" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "စစ်ဆေးရန်" : "Pending"}</p>
          </button>
          <button onClick={() => setFilter("active")} className={`rounded-xl border bg-card p-3 text-center transition-colors active:bg-muted/30 ${filter === "active" ? "border-primary" : "border-border"}`}>
            <CheckCircle className="mx-auto mb-1 h-5 w-5 text-emerald" strokeWidth={1.5} />
            <p className="text-lg font-bold text-foreground">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "တက်ကြွ" : "Active"}</p>
          </button>
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {lang === "my" ? f.label.my : f.label.en} ({f.count})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any, i: number) => {
              const sc = statusConfig[job.status] || statusConfig.pending;
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-border bg-card p-4">
                  <button onClick={() => setSelectedId(job.id)} className="w-full text-left active:bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                        <p className="text-[11px] text-muted-foreground">{job.company}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                          <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                          {lang === "my" ? sc.label.my : sc.label.en}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(job.created_at)}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      {job.salary_min && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">${job.salary_min}-${job.salary_max}</span>}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{job.job_type}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{job.applicant_count || 0} {lang === "my" ? "လျှောက်" : "applied"}</span>
                      {job.requires_embassy && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">Embassy Required</span>}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2">
                    <button onClick={() => navigate(`/admin/edit-job/${job.id}`)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted active:bg-muted transition-colors" title={lang === "my" ? "ပြင်ဆင်" : "Edit"}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{lang === "my" ? "ပြင်ဆင်" : "Edit"}</span>
                    </button>
                    <button onClick={() => setDeleteConfirmId(job.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10 active:bg-destructive/10 transition-colors" title={lang === "my" ? "ဖျက်ရန်" : "Delete"}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{lang === "my" ? "ဖျက်" : "Delete"}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
            {jobs.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">
                  {filter === "pending"
                    ? (lang === "my" ? "စစ်ဆေးစရာ မရှိတော့ပါ" : "All caught up!")
                    : (lang === "my" ? "အလုပ်ခေါ်စာ မရှိပါ" : "No jobs found")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Sheet */}
      <AnimatePresence>
        {selected && !showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <h2 className="mb-1 text-lg font-bold text-foreground">{selected.title}</h2>
              <p className="mb-2 text-sm text-muted-foreground">{selected.company} · ${selected.salary_min || 0}-${selected.salary_max || 0}</p>

              {/* Job details */}
              <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                <p>{lang === "my" ? "တည်နေရာ" : "Location"}: {selected.location || "—"}</p>
                <p>{lang === "my" ? "အမျိုးအစား" : "Type"}: {selected.job_type || "—"}</p>
                <p>{lang === "my" ? "လျှောက်ထားသူ" : "Applicants"}: {selected.applicant_count || 0}</p>
                <p>{lang === "my" ? "အခြေအနေ" : "Status"}: {selected.status}</p>
                <p>{lang === "my" ? "ရက်စွဲ" : "Posted"}: {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"}</p>
                {selected.rejection_reason && (
                  <p className="text-destructive">{lang === "my" ? "ငြင်းပယ်ချက်" : "Rejection reason"}: {selected.rejection_reason}</p>
                )}
              </div>

              {selected.description && (
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold text-foreground">{lang === "my" ? "ဖော်ပြချက်" : "Description"}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Checklist for pending jobs */}
              {selected.status === "pending" && (
                <>
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
                </>
              )}

              {/* Actions for non-pending jobs */}
              {selected.status === "active" && (
                <div className="flex gap-3">
                  <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setShowReject(true)}><XCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပိတ်ရန်" : "Reject"}</Button>
                </div>
              )}

              {selected.status === "rejected" && (
                <Button variant="default" size="lg" className="w-full rounded-xl" onClick={() => handleApprove(selected.id)}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> {lang === "my" ? "ပြန်အတည်ပြု" : "Re-approve"}
                </Button>
              )}
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

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setDeleteConfirmId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ ဖျက်မည်" : "Delete Job Listing"}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{lang === "my" ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။ ဆက်လုပ်မည်လား?" : "This action cannot be undone. Continue?"}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirmId(null)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDeleteJob(deleteConfirmId)}>{lang === "my" ? "ဖျက်ရန်" : "Delete"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminJobQueue;
