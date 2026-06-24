import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Pause, Play, XCircle, RotateCcw, Pencil, Trash2, Loader2, MoreVertical, History, Sparkles, Share2, Search, CheckCircle, Copy, Eye, Users, Target } from "lucide-react";
import { useHasMatchingPack } from "@/hooks/use-matching-pack";
import { Input } from "@/components/ui/input";
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
import { isJobExpired } from "@/lib/job-expiry";

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
  const matchesPath = (id: string) => isAgent ? `/agent/jobs/${id}/matches` : `/employer/jobs/${id}/matches`;
  const { data: breakdown } = useEmployerJobApplicantBreakdown();
  const { data: hasMatchingPack } = useHasMatchingPack();
  const [filter, setFilter] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState("");
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
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let base = filter === "all" ? listings : listings.filter(l => l.status === filter);
    if (q) {
      base = base.filter(l =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.title_my || "").toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [listings, filter, q]);
  const totalFiltered = filtered.length;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalFiltered);
  const pagedFiltered = filtered.slice(pageStart, pageEnd);

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "ဖျက်၍မရပါ: " : "Failed to delete: ") + (err?.message || ""));
    }
  };

  /**
   * A8 — Repost: duplicate a closed/rejected job into a fresh draft so the
   * employer doesn't have to retype everything. The new row is created as
   * `pending` (re-moderation) and the user is dropped into the edit screen.
   */
  const handleRepost = async (jobId: string) => {
    setStatusMenuId(null);
    setUpdatingId(jobId);
    try {
      const { data: source, error: fetchErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (fetchErr || !source) throw fetchErr || new Error("not_found");
      const { id, created_at, updated_at, applicant_count, embedding, embedding_input_hash, embedding_updated_at, is_verified, is_featured, ...rest } = source as any;
      const { data: created, error: insErr } = await supabase
        .from("jobs")
        .insert({ ...rest, status: "pending", is_verified: false, is_featured: false, applicant_count: 0 })
        .select("id")
        .single();
      if (insErr) throw insErr;
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      navigate(editJobPath(created.id));
    } catch (err: any) {
      toast.error((lang === "my" ? "ပြန်တင်၍မရပါ: " : "Failed to repost: ") + (err?.message || ""));
    } finally {
      setUpdatingId(null);
    }
  };

  const statusCounts: Record<string, number> = {
    all: listings.length,
    ...Object.fromEntries(JOB_STATUS_KEYS.map(k => [k, listings.filter(l => l.status === k).length])),
  };

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <PageHeader title={lang === "my" ? "အလုပ်ခေါ်စာများ" : "My Job Listings"} />

      <div className="mx-auto max-w-6xl px-5 pt-5 md:px-8">
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

        {/* Search bar */}
        {listings.length > 0 && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={lang === "my" ? "ခေါင်းစဉ် သို့ ကုမ္ပဏီ ရှာရန်..." : "Search by title or company..."}
              className="h-10 rounded-xl pl-9"
            />
          </div>
        )}

        {/* Status pills — only show statuses that have items */}
        <div className="mb-5 -mx-1 flex items-stretch gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
          {(["all", ...JOB_STATUS_KEYS] as const)
            .filter(f => f === "all" || (statusCounts[f] ?? 0) > 0)
            .map((f) => {
              const active = filter === f;
              const label = f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en);
              return (
                <button
                  key={f}
                  onClick={() => updateFilter(f)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted/40"}`}
                >
                  {label} <span className={`ml-1 ${active ? "opacity-80" : "text-muted-foreground"}`}>{statusCounts[f] ?? 0}</span>
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
            <div className="rounded-2xl border border-border bg-card [&>*:first-child]:rounded-t-2xl [&>*:last-child]:rounded-b-2xl">
            {pagedFiltered.map((listing, i) => {
              const sc = statusConfig[listing.status || "pending"] || statusConfig.pending;
              const expired = isJobExpired(listing.expires_at);
              const b = breakdown?.get(listing.id) || { total: listing.applicant_count || 0, new: 0, shortlisted: 0, interview: 0, offered: 0, placed: 0, rejected: 0 };
              const dotColor =
                listing.status === "active" ? "bg-emerald" :
                listing.status === "pending" ? "bg-amber-400" :
                listing.status === "rejected" ? "bg-destructive" :
                "bg-muted-foreground/40";
              const stageChips: { key: string; label: string; count: number; tone: string; stage: string }[] = [
                { key: "new", label: lang === "my" ? "အသစ်" : "New", count: b.new, tone: "bg-primary/10 text-primary hover:bg-primary/15", stage: "new" },
                { key: "shortlisted", label: lang === "my" ? "ရွေး" : "Short", count: b.shortlisted, tone: "bg-emerald/10 text-emerald hover:bg-emerald/15", stage: "shortlisted" },
                { key: "interview", label: lang === "my" ? "အင်တာဗျူး" : "Intv", count: b.interview, tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 hover:bg-amber-200/70", stage: "interview" },
                { key: "offered", label: lang === "my" ? "ကမ်းလှမ်း" : "Offer", count: b.offered, tone: "bg-emerald/10 text-emerald hover:bg-emerald/15", stage: "offered" },
                { key: "placed", label: lang === "my" ? "ခန့်အပ်" : "Placed", count: b.placed, tone: "bg-emerald text-emerald-foreground hover:bg-emerald/90", stage: "placed" },
              ];
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.02 }}
                  className={`group flex flex-col gap-2 border-b border-border/60 px-4 py-3 last:border-b-0 hover:bg-muted/30 md:flex-row md:items-center md:gap-4 md:py-2.5`}
                >
                  {/* Title + status */}
                  <button
                    onClick={() => navigate(`${applicationsPath}?jobId=${listing.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    title={lang === "my" ? "ကိုယ်စားလှယ်များ ကြည့်ရန်" : "Review candidates"}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} title={lang === "my" ? sc.label.my : sc.label.en} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {lang === "my" && listing.title_my ? listing.title_my : listing.title}
                        </h3>
                        {listing.is_featured && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            <Sparkles className="h-2 w-2" strokeWidth={2} /> {lang === "my" ? "ထိပ်တန်း" : "Featured"}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        <span className="capitalize">{lang === "my" ? sc.label.my : sc.label.en}</span>
                        {listing.created_at && <> · {new Date(listing.created_at).toLocaleDateString()}</>}
                        {listing.expires_at && <> · {expired ? (lang === "my" ? "သက်တမ်းကုန်" : "Expired") : (lang === "my" ? "ကုန်ဆုံး" : "Expires")} {new Date(listing.expires_at).toLocaleDateString()}</>}
                        {b.total > 0 && <> · {b.total} {lang === "my" ? "လျှောက်" : `applicant${b.total === 1 ? "" : "s"}`}</>}
                      </p>
                    </div>
                  </button>

                  {/* Pipeline chips — clickable, deep-link to stage */}
                  <div className="flex flex-wrap items-center gap-1 md:shrink-0">
                    {stageChips.filter(c => c.count > 0).length === 0 ? (
                      <span className="text-[10px] italic text-muted-foreground/70">
                        {lang === "my" ? "လျှောက်ထားသူ မရှိသေး" : "No applicants yet"}
                      </span>
                    ) : (
                      stageChips.filter(c => c.count > 0).map(c => (
                        <button
                          key={c.key}
                          onClick={(e) => { e.stopPropagation(); navigate(`${applicationsPath}?jobId=${listing.id}&stage=${c.stage}`); }}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${c.tone}`}
                          title={`${c.count} ${c.label}`}
                        >
                          {c.count} {c.label}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Action cluster */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => navigate(`/jobs/${listing.id}`)}
                      title={lang === "my" ? "ကြည့်ရန်" : "View"}
                    >
                      <Eye className="h-3.5 w-3.5 md:mr-1" strokeWidth={1.75} />
                      <span className="hidden md:inline">{lang === "my" ? "ကြည့်" : "View"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => navigate(editJobPath(listing.id))}
                      title={lang === "my" ? "ပြင်ရန်" : "Edit"}
                    >
                      <Pencil className="h-3.5 w-3.5 md:mr-1" strokeWidth={1.75} />
                      <span className="hidden md:inline">{lang === "my" ? "ပြင်" : "Edit"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => navigate(`${applicationsPath}?jobId=${listing.id}`)}
                      title={lang === "my" ? "လျှောက်ထားသူများ" : "Applicants"}
                    >
                      <Users className="h-3.5 w-3.5 md:mr-1" strokeWidth={1.75} />
                      <span className="hidden md:inline">{lang === "my" ? "လျှောက်သူ" : "Applicants"}</span>
                    </Button>
                    <div className="relative">
                      <button
                        onClick={() => setStatusMenuId(statusMenuId === listing.id ? null : listing.id)}
                        disabled={updatingId === listing.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted disabled:opacity-60"
                        title={lang === "my" ? "နောက်ထပ်" : "More actions"}
                      >
                        {updatingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                      </button>
                      {statusMenuId === listing.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                          <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                            <button onClick={() => { setStatusMenuId(null); handleShare(listing); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                              <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "မျှဝေရန်" : "Share link"}
                            </button>
                            <button onClick={() => { setStatusMenuId(null); setHistoryJob({ id: listing.id, title: lang === "my" && listing.title_my ? listing.title_my : listing.title }); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                              <History className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "မှတ်တမ်း" : "Status history"}
                            </button>
                            {listing.status === "active" && !listing.is_featured && (
                              <button onClick={() => { setStatusMenuId(null); setFeatureJobId(listing.id); }} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40">
                                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ထိပ်တန်းတင်" : "Promote to Featured"}
                              </button>
                            )}
                            {listing.status === "active" && (
                              <button onClick={() => handleStatusChange(listing.id, "paused")} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ခေတ္တရပ်" : "Pause"}
                              </button>
                            )}
                            {listing.status === "paused" && (
                              <button onClick={() => handleStatusChange(listing.id, "active")} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                <Play className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} /> {lang === "my" ? "ပြန်ဖွင့်" : "Resume"}
                              </button>
                            )}
                            {listing.status === "closed" ? (
                              <button onClick={() => handleStatusChange(listing.id, "active")} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                <RotateCcw className="h-3.5 w-3.5 text-emerald" strokeWidth={1.5} /> {lang === "my" ? "ပြန်ဖွင့်" : "Reopen"}
                              </button>
                            ) : (listing.status === "active" || listing.status === "paused") && (
                              <button onClick={() => handleStatusChange(listing.id, "closed")} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-muted">
                                <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ပိတ်ရန်" : "Close"}
                              </button>
                            )}
                            {(listing.status === "closed" || listing.status === "rejected") && (
                              <button onClick={() => handleRepost(listing.id)} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-primary hover:bg-primary/5">
                                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ပြန်တင်ရန်" : "Repost as new draft"}
                              </button>
                            )}
                            <button onClick={() => { setStatusMenuId(null); setDeleteConfirmId(listing.id); }} className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-destructive hover:bg-destructive/5">
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {lang === "my" ? "ဖျက်ရန်" : "Delete"}
                            </button>
                          </div>
                        </>
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
              {(() => {
                const job = listings.find(l => l.id === deleteConfirmId);
                const count = job?.applicant_count || 0;
                return (
                  <>
                    <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ ဖျက်မည်" : "Delete Job Listing"}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {lang === "my"
                        ? `ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။${count > 0 ? ` ဆက်စပ်လျှောက်လွှာ ${count} ခုပါ ဖျက်ပစ်မည်။` : ""} ဆက်လုပ်မည်လား?`
                        : `This action cannot be undone.${count > 0 ? ` ${count} application${count === 1 ? "" : "s"} will also be permanently deleted.` : ""} Continue?`}
                    </p>
                  </>
                );
              })()}
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
