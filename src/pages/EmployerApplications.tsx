import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MessageCircle, X, CheckCircle, Clock, Eye, XCircle, Users, Briefcase, Plus, Pencil, MapPin, Eye as EyeIcon, Calendar, History, Lock, Phone, Mail, Search, ArrowLeft, Inbox, Check, ArrowUpDown } from "lucide-react";
import StatusHistorySheet from "@/components/StatusHistorySheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerApplications, useEmployerJobs, useEmployerJobApplicantBreakdown } from "@/hooks/use-jobs";
import { useUpdateApplicationStatus } from "@/hooks/use-employer-data";
import { useAuth } from "@/hooks/use-auth";
import { useStartConversation } from "@/hooks/use-start-conversation";
import PageHeader from "@/components/PageHeader";
import SpendConfirmSheet from "@/components/wallet/SpendConfirmSheet";
import { useFeatureUnlocks } from "@/hooks/use-wallet";
import { useMyQuotas } from "@/hooks/use-subscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { employerLabels as L } from "@/lib/employer-labels";
import { useRoleLabels } from "@/hooks/use-role-labels";
import { calculatePlacementFee, PLACEMENT_FEE_PERCENT, PLACEMENT_PLATFORM_COMMISSION, roundMmk } from "@/lib/finance";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { getApplicationStatusMeta } from "@/lib/status-labels";

const NEW_APPLICATION_STATUSES = ["applied", "submitted"];
const INTERVIEW_APPLICATION_STATUSES = ["interview", "interviewed"];

// Local lookup built from the shared status registry (employer perspective:
// `applied`/`submitted` show as "New" in the employer's inbox).
const APP_STATUS_KEYS = [
  "applied", "submitted", "viewed", "shortlisted", "interview", "interviewed",
  "offered", "rejected", "placed", "withdrawn",
] as const;
const statusConfig: Record<string, { label: { my: string; en: string }; color: string }> = Object.fromEntries(
  APP_STATUS_KEYS.map((k) => {
    const m = getApplicationStatusMeta(k, "employer");
    return [k, { label: { my: m.my, en: m.en }, color: m.color }];
  })
);


const rejectionReasons = [
  { my: "အတွေ့အကြုံ မလုံလောက်", en: "Not enough experience" },
  { my: "ကျွမ်းကျင်မှု မကိုက်ညီ", en: "Skills mismatch" },
  { my: "ရာထူး ပြည့်ပြီး", en: "Position filled" },
  { my: "အခြား", en: "Other" },
];

