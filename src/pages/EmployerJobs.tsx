import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Plus, Clock, CheckCircle, Pause, Play, XCircle, RotateCcw, Pencil, Trash2, Link2, Mail, Send, Share2, Loader2, MoreVertical, History, Sparkles } from "lucide-react";
import SpendConfirmSheet from "@/components/wallet/SpendConfirmSheet";
import StatusHistorySheet from "@/components/StatusHistorySheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerJobs, useEmployerJobApplicantBreakdown } from "@/hooks/use-jobs";
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

const PAGE_SIZE = 20;

const EmployerJobs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useEmployerJobs();
  const isAgent = typeof window !== "undefined" && window.location.pathname.startsWith("/agent");
  const postJobPath = isAgent ? "/agent/post-job" : "/employer/post-job";
  const applicationsPath = isAgent ? "/agent/candidates" : "/employer/applications";
  const editJobPath = (id: string) => isAgent ? `/agent/edit-job/${id}` : `/employer/edit-job/${id}`;
  const { data: breakdown } = useEmployerJobApplicantBreakdown();
  const [filter, setFilter] = useState(searchParams.get("status") || "all");
  const [page, setPage] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyJob, setHistoryJob] = useState<{ id: string; title: string } | null>(null);
  const [featureJobId, setFeatureJobId] = useState<string | null>(null);

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
    setPage(0);
  };

  const listings = jobs || [];
  const filtered = filter === "all" ? listings : listings.filter(l => l.status === filter);
  const totalFiltered = filtered.length;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalFiltered);
  const pagedFiltered = filtered.slice(pageStart, pageEnd);

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

  const statusCounts: Record<string, number> = {
    all: listings.length,
    ...Object.fromEntries(JOB_STATUS_KEYS.map(k => [k, listings.filter(l => l.status === k).length])),
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာများ" : "My Job Listings"} />

      <div className="px-5 pt-5">
        {/* Header row: total + post CTA */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "my" ? "ခေါ်ယူမှု" : "Postings"}
            </p>
            <p className="text-lg font-bold text-foreground leading-tight">
              {listings.length} <span className="text-xs font-medium text-muted-foreground">{lang === "my" ? "စုစုပေါင်း" : "total"}</span>
            </p>
          </div>
          <Button size="sm" className="rounded-xl" onClick={() => navigate(postJobPath)}>
            <Plus className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အလုပ်တင်ရန်" : "Post Job"}
          </Button>
        </div>

        {/* KPI tile filters — consistent with Applications pipeline */}
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
          {lang === "my" ? "အခြေအနေအလိုက်" : "By status"}
        </p>
        <div className="mb-5 -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
          {(["all", ...JOB_STATUS_KEYS] as const).map((f) => {
            const active = filter === f;
            const tone =
              f === "all" ? "border-border" :
              f === "active" ? "border-emerald/40" :
              f === "pending" ? "border-amber-400" :
              f === "paused" ? "border-border" :
              f === "closed" ? "border-border" :
              "border-destructive/40";
            const label = f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en);
            return (
              <button
                key={f}
                onClick={() => updateFilter(f)}
                className={`min-w-[68px] shrink-0 rounded-xl border-2 bg-card p-2.5 text-center transition-all active:bg-muted/30 ${active ? `${tone} shadow-sm ring-2 ring-primary/20` : "border-border"}`}
              >
                <p className="text-lg font-bold leading-tight text-foreground">{statusCounts[f] ?? 0}</p>
                <p className="mt-0.5 text-[9px] font-medium leading-tight text-muted-foreground">{label}</p>
              </button>
            );
          })}
        </div>

        <div className={pagedFiltered.length > 0 ? "" : "space-y-3"}>
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
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(postJobPath)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "အလုပ်တင်ရန်" : "Post a Job"}
              </Button>
            </div>
          ) : (
            <>
            {totalFiltered > PAGE_SIZE && (
              <p className="mb-2 text-xs text-muted-foreground">
                {lang === "my"
                  ? `${pageStart + 1}–${pageEnd} / ${totalFiltered} ဖော်ပြနေသည်`
                  : `Showing ${pageStart + 1}–${pageEnd} of ${totalFiltered} jobs`}
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedFiltered.map((listing, i) => {
              const sc = statusConfig[listing.status || "pending"] || statusConfig.pending;
              const m = getApplicationMethodLabel((listing as any).application_method, lang);
              const MIcon = (listing as any).application_method === "external" ? Link2 : (listing as any).application_method === "email" ? Mail : Send;
              const b = breakdown?.get(listing.id) || { total: listing.applicant_count || 0, new: 0, shortlisted: 0, interview: 0, offered: 0, placed: 0, rejected: 0 };
              const chips: { key: string; label: string; count: number; color: string; filter?: string }[] = [
                { key: "new", label: lang === "my" ? "အသစ်" : "New", count: b.new, color: "bg-primary/10 text-primary", filter: "new" },
                { key: "shortlisted", label: lang === "my" ? "ရွေး" : "Shortlist", count: b.shortlisted, color: "bg-emerald/10 text-emerald", filter: "shortlisted" },
                { key: "interview", label: lang === "my" ? "အင်တာဗျူး" : "Interview", count: b.interview, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200", filter: "interview" },
                { key: "offered", label: lang === "my" ? "ကမ်းလှမ်း" : "Offered", count: b.offered, color: "bg-emerald/10 text-emerald", filter: "offered" },
                { key: "placed", label: lang === "my" ? "ခန့်အပ်" : "Placed", count: b.placed, color: "bg-emerald text-emerald-foreground", filter: "placed" },
              ];
              const visibleChips = chips.filter(c => c.count > 0);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  {/* Top: title + status badge */}
                  <button
                    onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)}
                    className="flex w-full items-start justify-between gap-3 px-4 pt-4 pb-3 text-left active:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5">
                        {listing.is_featured && (
                          <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} /> {lang === "my" ? "ထိပ်တန်း" : "Featured"}
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {lang === "my" && listing.title_my ? listing.title_my : listing.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="flex items-center gap-1">
                          <MIcon className="h-2.5 w-2.5" strokeWidth={1.5} />
                          {m.label}
                        </span>
                      </div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                      <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? sc.label.my : sc.label.en}
                    </span>
                  </button>

                  {/* Applicants summary */}
                  <button
                    onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)}
                    className="flex w-full items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-left active:bg-muted/40"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.5} /> {b.total} {lang === "my" ? "လျှောက်" : "applicants"}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {visibleChips.length > 0 ? (
                        visibleChips.map(c => (
                          <span key={c.key} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.color}`} title={c.label}>
                            {c.count} {c.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{lang === "my" ? "လျှောက်ထားသူ မရှိသေး" : "No applicants yet"}</span>
                      )}
                    </div>
                  </button>

                  {/* Action bar */}
                  <div className="flex items-center justify-between gap-1 border-t border-border/60 px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => navigate(`/employer/edit-job/${listing.id}`)} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted active:bg-muted">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ပြင်" : "Edit"}
                      </button>
                      <button onClick={() => handleShare(listing)} disabled={sharingId === listing.id} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-60">
                        {sharingId === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        {lang === "my" ? "မျှဝေ" : "Share"}
                      </button>
                      <button onClick={() => setHistoryJob({ id: listing.id, title: lang === "my" && listing.title_my ? listing.title_my : listing.title })} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted active:bg-muted">
                        <History className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "မှတ်တမ်း" : "History"}
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {listing.status === "active" && !listing.is_featured && (
                        <button onClick={() => setFeatureJobId(listing.id)} className="flex h-9 items-center gap-1 rounded-lg bg-amber-100 px-2 text-[10px] font-semibold text-amber-900 active:bg-amber-200 dark:bg-amber-950 dark:text-amber-100" title={lang === "my" ? "ထိပ်တန်း ပြသရန်" : "Feature this job"}>
                          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ထိပ်တန်း" : "Feature"}
                        </button>
                      )}
                      {(listing.status === "active" || listing.status === "paused" || listing.status === "closed") && (
                        <div className="relative">
                          <button
                            onClick={() => setStatusMenuId(statusMenuId === listing.id ? null : listing.id)}
                            disabled={updatingId === listing.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-60"
                            title={lang === "my" ? "နောက်ထပ်" : "More"}
                          >
                            {updatingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                          </button>
                          {statusMenuId === listing.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                              <div className="absolute right-0 bottom-10 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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
                                  <button onClick={() => handleStatusChange(listing.id, "closed")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                    <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ပိတ်ရန်" : "Close"}
                                  </button>
                                )}
                                <button onClick={() => { setStatusMenuId(null); setDeleteConfirmId(listing.id); }} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-destructive hover:bg-destructive/5">
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ဖျက်ရန်" : "Delete"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {!(listing.status === "active" || listing.status === "paused" || listing.status === "closed") && (
                        <button onClick={() => setDeleteConfirmId(listing.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 active:bg-destructive/10" title={lang === "my" ? "ဖျက်ရန်" : "Delete"}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
            {totalFiltered > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  {lang === "my" ? "နောက်သို့" : "Previous"}
                </Button>
                <span className="text-xs text-muted-foreground">{page + 1} / {Math.ceil(totalFiltered / PAGE_SIZE)}</span>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage(p => p + 1)} disabled={pageEnd >= totalFiltered}>
                  {lang === "my" ? "ရှေ့သို့" : "Next"}
                </Button>
              </div>
            )}
            </>
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

      <StatusHistorySheet
        open={!!historyJob}
        onClose={() => setHistoryJob(null)}
        kind="job"
        recordId={historyJob?.id || null}
        subtitle={historyJob?.title}
      />

      <SpendConfirmSheet
        open={!!featureJobId}
        onOpenChange={(o) => { if (!o) setFeatureJobId(null); }}
        actionKey="featured_job"
        targetType="job"
        targetId={featureJobId || undefined}
        idempotencyKey={featureJobId ? `featured_job:${featureJobId}:${Date.now()}` : undefined}
        onSuccess={() => {
          setFeatureJobId(null);
          queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
        }}
      />
    </div>
  );
};

export default EmployerJobs;
