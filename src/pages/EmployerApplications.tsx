import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MessageCircle, X, CheckCircle, Clock, Eye, XCircle, Users, Briefcase, Plus, Pencil, MapPin, Eye as EyeIcon, Calendar } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerApplications } from "@/hooks/use-jobs";
import { useUpdateApplicationStatus } from "@/hooks/use-employer-data";
import { useStartConversation } from "@/hooks/use-start-conversation";
import PageHeader from "@/components/PageHeader";
import JobScopeBar from "@/components/employer/JobScopeBar";
import { employerLabels as L } from "@/lib/employer-labels";
import { toast } from "sonner";

const NEW_APPLICATION_STATUSES = ["applied", "submitted"];
const INTERVIEW_APPLICATION_STATUSES = ["interview", "interviewed"];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string }> = {
  applied: { label: { my: "တင်ပြပြီး", en: "New" }, color: "text-primary bg-primary/10" },
  submitted: { label: { my: "တင်ပြပြီး", en: "New" }, color: "text-primary bg-primary/10" },
  viewed: { label: { my: "ကြည့်ပြီး", en: "Viewed" }, color: "text-accent bg-accent/10" },
  shortlisted: { label: { my: "ရွေးချယ်ပြီး", en: "Shortlisted" }, color: "text-emerald bg-emerald/10" },
  interview: { label: { my: "အင်တာဗျူး", en: "Interview" }, color: "text-primary bg-primary/10" },
  interviewed: { label: { my: "အင်တာဗျူး", en: "Interview" }, color: "text-primary bg-primary/10" },
  offered: { label: { my: "ကမ်းလှမ်းပြီး", en: "Offered" }, color: "text-emerald bg-emerald/10" },
  rejected: { label: { my: "ငြင်းပယ်ပြီး", en: "Rejected" }, color: "text-destructive bg-destructive/10" },
  placed: { label: { my: "ခန့်အပ်ပြီး", en: "Placed" }, color: "text-emerald bg-emerald/10" },
  withdrawn: { label: { my: "ရုပ်သိမ်းပြီး", en: "Withdrawn" }, color: "text-muted-foreground bg-muted" },
};