const EmployerApplications = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const { toast: toastUI } = useToast();
  const jobIdParam = searchParams.get("jobId") || undefined;
  const { data: applications, isLoading } = useEmployerApplications(jobIdParam);
  const updateStatus = useUpdateApplicationStatus();
  const { profile } = useAuth();
  const isAgent = profile?.primary_role === "agent";
  const roleLabels = useRoleLabels();
  const { startConversation } = useStartConversation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [showPlacementConfirm, setShowPlacementConfirm] = useState(false);
  const [showInterviewDate, setShowInterviewDate] = useState(false);
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [pendingInterviewId, setPendingInterviewId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [placementSalary, setPlacementSalary] = useState("");
  const [filter, setFilter] = useState(searchParams.get("stage") || searchParams.get("filter") || "all");
  const [sort, setSort] = useState<"newest" | "oldest">(((searchParams.get("sort") as any) === "oldest" ? "oldest" : "newest"));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [contactUnlockApplicantId, setContactUnlockApplicantId] = useState<string | null>(null);
  const { data: contactUnlocks = [] } = useFeatureUnlocks("unlock_contact");
  const unlockedSet = new Set((contactUnlocks || []).map((u: any) => u.target_id));
  const { data: quotas } = useMyQuotas();
  const unlocksLeft = quotas?.is_unlimited_unlocks
    ? Infinity
    : Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));
  const unlocksLeftLabel = unlocksLeft === Infinity ? "∞" : unlocksLeft.toLocaleString();
  const queryClient = useQueryClient();
  const [postingSearch, setPostingSearch] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const { data: employerJobs = [], isLoading: jobsLoading } = useEmployerJobs();
  const { data: breakdown } = useEmployerJobApplicantBreakdown();

  // Keep local filter state in sync when URL changes (back/forward, deep links)
  useEffect(() => {
    const f = searchParams.get("stage") || searchParams.get("filter");
    setFilter(f || "all");
    const s = searchParams.get("sort");
    setSort(s === "oldest" ? "oldest" : "newest");
  }, [searchParams]);

  // Reset selection when scope/filter changes
  useEffect(() => { setSelectedIds(new Set()); }, [jobIdParam, filter]);

  // Persist filter changes to URL so they survive navigation/back
  const updateFilter = (next: string) => {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    params.delete("filter"); // legacy
    if (next === "all") params.delete("stage");
    else params.set("stage", next);
    setSearchParams(params, { replace: true });
  };

  const updateSort = (next: "newest" | "oldest") => {
    setSort(next);
    const params = new URLSearchParams(searchParams);
    if (next === "newest") params.delete("sort");
    else params.set("sort", next);
    setSearchParams(params, { replace: true });
  };

  const apps = applications || [];
  const scopedJob = jobIdParam ? (employerJobs.find((j: any) => j.id === jobIdParam) || apps[0]?.jobs || null) : null;
  const scopedJobTitle = scopedJob ? ((lang === "my" && scopedJob.title_my) ? scopedJob.title_my : scopedJob.title) : null;
  const scopedJobCompany = scopedJob?.company || null;
  const scopedJobLocation = scopedJob?.location || null;
  const filtered = apps.filter((a: any) => {
    // Placed applications only appear on the "placed" filter tab
    if (a.status === "placed" && filter !== "placed") return false;
    if (filter === "all") return true;
    if (filter === "new") return NEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "interview") return INTERVIEW_APPLICATION_STATUSES.includes(a.status);
    return a.status === filter;
  });
  const selected = apps.find((a: any) => a.id === selectedId);
  const isContactUnlocked = !!selected && contactUnlocks.some((u: any) => u.target_id === selected.applicant_id);
  const { data: unlockedContact } = useQuery({
    queryKey: ["unlocked-contact", selected?.applicant_id],
    queryFn: async () => {
      if (!selected?.applicant_id) return null;
      const { data, error } = await (supabase as any).rpc("get_applicant_contact", { _applicant_id: selected.applicant_id });
      if (error) return null;
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!selected?.applicant_id && isContactUnlocked,
  });

  // Auto-mark application as "viewed" when the employer opens it.
  // Guard with sessionStorage so accidental re-opens within the same session
  // don't spam the applicant with duplicate notifications/emails.
  useEffect(() => {
    if (!selected) return;
    if (!NEW_APPLICATION_STATUSES.includes(selected.status)) return;
    const key = `app-viewed:${selected.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    updateStatus.mutate({ id: selected.id, status: "viewed" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedStatus = selected
    ? INTERVIEW_APPLICATION_STATUSES.includes(selected.status)
      ? "interview"
      : selected.status === "submitted"
        ? "applied"
        : selected.status
    : null;

  const setJobScope = (newJobId: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (newJobId) params.set("jobId", newJobId);
    else params.delete("jobId");
    setSearchParams(params, { replace: true });
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // Issue #8: for interview status, collect a date/time first
    if (newStatus === "interview") {
      setPendingInterviewId(id);
      // Default to tomorrow 10:00
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      setInterviewDateTime(d.toISOString().slice(0, 16));
      setShowInterviewDate(true);
      return;
    }
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      setSelectedId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "အခြေအနေ ပြောင်း၍ မရပါ: " : "Failed to update status: ") + (err?.message || "unknown"));
    }
  };

  const handleConfirmInterview = async () => {
    if (!pendingInterviewId) return;
    try {
      const isoDate = interviewDateTime
        ? new Date(interviewDateTime).toISOString()
        : new Date().toISOString();
      await updateStatus.mutateAsync({ id: pendingInterviewId, status: "interview", interviewDate: isoDate });
      setShowInterviewDate(false);
      setPendingInterviewId(null);
      setInterviewDateTime("");
      setSelectedId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "အခြေအနေ ပြောင်း၍ မရပါ: " : "Failed to update status: ") + (err?.message || "unknown"));
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    const effectiveReason = rejectionReason === "__other__" ? otherReasonText.trim() : rejectionReason;
    try {
      // Look up the matching Burmese mirror from preset list (so applicant sees localized reason)
      const preset = rejectionReasons.find(r => r.en === rejectionReason);
      await updateStatus.mutateAsync({
        id: selectedId,
        status: "rejected",
        rejectionReason: effectiveReason,
        rejectionReasonMy: preset?.my,
      });
      setShowReject(false); setSelectedId(null); setRejectionReason(""); setOtherReasonText("");
    } catch (err: any) {
      toast.error((lang === "my" ? "ငြင်းပယ်၍ မရပါ: " : "Failed to reject: ") + (err?.message || "unknown"));
    }
  };

  const handlePlacement = async () => {
    if (!selectedId) return;
    // Issue #14: strict salary parser
    const salary = Number(placementSalary);
    if (!Number.isFinite(salary) || salary <= 0 || !placementSalary.match(/^\d+(\.\d+)?$/)) {
      toastUI({ title: lang === "my" ? "လစာ မမှန်ပါ" : "Invalid salary", description: lang === "my" ? "သုညထက်ကြီးသော နံပါတ်တစ်ခု ထည့်ပါ" : "Please enter a valid positive number.", variant: "destructive" });
      return;
    }
    try {
      const fee = isAgent ? calculatePlacementFee(salary) : 0;
      // Atomic RPC: updates application + creates placement_fee payment_request
      // invoice for the seeker so the finance ledger reflects the placement.
      const { error } = await (supabase as any).rpc("placement_confirm_with_invoice", {
        _application_id: selectedId,
        _placement_salary: salary,
        _placement_fee: fee,
      });
      if (error) throw error;
      // Local cache refresh for the apps list
      await queryClient.invalidateQueries({ queryKey: ["employer-apps"] });
      await queryClient.invalidateQueries({ queryKey: ["agent-apps"] });
      await queryClient.invalidateQueries({ queryKey: ["user-finance"] });
      setShowPlacement(false); setSelectedId(null); setPlacementSalary("");
    } catch (err: any) {
      toast.error((lang === "my" ? "ခန့်အပ်မှု မအောင်မြင်ပါ: " : "Failed to confirm placement: ") + (err?.message || "unknown"));
    }
  };

  // Bulk-action helpers
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };
  const runBulk = async (status: string, extras: any = {}) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let ok = 0, failed = 0;
    await Promise.all(ids.map(async id => {
      try { await updateStatus.mutateAsync({ id, status, ...extras }); ok++; } catch { failed++; }
    }));
    setSelectedIds(new Set());
    if (failed > 0) toast.error(`${failed} ${lang === "my" ? "မအောင်မြင်ပါ" : "failed"}${ok ? `, ${ok} ${lang === "my" ? "အောင်မြင်" : "succeeded"}` : ""}`);
  };
  const handleBulkReject = async () => {
    const effectiveReason = rejectionReason === "__other__" ? otherReasonText.trim() : rejectionReason;
    const preset = rejectionReasons.find(r => r.en === rejectionReason);
    await runBulk("rejected", { rejectionReason: effectiveReason, rejectionReasonMy: preset?.my });
    setBulkRejectOpen(false); setRejectionReason(""); setOtherReasonText("");
  };

  // Inline single-row quick-action (no modal)
  const quickStatus = async (id: string, status: string) => {
    try { await updateStatus.mutateAsync({ id, status }); }
    catch (err: any) { toast.error((lang === "my" ? "မအောင်မြင်ပါ: " : "Failed: ") + (err?.message || "unknown")); }
  };
  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <PageHeader
        title={jobIdParam ? (scopedJobTitle || L.applications[lang]) : L.applications[lang]}
        backPath={jobIdParam ? (isAgent ? "/agent/jobs" : "/employer/jobs") : "/dashboard"}
        showBack
      />
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {!jobIdParam ? (
          <>
            {/* Postings index — pick a job to drill into its candidate pipeline */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {lang === "my" ? "သင့်အလုပ်တင်ထားသူများ" : "Your postings"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "my"
                    ? "လျှောက်ထားသူများ ကြည့်ရန် အလုပ်တစ်ခုကို ရွေးပါ"
                    : "Pick a posting to view its candidate pipeline"}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => navigate(isAgent ? "/agent/post-job" : "/employer/post-job")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {L.postJob[lang]}
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                value={postingSearch}
                onChange={(e) => setPostingSearch(e.target.value)}
                placeholder={lang === "my" ? "အလုပ်ခေါင်းစဉ်ဖြင့် ရှာရန်" : "Search postings by title or company"}
                className="h-10 rounded-xl pl-9"
              />
            </div>

            {jobsLoading ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : employerJobs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "အလုပ်တင်ထားခြင်း မရှိသေးပါ" : "No postings yet"}</p>
                <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate(isAgent ? "/agent/post-job" : "/employer/post-job")}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> {L.postJob[lang]}
                </Button>
              </div>
            ) : (() => {
              const q = postingSearch.trim().toLowerCase();
              const list = employerJobs
                .filter((j: any) => !q || (j.title || "").toLowerCase().includes(q) || (j.company || "").toLowerCase().includes(q) || (j.title_my || "").toLowerCase().includes(q))
                .map((j: any) => ({ job: j, b: breakdown?.get(j.id) || { total: 0, new: 0, shortlisted: 0, interview: 0, offered: 0, placed: 0, rejected: 0 } }))
                // Sort: new candidates first, then total, then most recent
                .sort((a, b) => (b.b.new - a.b.new) || (b.b.total - a.b.total) || (new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime()));

              if (list.length === 0) {
                return (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Search className="mb-3 h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေမှု ရလဒ် မရှိပါ" : "No postings match your search"}</p>
                  </div>
                );
              }

              return (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map(({ job, b }, i) => {
                    const title = lang === "my" && job.title_my ? job.title_my : job.title;
                    const isPending = job.status === "pending";
                    const isClosed = job.status === "closed" || job.status === "rejected";
                    return (
                      <motion.button
                        key={job.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 8) * 0.03 }}
                        onClick={() => setJobScope(job.id)}
                        className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md active:bg-muted/30"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {job.company}
                              {job.location ? ` · ${job.location}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {isPending && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                                {lang === "my" ? "စောင့်ဆိုင်း" : "Pending"}
                              </span>
                            )}
                            {isClosed && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {lang === "my" ? "ပိတ်" : "Closed"}
                              </span>
                            )}
                            {b.new > 0 && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                                {b.new} {lang === "my" ? "အသစ်" : "new"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-1 rounded-lg border border-border/60 bg-muted/30 p-2 text-center">
                          {[
                            { k: "total", v: b.total, label: lang === "my" ? "စုစုပေါင်း" : "Total" },
                            { k: "new", v: b.new, label: lang === "my" ? "အသစ်" : "New", tone: "text-primary" },
                            { k: "shortlisted", v: b.shortlisted, label: lang === "my" ? "ရွေးချယ်" : "Short" },
                            { k: "interview", v: b.interview, label: lang === "my" ? "အင်တာဗျူး" : "Intv", tone: "text-amber-700 dark:text-amber-400" },
                            { k: "placed", v: b.placed, label: lang === "my" ? "ခန့်အပ်" : "Placed", tone: "text-emerald-700 dark:text-emerald-400" },
                          ].map(s => (
                            <div key={s.k}>
                              <p className={`text-base font-bold leading-none ${s.tone || "text-foreground"}`}>{s.v}</p>
                              <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            {b.total === 0
                              ? (lang === "my" ? "လျှောက်ထားသူ မရှိသေးပါ" : "No applicants yet")
                              : (lang === "my" ? `${b.total} လျှောက်ထား` : `${b.total} applicant${b.total === 1 ? "" : "s"}`)}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            {lang === "my" ? "ကြည့်ရန်" : "View pipeline"}
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              );
            })()}
          </>
        ) : (
          <>
            {/* Scoped job context — title is in PageHeader; this strip shows company/location + applicant count */}
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} />
              <div className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{roleLabels.applicants} {lang === "my" ? "" : "for"}</span>
                {scopedJobCompany ? <span> · {scopedJobCompany}</span> : null}
                {scopedJobLocation ? <span> · {scopedJobLocation}</span> : null}
              </div>
              <button
                onClick={() => setJobScope(undefined)}
                className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
              >
                {lang === "my" ? "ပြောင်း" : "Change"}
              </button>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {apps.length} {lang === "my" ? "လျှောက်ထား" : `applicant${apps.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {/* Stage tabs — compact pill bar */}
            <div className="mb-3 -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
              {[
                { label: lang === "my" ? "အားလုံး" : "All", count: apps.filter((a: any) => a.status !== "placed").length, val: "all" },
                { label: lang === "my" ? "အသစ်" : "New", count: apps.filter((a: any) => NEW_APPLICATION_STATUSES.includes(a.status)).length, val: "new", dot: "bg-primary" },
                { label: lang === "my" ? "ရွေးချယ်" : "Shortlisted", count: apps.filter((a: any) => a.status === "shortlisted").length, val: "shortlisted", dot: "bg-emerald" },
                { label: lang === "my" ? "အင်တာဗျူး" : "Interview", count: apps.filter((a: any) => INTERVIEW_APPLICATION_STATUSES.includes(a.status)).length, val: "interview", dot: "bg-amber-400" },
                { label: lang === "my" ? "ကမ်းလှမ်း" : "Offered", count: apps.filter((a: any) => a.status === "offered").length, val: "offered", dot: "bg-emerald" },
                { label: lang === "my" ? "ခန့်အပ်" : "Placed", count: apps.filter((a: any) => a.status === "placed").length, val: "placed", dot: "bg-emerald" },
                { label: lang === "my" ? "ငြင်းပယ်" : "Rejected", count: apps.filter((a: any) => a.status === "rejected").length, val: "rejected", dot: "bg-destructive" },
              ].map((s) => {
                const active = filter === s.val;
                return (
                  <button
                    key={s.val}
                    onClick={() => updateFilter(s.val)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground font-semibold" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary-foreground" : s.dot}`} />}
                    <span>{s.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-primary-foreground/20" : "bg-muted text-foreground"}`}>{s.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search + sort row */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder={lang === "my" ? "အမည်၊ ကျွမ်းကျင်မှု၊ နေရာဖြင့် ရှာရန်" : "Search by name, skill, headline, location"}
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSort(sort === "newest" ? "oldest" : "newest")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
                  title={lang === "my" ? "စီရန်" : "Sort"}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {sort === "newest" ? (lang === "my" ? "အသစ်ဆုံး" : "Newest") : (lang === "my" ? "အဟောင်းဆုံး" : "Oldest")}
                </button>
              </div>
            </div>

            {(() => {
              const q = candidateSearch.trim().toLowerCase();
              let searched = q
                ? filtered.filter((a: any) => {
                    const p = a.applicant_profile || {};
                    return (
                      (p.display_name || "").toLowerCase().includes(q) ||
                      (p.headline || "").toLowerCase().includes(q) ||
                      (p.location || "").toLowerCase().includes(q) ||
                      (Array.isArray(p.skills) && p.skills.some((s: string) => (s || "").toLowerCase().includes(q)))
                    );
                  })
                : filtered;
              searched = [...searched].sort((a: any, b: any) => {
                const ta = new Date(a.created_at).getTime();
                const tb = new Date(b.created_at).getTime();
                return sort === "newest" ? tb - ta : ta - tb;
              });

              const visibleIds = searched.map((a: any) => a.id);
              const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
              const someSelected = selectedIds.size > 0;

              if (isLoading) {
                return (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading..."}</p>
                  </div>
                );
              }
              if (searched.length === 0) {
                return (
                  <div className="flex flex-col items-center py-12 text-center">
                    {q ? (
                      <>
                        <Search className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "ရှာဖွေမှု ရလဒ် မရှိပါ" : "No candidates match your search"}</p>
                        <Button variant="ghost" size="sm" className="mt-3 rounded-xl" onClick={() => setCandidateSearch("")}>
                          {lang === "my" ? "ရှင်းရန်" : "Clear search"}
                        </Button>
                      </>
                    ) : filter === "placed" ? (
                      <>
                        <CheckCircle className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-muted-foreground">{L.noPlacements[lang]}</p>
                        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => updateFilter("shortlisted")}>
                          {lang === "my" ? "ရွေးချယ်ထားသူများ ကြည့်ရန်" : "View shortlisted"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-muted-foreground">{L.noApplications[lang]}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {lang === "my" ? "ဤအလုပ်အတွက် လျှောက်ထားသူ မရှိသေးပါ" : "No applications for this listing yet"}
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setJobScope(undefined)}>
                            {L.allJobs[lang]}
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate((isAgent ? "/agent/edit-job/" : "/employer/edit-job/") + jobIdParam)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {L.editJob[lang]}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              }

              return (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {/* Header row with select-all */}
                  <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <button
                      onClick={() => toggleSelectAll(visibleIds)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${allSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"}`}
                      title={allSelected ? (lang === "my" ? "ဖျက်" : "Clear") : (lang === "my" ? "အားလုံး ရွေး" : "Select all")}
                    >
                      {allSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                    <span className="flex-1">{searched.length} {lang === "my" ? "လျှောက်ထား" : `candidate${searched.length === 1 ? "" : "s"}`}</span>
                    {someSelected && (
                      <span className="text-primary normal-case">{selectedIds.size} {lang === "my" ? "ရွေးထား" : "selected"}</span>
                    )}
                  </div>

                  {searched.map((app: any, i: number) => {
                    const sc = statusConfig[app.status] || statusConfig.applied;
                    const p = app.applicant_profile || {};
                    const checked = selectedIds.has(app.id);
                    const initials = (p.display_name || "?").slice(0, 2).toUpperCase();
                    const skills = Array.isArray(p.skills) ? p.skills.slice(0, 3) : [];
                    const ago = (() => {
                      const t = new Date(app.created_at).getTime();
                      const diff = Date.now() - t;
                      const m = Math.floor(diff / 60000);
                      if (m < 60) return `${m}m`;
                      const h = Math.floor(m / 60);
                      if (h < 24) return `${h}h`;
                      const d = Math.floor(h / 24);
                      if (d < 30) return `${d}d`;
                      return new Date(app.created_at).toLocaleDateString();
                    })();
                    const canShortlist = !["shortlisted", "interview", "interviewed", "offered", "placed", "rejected"].includes(app.status);
                    const canReject = app.status !== "rejected" && app.status !== "placed";
                    const rowUnlocked = unlockedSet.has(app.applicant_id);
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i, 12) * 0.015 }}
                        className={`group flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 transition-colors hover:bg-muted/30 ${checked ? "bg-primary/5" : ""}`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelected(app.id); }}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/60"}`}
                          title={lang === "my" ? "ရွေးရန်" : "Select"}
                        >
                          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </button>

                        <button
                          onClick={() => setSelectedId(app.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-foreground">{p.display_name || "Applicant"}</h3>
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${sc.color}`}>{lang === "my" ? sc.label.my : sc.label.en}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {p.headline && <span className="truncate">{p.headline}</span>}
                              {p.location && <span className="hidden shrink-0 items-center gap-0.5 sm:inline-flex"><MapPin className="h-2.5 w-2.5" strokeWidth={1.5} />{p.location}</span>}
                              <span className="ml-auto shrink-0 text-muted-foreground/70">· {ago}</span>
                            </div>
                            {skills.length > 0 && (
                              <div className="mt-1 hidden flex-wrap gap-1 md:flex">
                                {skills.map((s: string) => (
                                  <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{s}</span>
                                ))}
                              </div>
                            )}
                            {INTERVIEW_APPLICATION_STATUSES.includes(app.status) && app.interview_date && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <Calendar className="h-3 w-3" strokeWidth={1.5} />
                                {new Date(app.interview_date).toLocaleString(lang === "my" ? "my-MM" : undefined, { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                            )}
                          </div>
                        </button>

                        {/* Inline quick actions — appear on hover (always-on for touch via opacity 100 on small screens) */}
                        <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {canShortlist && (
                            <button
                              onClick={(e) => { e.stopPropagation(); quickStatus(app.id, "shortlisted"); }}
                              disabled={updateStatus.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald hover:bg-emerald/10 disabled:opacity-60"
                              title={lang === "my" ? "ရွေးချယ်" : "Shortlist"}
                            >
                              <CheckCircle className="h-4 w-4" strokeWidth={1.8} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const jobTitle = app.jobs?.title || "your application";
                              const seed = lang === "my" ? `မင်္ဂလာပါ၊ "${jobTitle}" အတွက်...` : `Hi, regarding your application for "${jobTitle}"...`;
                              startConversation(app.applicant_id, { initialMessage: seed });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                            title={lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                          {canReject && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedId(app.id); setShowReject(true); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                              title={lang === "my" ? "ငြင်းပယ်" : "Reject"}
                            >
                              <XCircle className="h-4 w-4" strokeWidth={1.8} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedId(app.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                            title={lang === "my" ? "ဖွင့်" : "Open"}
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Sticky bulk-action bar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-3xl items-center gap-2 border border-border bg-card px-4 py-3 shadow-lg sm:bottom-20 sm:rounded-2xl"
                >
                  <span className="flex-1 text-sm font-semibold text-foreground">
                    {selectedIds.size} {lang === "my" ? "ကိုယ်စားလှယ် ရွေးထား" : `selected`}
                  </span>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setSelectedIds(new Set())}>
                    {lang === "my" ? "ဖျက်" : "Clear"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" disabled={updateStatus.isPending} onClick={() => runBulk("shortlisted")}>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald" strokeWidth={1.8} />
                    {lang === "my" ? "ရွေးချယ်" : "Shortlist"}
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-lg" disabled={updateStatus.isPending} onClick={() => setBulkRejectOpen(true)}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
                    {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && !showReject && !showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} className="w-full max-w-md md:max-w-2xl rounded-2xl bg-card p-6 pb-8 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {((selected as any).applicant_profile?.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground">{selected.applicant_profile?.display_name || "Applicant"}</h2>
                    {selected.applicant_profile?.headline && (
                      <p className="text-[11px] text-muted-foreground">{selected.applicant_profile.headline}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{selected.jobs?.title || "Application"}</span>
                      {selected.applicant_profile?.location && (
                        <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" strokeWidth={1.5} /> {selected.applicant_profile.location}</span>
                      )}
                      {selected.interview_date && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <Calendar className="h-2.5 w-2.5" strokeWidth={1.5} />
                          {lang === "my" ? "အင်တာဗျူး" : "Interview"}: {new Date(selected.interview_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${(statusConfig[selected.status] || statusConfig.applied).color}`}>
                  {lang === "my" ? (statusConfig[selected.status] || statusConfig.applied).label.my : (statusConfig[selected.status] || statusConfig.applied).label.en}
                </span>
              </div>

              {selected.applicant_profile?.skills?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selected.applicant_profile.skills.slice(0, 8).map((s: string) => (
                    <span key={s} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}

              {selected.cover_letter && (
                <div className="mb-4 rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{lang === "my" ? "Cover Letter" : "Cover Letter"}</p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{selected.cover_letter}</p>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSelectedId(null); navigate(`/profile/${selected.applicant_id}`); }}>
                  <EyeIcon className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  {lang === "my" ? "ပရိုဖိုင် ကြည့်ရန်" : "View Profile"}
                </Button>
                <Button variant="default" size="sm" className="rounded-xl" onClick={() => {
                  const jobTitle = selected.jobs?.title || "your application";
                  const seed = lang === "my"
                    ? `မင်္ဂလာပါ၊ "${jobTitle}" အတွက် သင့်လျှောက်လွှာနှင့် ပတ်သက်၍...`
                    : `Hi, regarding your application for "${jobTitle}"...`;
                  setSelectedId(null);
                  startConversation(selected.applicant_id, { initialMessage: seed });
                }}>
                  <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  {lang === "my" ? "မက်ဆေ့ချ်" : "Message"}
                </Button>
              </div>


              {/* Contact unlock */}
              <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <p className="text-xs font-semibold text-foreground">{lang === "my" ? "ဆက်သွယ်ရန် အချက်အလက်" : "Contact Information"}</p>
                </div>
                {isContactUnlocked && unlockedContact ? (
                  <div className="space-y-1.5 text-xs">
                    {unlockedContact.email && (
                      <a href={`mailto:${unlockedContact.email}`} className="flex items-center gap-2 text-primary"><Mail className="h-3.5 w-3.5" strokeWidth={1.5} /> {unlockedContact.email}</a>
                    )}
                    {unlockedContact.phone && (
                      <a href={`tel:${unlockedContact.phone}`} className="flex items-center gap-2 text-primary"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {unlockedContact.phone}</a>
                    )}
                    {!unlockedContact.email && !unlockedContact.phone && (
                      <p className="text-[11px] text-muted-foreground">{lang === "my" ? "သုံးစွဲသူက ဆက်သွယ်ရန် မပေးထားပါ" : "Applicant has not provided contact info"}</p>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setContactUnlockApplicantId(selected.applicant_id)}>
                    <Lock className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    {lang === "my"
                      ? `ဆက်သွယ်ရန် ဖွင့်ရန် · ${unlocksLeftLabel} ကျန်`
                      : `Unlock contact · ${unlocksLeftLabel} left`}
                  </Button>
                )}
              </div>


              <div className="border-t border-border pt-4">
                <p className="mb-1 text-xs font-semibold text-foreground">{lang === "my" ? "Pipeline သို့ ရွှေ့ပြောင်းရန်" : "Move through pipeline"}</p>
                <p className="mb-3 text-[10px] text-muted-foreground">
                  {lang === "my"
                    ? "လက်ရှိအဆင့်ကို ရှေ့သို့/နောက်သို့ ပြောင်းနိုင်သည်"
                    : "Move this candidate to the next stage, or step back if needed."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Forward action — primary */}
                  {selectedStatus !== "shortlisted" && selectedStatus !== "interview" && selectedStatus !== "offered" && selectedStatus !== "placed" && (
                    <Button variant="default" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                      onClick={() => handleStatusUpdate(selected.id, "shortlisted")}>
                      ✓ {lang === "my" ? "ရွေးချယ်ရန်" : "Shortlist"}
                    </Button>
                  )}
                  {selectedStatus === "shortlisted" && (
                    <Button variant="default" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                      onClick={() => handleStatusUpdate(selected.id, "interview")}>
                      📅 {lang === "my" ? "အင်တာဗျူး ချိန်းရန်" : "Schedule Interview"}
                    </Button>
                  )}
                  {selectedStatus === "interview" && (
                    <>
                      <Button variant="default" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                        onClick={() => handleStatusUpdate(selected.id, "offered")}>
                        ✉ {lang === "my" ? "ကမ်းလှမ်းရန်" : "Make Offer"}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                        onClick={() => handleStatusUpdate(selected.id, "shortlisted")}>
                        ← {lang === "my" ? "Interview မှ ဖယ်ရှား" : "Remove from Interview"}
                      </Button>
                      <Button variant="outline" size="sm" className="col-span-2 rounded-lg text-xs" disabled={updateStatus.isPending}
                        onClick={() => handleStatusUpdate(selected.id, "interview")}>
                        🕒 {lang === "my" ? "အင်တာဗျူး အချိန်ပြောင်း" : "Reschedule Interview"}
                      </Button>
                    </>
                  )}
                  {selectedStatus === "offered" && (
                    <>
                      <Button variant="default" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                        onClick={() => setShowPlacement(true)}>
                        ✓ {lang === "my" ? "ခန့်အပ် မှတ်တမ်းတင်" : "Mark Placed"}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                        onClick={() => handleStatusUpdate(selected.id, "interview")}>
                        ← {lang === "my" ? "Interview သို့ ပြန်" : "Back to Interview"}
                      </Button>
                    </>
                  )}
                  {/* Always-available steps to jump back */}
                  {selectedStatus === "shortlisted" && (
                    <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground" disabled={updateStatus.isPending}
                      onClick={() => handleStatusUpdate(selected.id, "viewed")}>
                      ← {lang === "my" ? "ပြန်ဆုတ်ရန်" : "Move back"}
                    </Button>
                  )}
                  {/* Reject — destructive, always available unless already rejected/placed */}
                  {selected.status !== "rejected" && selected.status !== "placed" && (
                    <Button variant="destructive" size="sm" className={`rounded-lg text-xs ${selectedStatus === "interview" || selectedStatus === "offered" ? "col-span-2" : ""}`} disabled={updateStatus.isPending} onClick={() => setShowReject(true)}>
                      ✕ {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                    </Button>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-3 rounded-lg text-xs" onClick={() => setHistoryOpen(true)}>
                  <History className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "အခြေအနေ မှတ်တမ်း" : "Status History"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <StatusHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        kind="application"
        recordId={selected?.id || null}
        subtitle={selected ? `${selected.applicant_profile?.display_name || "Applicant"} · ${selected.jobs?.title || ""}` : undefined}
      />

      <AnimatePresence>
        {showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowReject(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ငြင်းပယ်ရသည့် အကြောင်းရင်း" : "Rejection Reason"}</h3>
              <div className="mb-3 space-y-2">
                {rejectionReasons.map(r => (
                  <button key={r.en} onClick={() => { setRejectionReason(r.en); setOtherReasonText(""); }} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                    {lang === "my" ? r.my : r.en}
                  </button>
                ))}
                <button onClick={() => setRejectionReason("__other__")} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === "__other__" ? "border-primary bg-primary/5" : "border-border"}`}>
                  {lang === "my" ? "အခြား" : "Other"}
                </button>
                {rejectionReason === "__other__" && (
                  <div>
                    <Input
                      autoFocus
                      value={otherReasonText}
                      onChange={e => setOtherReasonText(e.target.value)}
                      placeholder={lang === "my" ? "အကြောင်းရင်း ထည့်ပါ..." : "Enter reason..."}
                      className="h-10 rounded-xl text-xs"
                      maxLength={500}
                    />
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{otherReasonText.length} / 500</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowReject(false); setRejectionReason(""); setOtherReasonText(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleReject} disabled={(!rejectionReason || (rejectionReason === "__other__" && !otherReasonText.trim())) || updateStatus.isPending}>{lang === "my" ? "ငြင်းပယ်ရန်" : "Reject"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk reject dialog — reuses rejection_reasons */}
      <AnimatePresence>
        {bulkRejectOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setBulkRejectOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? "အားလုံး ငြင်းပယ်ရန်" : "Reject Selected"}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{selectedIds.size} {lang === "my" ? "ဦး အား ငြင်းပယ်မည်။ အကြောင်းရင်း ရွေးပါ။" : `candidate${selectedIds.size === 1 ? "" : "s"} will be rejected. Pick a reason.`}</p>
              <div className="mb-3 space-y-2">
                {rejectionReasons.map(r => (
                  <button key={r.en} onClick={() => { setRejectionReason(r.en); setOtherReasonText(""); }} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                    {lang === "my" ? r.my : r.en}
                  </button>
                ))}
                <button onClick={() => setRejectionReason("__other__")} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === "__other__" ? "border-primary bg-primary/5" : "border-border"}`}>
                  {lang === "my" ? "အခြား" : "Other"}
                </button>
                {rejectionReason === "__other__" && (
                  <Input autoFocus value={otherReasonText} onChange={e => setOtherReasonText(e.target.value)} placeholder={lang === "my" ? "အကြောင်းရင်း ထည့်ပါ..." : "Enter reason..."} className="h-10 rounded-xl text-xs" maxLength={500} />
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setBulkRejectOpen(false); setRejectionReason(""); setOtherReasonText(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleBulkReject} disabled={(!rejectionReason || (rejectionReason === "__other__" && !otherReasonText.trim())) || updateStatus.isPending}>{lang === "my" ? "အားလုံး ငြင်းပယ်" : "Reject all"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowPlacement(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-1 text-base font-bold text-foreground">{lang === "my" ? "ခန့်အပ်မှု အတည်ပြုရန်" : "Confirm Placement"}</h3>
              {selected && (
                <p className="mb-1 text-xs font-medium text-foreground">
                  {selected.applicant_profile?.display_name || "Applicant"} · {selected.jobs?.title || "Job"}
                </p>
              )}
              {isAgent && <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ခန့်အပ်ခ ၈% — ဝန်ထမ်းမှ ပေးချေရပါမည်" : "8% placement fee — paid by the job seeker"}</p>}
              <div className="mb-3">
                <label className="mb-1 block text-xs text-foreground">{lang === "my" ? "လစာ (Ks/လ) *" : "Monthly Salary (Ks) *"}</label>
                <input type="number" min="1" value={placementSalary} onChange={e => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setPlacementSalary(val);
                }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="500000" />
              </div>
              {isAgent && placementSalary && parseInt(placementSalary) > 0 && (() => {
                const fee = calculatePlacementFee(parseInt(placementSalary));
                const commission = roundMmk(fee * PLACEMENT_PLATFORM_COMMISSION);
                const net = fee - commission;
                const pct = Math.round(PLACEMENT_FEE_PERCENT * 100);
                return (
                  <div className="mb-4 space-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <p className="flex justify-between"><span>{lang === "my" ? `ခန့်အပ်ခ ${pct}% (ဝန်ထမ်းပေးချေ)` : `Placement fee ${pct}% (paid by seeker)`}</span><span className="font-bold text-foreground">{fee.toLocaleString()} Ks</span></p>
                    <p className="flex justify-between"><span>{lang === "my" ? "ပလက်ဖောင်း ၁၀% ကော်မရှင်" : "Platform 10% commission"}</span><span>−{commission.toLocaleString()}</span></p>
                    <p className="flex justify-between border-t border-border/60 pt-1"><span>{lang === "my" ? "သင် ရရှိမည်" : "You receive"}</span><span className="font-bold text-emerald">{net.toLocaleString()} Ks</span></p>
                  </div>
                );
              })()}
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowPlacement(false); setPlacementSalary(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="default" className="flex-1 rounded-xl" onClick={() => { if (!placementSalary || parseInt(placementSalary) <= 0) return; setShowPlacementConfirm(true); }} disabled={!placementSalary || parseInt(placementSalary) <= 0 || updateStatus.isPending}>
                  {lang === "my" ? "အတည်ပြုရန်" : "Confirm Placement"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Issue #8: Interview date picker dialog */}
      <AlertDialog open={showInterviewDate} onOpenChange={(v) => { if (!v) { setShowInterviewDate(false); setPendingInterviewId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "my" ? "အင်တာဗျူး ချိန်းဆိုရန်" : "Schedule Interview"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "my" ? "အင်တာဗျူး ရက်နှင့် အချိန် ရွေးပါ" : "Select the interview date and time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <input
              type="datetime-local"
              value={interviewDateTime}
              onChange={e => setInterviewDateTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowInterviewDate(false); setPendingInterviewId(null); }}>
              {lang === "my" ? "မလုပ်တော့" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInterview} disabled={!interviewDateTime || updateStatus.isPending}>
              {lang === "my" ? "အတည်ပြု" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPlacementConfirm} onOpenChange={setShowPlacementConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "my" ? "ခန့်အပ်မှု အတည်ပြုမည်" : "Confirm Placement"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAgent
                ? (lang === "my"
                    ? `ခန့်အပ်ခ ${Math.round(PLACEMENT_FEE_PERCENT * 100)}% (${placementSalary ? calculatePlacementFee(parseInt(placementSalary)).toLocaleString() : 0} Ks) ကို ဝန်ထမ်းမှ ပေးချေရမည်။ ပလက်ဖောင်းသည် ၁၀% ကော်မရှင် ကောက်ခံပါမည်။ ဆက်လုပ်မည်လား?`
                    : `A ${Math.round(PLACEMENT_FEE_PERCENT * 100)}% placement fee (${placementSalary ? calculatePlacementFee(parseInt(placementSalary)).toLocaleString() : 0} Ks) is paid by the job seeker. The platform retains a 10% commission on this fee. Confirm?`)
                : (lang === "my" ? "ခန့်အပ်မှု မှတ်တမ်းတင်ပါမည်။ ဆက်လက်လုပ်ဆောင်မည်လား?" : "This will record a placement. Confirm?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPlacementConfirm(false)}>
              {lang === "my" ? "မလုပ်တော့" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowPlacementConfirm(false); handlePlacement(); }} disabled={updateStatus.isPending}>
              {lang === "my" ? "အတည်ပြုရန်" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SpendConfirmSheet
        open={!!contactUnlockApplicantId}
        onOpenChange={(o) => { if (!o) setContactUnlockApplicantId(null); }}
        actionKey="unlock_contact"
        targetType="applicant"
        targetId={contactUnlockApplicantId || undefined}
        idempotencyKey={contactUnlockApplicantId ? `unlock_contact:${contactUnlockApplicantId}` : undefined}
        onSuccess={() => {
          setContactUnlockApplicantId(null);
          queryClient.invalidateQueries({ queryKey: ["feature-unlocks"] });
          queryClient.invalidateQueries({ queryKey: ["unlocked-contact"] });
        }}
      />
    </div>
  );
};

export default EmployerApplications;
