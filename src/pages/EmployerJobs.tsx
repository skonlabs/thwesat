import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Plus, Clock, CheckCircle, Pause, Play, XCircle, RotateCcw, Pencil, Trash2, Link2, Mail, Send, Share2, Loader2, MoreVertical, History } from "lucide-react";
import StatusHistorySheet from "@/components/StatusHistorySheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { employerLabels as L, getApplicationMethodLabel } from "@/lib/employer-labels";
import { shareJobLink } from "@/lib/share-job";
import { getJobStatusMeta } from "@/lib/status-labels";

const JOB_STATUS_KEYS = ["active", "pending", "paused", "closed", "rejected"] as const;
const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = Object.fromEntries(
  JOB_STATUS_KEYS.map((k) => {
    const m = getJobStatusMeta(k);
    return [k, { label: { my: m.my, en: m.en }, color: m.color, icon: m.icon }];
  })
);

const EmployerJobs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useEmployerJobs();
  const [filter, setFilter] = useState(searchParams.get("status") || "all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyJob, setHistoryJob] = useState<{ id: string; title: string } | null>(null);

  const handleStatusChange = async (jobId: string, newStatus: "active" | "paused" | "closed") => {
    setUpdatingId(jobId);
    try {
      const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setStatusMenuId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "ပြောင်း၍မရပါ: " : "Failed to update: ") + (err?.message || ""));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShare = async (job: { id: string; title: string; title_my: string | null; company: string }) => {
    setSharingId(job.id);
    try {
      await shareJobLink({
        jobId: job.id,
        title: lang === "my" && job.title_my ? job.title_my : job.title,
        company: job.company,
        lang,
      });
    } finally {
      setSharingId(null);
    }
  };

  useEffect(() => {
    setFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const updateFilter = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("status");
    else params.set("status", next);
    setSearchParams(params, { replace: true });
  };

  const listings = jobs || [];
  const filtered = filter === "all" ? listings : listings.filter(l => l.status === filter);

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
      toast.success(lang === "my" ? "ဖျက်ပြီးပါပြီ" : "Listing deleted");
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "ဖျက်၍မရပါ: " : "Failed to delete: ") + (err?.message || ""));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာများ" : "My Job Listings"} />

      <div className="mx-auto max-w-lg px-5 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {listings.length} {lang === "my" ? "စုစုပေါင်း" : "total"}
          </p>
          <Button size="sm" className="rounded-xl" onClick={() => navigate("/employer/post-job")}>
            <Plus className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အလုပ်တင်ရန်" : "Post Job"}
          </Button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "active", "pending", "paused", "closed", "rejected"].map(f => (
            <button
              key={f}
              onClick={() => updateFilter(f)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}
            >
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading..."}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ မရှိပါ" : "No job listings yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ပထမဆုံး အလုပ်ခေါ်စာကို တင်ပါ" : "Post your first job to start receiving applications"}</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/employer/post-job")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "အလုပ်တင်ရန်" : "Post a Job"}
              </Button>
            </div>
          ) : (
            filtered.map((listing, i) => {
              const sc = statusConfig[listing.status || "pending"] || statusConfig.pending;
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 active:bg-muted/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <button onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)} className="flex-1 text-left">
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" && listing.title_my ? listing.title_my : listing.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}</p>
                    </button>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                      <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? sc.label.my : sc.label.en}
                    </span>
                  </div>
                  {(() => {
                    const m = getApplicationMethodLabel((listing as any).application_method, lang);
                    const Icon = (listing as any).application_method === "external" ? Link2 : (listing as any).application_method === "email" ? Mail : Send;
                    return (
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" strokeWidth={1.5} />
                        <span>{L.applicationMethod[lang]}: <span className="font-medium text-foreground">{m.label}</span></span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between">
                    <button onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)} className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {listing.applicant_count || 0} {lang === "my" ? "လျှောက်" : "applied"}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleShare(listing)} disabled={sharingId === listing.id} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-60" title={lang === "my" ? "မျှဝေရန်" : "Share"}>
                        {sharingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" strokeWidth={1.5} />}
                      </button>
                      <button onClick={() => navigate(`/employer/edit-job/${listing.id}`)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted" title={lang === "my" ? "ပြင်ဆင်" : "Edit"}>
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      {(listing.status === "active" || listing.status === "paused" || listing.status === "closed") && (
                        <div className="relative">
                          <button
                            onClick={() => setStatusMenuId(statusMenuId === listing.id ? null : listing.id)}
                            disabled={updatingId === listing.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-60"
                            title={lang === "my" ? "အခြေအနေ" : "Status"}
                          >
                            {updatingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                          </button>
                          {statusMenuId === listing.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                              <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                                {listing.status === "paused" && (
                                  <button onClick={() => handleStatusChange(listing.id, "active")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                    <Play className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} /> {lang === "my" ? "ပြန်ဖွင့်ရန်" : "Resume"}
                                  </button>
                                )}
                                {listing.status === "active" && (
                                  <button onClick={() => handleStatusChange(listing.id, "paused")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                    <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ခေတ္တရပ်" : "Pause"}
                                  </button>
                                )}
                                {listing.status === "closed" ? (
                                  <button onClick={() => handleStatusChange(listing.id, "active")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                    <RotateCcw className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} /> {lang === "my" ? "ပြန်ဖွင့်" : "Reopen"}
                                  </button>
                                ) : (
                                  <button onClick={() => handleStatusChange(listing.id, "closed")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-destructive hover:bg-muted">
                                    <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ပိတ်ရန်" : "Close"}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <button onClick={() => setDeleteConfirmId(listing.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 active:bg-destructive/10" title={lang === "my" ? "ဖျက်ရန်" : "Delete"}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setDeleteConfirmId(null)}>
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

export default EmployerJobs;