const statusFlow = ["applied", "viewed", "shortlisted", "interview", "offered", "placed"];
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
  const jobIdParam = searchParams.get("jobId") || undefined;
  const { data: applications, isLoading } = useEmployerApplications(jobIdParam);
  const updateStatus = useUpdateApplicationStatus();
  const { startConversation } = useStartConversation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [placementSalary, setPlacementSalary] = useState("");
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");

  // Keep local filter state in sync when URL changes (back/forward, deep links)
  useEffect(() => {
    const f = searchParams.get("filter");
    setFilter(f || "all");
  }, [searchParams]);

  // Persist filter changes to URL so they survive navigation/back
  const updateFilter = (next: string) => {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  const apps = applications || [];
  const scopedJobTitle = jobIdParam ? (apps[0]?.jobs?.title || null) : null;
  const filtered = apps.filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "new") return NEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "interview") return INTERVIEW_APPLICATION_STATUSES.includes(a.status);
    return a.status === filter;
  });
  const selected = apps.find((a: any) => a.id === selectedId);

  // Auto-mark application as "viewed" when the employer opens it
  useEffect(() => {
    if (!selected) return;
    if (NEW_APPLICATION_STATUSES.includes(selected.status)) {
      updateStatus.mutate({ id: selected.id, status: "viewed" });
    }
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
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      setSelectedId(null);
    } catch (err: any) {
      toast.error((lang === "my" ? "အခြေအနေ ပြောင်း၍ မရပါ: " : "Failed to update status: ") + (err?.message || "unknown"));
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    try {
      // Look up the matching Burmese mirror from preset list (so applicant sees localized reason)
      const preset = rejectionReasons.find(r => r.en === rejectionReason);
      await updateStatus.mutateAsync({
        id: selectedId,
        status: "rejected",
        rejectionReason,
        rejectionReasonMy: preset?.my,
      });
      setShowReject(false); setSelectedId(null); setRejectionReason("");
    } catch (err: any) {
      toast.error((lang === "my" ? "ငြင်းပယ်၍ မရပါ: " : "Failed to reject: ") + (err?.message || "unknown"));
    }
  };

  const handlePlacement = async () => {
    if (!selectedId) return;
    const salary = parseInt(placementSalary, 10);
    if (!Number.isFinite(salary) || salary <= 0) {
      toast.error(lang === "my" ? "လစာ မှန်ကန်စွာ ထည့်ပါ" : "Enter a valid salary");
      return;
    }
    try {
      const fee = Math.round(salary * 0.08);
      await updateStatus.mutateAsync({ id: selectedId, status: "placed", placementSalary: salary, placementFee: fee });
      setShowPlacement(false); setSelectedId(null); setPlacementSalary("");
    } catch (err: any) {
      toast.error((lang === "my" ? "ခန့်အပ်မှု မအောင်မြင်ပါ: " : "Failed to confirm placement: ") + (err?.message || "unknown"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={L.applications[lang]} backPath="/employer/dashboard" />
      <div className="px-5">
        {/* Job context breadcrumb + dropdown switcher */}
        <JobScopeBar jobId={jobIdParam} onSelectJob={setJobScope} />

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: lang === "my" ? "အားလုံး" : "Total", count: apps.length, color: "text-foreground", filterVal: "all" },
            { label: lang === "my" ? "အသစ်" : "New", count: apps.filter((a: any) => NEW_APPLICATION_STATUSES.includes(a.status)).length, color: "text-primary", filterVal: "new" },
            { label: lang === "my" ? "ရွေးချယ်" : "Shortlisted", count: apps.filter((a: any) => a.status === "shortlisted").length, color: "text-emerald", filterVal: "shortlisted" },
            { label: lang === "my" ? "ခန့်အပ်" : "Placed", count: apps.filter((a: any) => a.status === "placed").length, color: "text-emerald", filterVal: "placed" },
          ].map((s) => (
            <button key={s.label} onClick={() => updateFilter(s.filterVal)} className={`rounded-xl border bg-card p-2.5 text-center transition-colors active:bg-muted/30 ${filter === s.filterVal ? "border-primary" : "border-border"}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "new", "shortlisted", "interview", "offered", "placed", "rejected"].map(f => (
            <button key={f} onClick={() => updateFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all"
                ? (lang === "my" ? "အားလုံး" : "All")
                : f === "new"
                  ? (lang === "my" ? "အသစ်" : "New")
                  : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
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
              {filter === "placed" ? (
                <>
                  <CheckCircle className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-muted-foreground">{L.noPlacements[lang]}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {lang === "my" ? "ခန့်အပ်လိုက်သောအခါ ဤနေရာတွင် ပေါ်လာပါမည်" : "Confirmed placements will appear here"}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => updateFilter("shortlisted")}>
                    {lang === "my" ? "ရွေးချယ်ထားသူများ ကြည့်ရန်" : "View shortlisted"}
                  </Button>
                </>
              ) : (
                <>
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-muted-foreground">{L.noApplications[lang]}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {jobIdParam
                      ? (lang === "my" ? "ဤအလုပ်အတွက် လျှောက်ထားသူ မရှိသေးပါ" : "No applications for this listing yet")
                      : (lang === "my" ? "လျှောက်ထားသူများ ရောက်လာသောအခါ ဤနေရာတွင် ပေါ်လာပါမည်" : "Applications will appear here once candidates apply")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {jobIdParam ? (
                      <>
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setJobScope(undefined)}>
                          {L.allJobs[lang]}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(`/employer/edit-job/${jobIdParam}`)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> {L.editJob[lang]}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/employer/post-job")}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> {L.postJob[lang]}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : filtered.map((app: any, i: number) => {
            const sc = statusConfig[app.status] || statusConfig.applied;
            return (
              <motion.button key={app.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedId(app.id)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {((app as any).applicant_profile?.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{app.applicant_profile?.display_name || "Applicant"}</h3>
                        <p className="text-[11px] text-muted-foreground">{app.jobs?.title || "Job"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>{lang === "my" ? sc.label.my : sc.label.en}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && !showReject && !showPlacement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedId(null)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
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


              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အခြေအနေ ပြောင်းရန်" : "Update Status"}</p>
                <div className="flex flex-wrap gap-2">
                  {statusFlow.filter(s => s !== selectedStatus).map(s => (
                    <Button key={s} variant="outline" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending}
                      onClick={() => { if (s === "placed") setShowPlacement(true); else handleStatusUpdate(selected.id, s); }}>
                      {lang === "my" ? statusConfig[s]?.label.my : statusConfig[s]?.label.en}
                    </Button>
                  ))}
                  {selected.status !== "rejected" && (
                    <Button variant="destructive" size="sm" className="rounded-lg text-xs" disabled={updateStatus.isPending} onClick={() => setShowReject(true)}>
                      {lang === "my" ? "ငြင်းပယ်" : "Reject"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setShowReject(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-3 text-base font-bold text-foreground">{lang === "my" ? "ငြင်းပယ်ရသည့် အကြောင်းရင်း" : "Rejection Reason"}</h3>
              <div className="mb-3 space-y-2">
                {rejectionReasons.map(r => (
                  <button key={r.en} onClick={() => setRejectionReason(r.en)} className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${rejectionReason === r.en ? "border-primary bg-primary/5" : "border-border"}`}>
                    {lang === "my" ? r.my : r.en}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowReject(false); setRejectionReason(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="default" className="flex-1 rounded-xl" onClick={handleReject} disabled={!rejectionReason || updateStatus.isPending}>{lang === "my" ? "ငြင်းပယ်ရန်" : "Reject"}</Button>
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
              <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ခန့်အပ်ခ ၈% ကောက်ခံပါမည်" : "8% placement fee will apply"}</p>
              <div className="mb-3">
                <label className="mb-1 block text-xs text-foreground">{lang === "my" ? "လစာ (USD/လ) *" : "Monthly Salary (USD) *"}</label>
                <input type="number" min="1" value={placementSalary} onChange={e => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setPlacementSalary(val);
                }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="3000" />
              </div>
              {placementSalary && parseInt(placementSalary) > 0 && <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ကောက်ခံမည့်ခ" : "Fee"}: <span className="font-bold text-primary">${Math.round(parseInt(placementSalary) * 0.08)}</span></p>}
              <div className="flex gap-3">
                <Button variant="outline" size="default" className="flex-1 rounded-xl" onClick={() => { setShowPlacement(false); setPlacementSalary(""); }}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="default" className="flex-1 rounded-xl" onClick={handlePlacement} disabled={!placementSalary || parseInt(placementSalary) <= 0 || updateStatus.isPending}>
                  {updateStatus.isPending ? (lang === "my" ? "လုပ်ဆောင်နေ..." : "Saving...") : (lang === "my" ? "အတည်ပြုရန်" : "Confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployerApplications;
