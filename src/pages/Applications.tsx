import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Clock, ChevronRight, CheckCircle, Eye, FileText, X, Calendar, History, Sparkles, ArrowRight } from "lucide-react";
import StatusHistorySheet from "@/components/StatusHistorySheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { useApplications, useSavedJobs } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrencyRange } from "@/lib/currency";
import { getApplicationStatusMeta } from "@/lib/status-labels";
import ListSkeleton from "@/components/ListSkeleton";
import MentorCoachCue from "@/components/MentorCoachCue";

const NEW_APPLICATION_STATUSES = ["applied", "submitted"];
const INTERVIEW_APPLICATION_STATUSES = ["interview", "interviewed"];

// Build local lookup tables from the shared status registry (seeker perspective).
const APP_STATUS_KEYS = [
  "applied", "submitted", "viewed", "shortlisted", "interview", "interviewed",
  "offered", "rejected", "placed", "withdrawn",
] as const;
const statusIcons: Record<string, typeof CheckCircle> = Object.fromEntries(
  APP_STATUS_KEYS.map((k) => [k, getApplicationStatusMeta(k, "seeker").icon])
) as Record<string, typeof CheckCircle>;
const statusLabels: Record<string, { my: string; en: string; color: string }> = Object.fromEntries(
  APP_STATUS_KEYS.map((k) => {
    const m = getApplicationStatusMeta(k, "seeker");
    return [k, { my: m.my, en: m.en, color: m.color }];
  })
);

const Applications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: applications, isLoading } = useApplications();
  const { data: savedJobs } = useSavedJobs();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const setFilter = (next: string) => {
    const p = new URLSearchParams(searchParams);
    if (next === "all") p.delete("filter"); else p.set("filter", next);
    setSearchParams(p, { replace: true });
  };

  const apps = applications || [];
  const PIPELINE_STATUSES_INLINE = ["applied", "submitted", "viewed", "shortlisted", "interview", "interviewed", "offered"];
  const filteredApps = apps.filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "new") return NEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "interview") return INTERVIEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "pipeline") return PIPELINE_STATUSES_INLINE.includes(a.status);
    return a.status === filter;
  });
  const selected = apps.find((a: any) => a.id === selectedApp);

  // Resolve whether the offering employer is a recruiting agent (placement fee applies to seeker)
  const offerEmployerId = selected?.jobs?.employer_id;
  const { data: offerEmployer } = useQuery({
    queryKey: ["offer-employer-role", offerEmployerId],
    queryFn: async () => {
      if (!offerEmployerId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("primary_role")
        .eq("id", offerEmployerId)
        .maybeSingle();
      return data;
    },
    enabled: !!offerEmployerId && confirmAccept,
  });
  const isAgentOffer = offerEmployer?.primary_role === "agent";
  const offerSalary = Number(selected?.jobs?.salary_max || selected?.jobs?.salary_min || 0);
  const offerFee = isAgentOffer && offerSalary > 0 ? Math.round(offerSalary * 0.08) : 0;

  const ACTION_STATUSES = ["offered", "interview", "interviewed"];
  const PROGRESS_STATUSES = ["applied", "submitted", "viewed", "shortlisted"];
  const CLOSED_STATUSES = ["rejected", "withdrawn", "placed"];

  const statusCounts = {
    total: apps.length,
    action: apps.filter((a: any) => ACTION_STATUSES.includes(a.status)).length,
    progress: apps.filter((a: any) => PROGRESS_STATUSES.includes(a.status)).length,
    pipeline: apps.filter((a: any) => PROGRESS_STATUSES.includes(a.status) || ACTION_STATUSES.includes(a.status)).length,
    rejected: apps.filter((a: any) => a.status === "rejected").length,
    placed: apps.filter((a: any) => a.status === "placed").length,
    saved: savedJobs?.length || 0,
  };

  const countFor = (val: string) => {
    if (val === "all") return apps.length;
    if (val === "new") return apps.filter((a: any) => NEW_APPLICATION_STATUSES.includes(a.status)).length;
    if (val === "interview") return apps.filter((a: any) => INTERVIEW_APPLICATION_STATUSES.includes(a.status)).length;
    return apps.filter((a: any) => a.status === val).length;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
    queryClient.invalidateQueries({ queryKey: ["job", selected?.job_id] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const handleWithdraw = async () => {
    if (!selectedApp) return;
    const { error } = await supabase.from("applications").update({ status: "withdrawn", withdrawn_at: new Date().toISOString() }).eq("id", selectedApp);
    if (error) {
      toast.error(lang === "my" ? "ရုပ်သိမ်း၍ မရပါ" : "Failed to withdraw application");
      return;
    }
    invalidate();
    toast.success(lang === "my" ? "လျှောက်လွှာ ရုပ်သိမ်းပြီးပါပြီ" : "Application withdrawn");
    setConfirmWithdraw(false);
    setSelectedApp(null);
  };

  const handleAcceptOffer = async () => {
    if (!selected) return;
    const salary = Number(selected.jobs?.salary_max || selected.jobs?.salary_min || 0);
    const fee = salary > 0 ? Math.round(salary * 0.08) : 0;
    const { error } = await supabase
      .from("applications")
      .update({ status: "placed", placement_salary: salary || null, placement_fee: fee || null })
      .eq("id", selected.id);
    if (error) {
      toast.error(lang === "my" ? "လက်ခံ၍ မရပါ" : "Failed to accept offer");
      return;
    }
    // Notify employer that the candidate accepted
    if (selected.jobs?.employer_id) {
      const { sendAppEmail } = await import("@/lib/send-app-email");
      sendAppEmail({
        templateName: "application-status",
        recipientUserId: selected.jobs.employer_id,
        idempotencyKey: `app-status-${selected.id}-placed`,
        templateData: { jobTitle: selected.jobs?.title, company: selected.jobs?.company, status: "placed" },
      });
    }
    invalidate();
    setConfirmAccept(false);
    setSelectedApp(null);
  };

  const handleDeclineOffer = async () => {
    if (!selected) return;
    const reason = lang === "my" ? "လျှောက်ထားသူက ကမ်းလှမ်းမှုကို ငြင်းပယ်" : "Candidate declined the offer";
    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected", rejection_reason: reason, rejection_reason_my: "လျှောက်ထားသူက ကမ်းလှမ်းမှုကို ငြင်းပယ်" })
      .eq("id", selected.id);
    if (error) {
      toast.error(lang === "my" ? "ငြင်းပယ်၍ မရပါ" : "Failed to decline offer");
      return;
    }
    if (selected.jobs?.employer_id) {
      const { sendAppEmail } = await import("@/lib/send-app-email");
      sendAppEmail({
        templateName: "application-status",
        recipientUserId: selected.jobs.employer_id,
        idempotencyKey: `app-status-${selected.id}-declined`,
        templateData: { jobTitle: selected.jobs?.title, company: selected.jobs?.company, status: "rejected", reason },
      });
    }
    invalidate();
    setConfirmDecline(false);
    setSelectedApp(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လျှောက်လွှာများ" : "My Applications"} showBack />
      {/* Editorial summary hero */}
      <div className="px-5">
        <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-stretch divide-x divide-border">
            <button
              onClick={() => setFilter("pipeline")}
              className={`flex-1 px-4 py-4 text-left transition-colors active:bg-muted/30 ${filter === "pipeline" ? "bg-primary/[0.04]" : ""}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {lang === "my" ? "ဆောင်ရွက်ဆဲ" : "Pipeline"}
              </p>
              <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                {statusCounts.pipeline}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {lang === "my" ? "လျှောက်ထား / ဆောင်ရွက်ဆဲ" : "Applied & in progress"}
              </p>
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`flex-1 px-4 py-4 text-left transition-colors active:bg-muted/30 ${filter === "rejected" ? "bg-primary/[0.04]" : ""}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive/80">
                {lang === "my" ? "ငြင်းပယ်ခံရ" : "Rejected"}
              </p>
              <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                {statusCounts.rejected}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {lang === "my" ? "မအောင်မြင်သော လျှောက်လွှာ" : "Closed applications"}
              </p>
            </button>
            <button
              onClick={() => navigate("/jobs/saved")}
              className="flex-1 px-4 py-4 text-left transition-colors active:bg-muted/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
                {lang === "my" ? "သိမ်းဆည်း" : "Saved"}
              </p>
              <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                {statusCounts.saved}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {lang === "my" ? "သိမ်းဆည်းထားသော အလုပ်" : "Saved jobs"}
                <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </p>
            </button>
          </div>
        </div>

        {/* Filter chips with counts */}
        <div className="mb-4 -mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
          {[
            { value: "all", label: lang === "my" ? "အားလုံး" : "All" },
            { value: "new", label: lang === "my" ? "တင်ပြပြီး" : "Applied" },
            { value: "viewed", label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed" },
            { value: "shortlisted", label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted" },
            { value: "interview", label: lang === "my" ? "အင်တာဗျူး" : "Interview" },
            { value: "offered", label: lang === "my" ? "ကမ်းလှမ်းခံရ" : "Offered" },
            { value: "rejected", label: lang === "my" ? "ငြင်းပယ်ခံရ" : "Rejected" },
          ].map(f => {
            const c = countFor(f.value);
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground active:bg-muted"
                }`}
              >
                {f.label}
                {c > 0 && (
                  <span className={`rounded-full px-1.5 py-px text-[10px] tabular-nums ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground/70"}`}>
                    {c}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 px-5 pb-24">
        {(() => {
          const interviewApp = apps.find((a: any) => INTERVIEW_APPLICATION_STATUSES.includes(a.status) || a.status === "shortlisted");
          if (interviewApp) {
            return (
              <MentorCoachCue
                variant={INTERVIEW_APPLICATION_STATUSES.includes(interviewApp.status) ? "interview" : "applied"}
                context={interviewApp.jobs?.title}
              />
            );
          }
          if (apps.length > 0 && filter === "all") {
            return <MentorCoachCue variant="applied" />;
          }
          return null;
        })()}

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">
              {apps.length === 0
                ? (lang === "my" ? "လျှောက်လွှာ မရှိပါ" : "No applications yet")
                : (lang === "my" ? "ဤစစ်ထုတ်မှုအတွက် မရှိပါ" : "Nothing matches this filter")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {apps.length === 0
                ? (lang === "my" ? "အလုပ်ရှာဖွေပြီး လျှောက်ထားပါ" : "Browse jobs and start applying")
                : (lang === "my" ? "အခြားအခြေအနေတစ်ခု ရွေးပါ သို့မဟုတ် အားလုံးကို ပြန်ကြည့်ပါ" : "Try a different status or view all")}
            </p>
            {apps.length === 0 ? (
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/jobs")}>
                {lang === "my" ? "အလုပ်ရှာဖွေရန်" : "Browse Jobs"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => setFilter("all")}>
                {lang === "my" ? "အားလုံးပြန်ကြည့်" : "View all"}
              </Button>
            )}
          </div>
        ) : (() => {
          // Group when filter is "all"
          const renderCard = (app: any, i: number) => {
            const job = app.jobs;
            const sl = statusLabels[app.status] || statusLabels.applied;
            const Icon = statusIcons[app.status] || FileText;
            const accent =
              ACTION_STATUSES.includes(app.status) ? "bg-amber-500"
              : app.status === "placed" ? "bg-emerald"
              : app.status === "rejected" || app.status === "withdrawn" ? "bg-muted-foreground/30"
              : "bg-primary";
            const interviewAt = app.interview_scheduled_at || app.interview_date;
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                onClick={() => setSelectedApp(app.id)}
                className="group relative flex w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors active:bg-muted"
              >
                <span className={`w-1 shrink-0 ${accent}`} aria-hidden />
                <div className="flex flex-1 items-start gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {job?.company || ""}
                        </p>
                        <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground">
                          {job?.title || "Job"}
                        </h3>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sl.color}`}>
                        <Icon className="h-3 w-3" /> {lang === "my" ? sl.my : sl.en}
                      </span>
                    </div>

                    {job?.salary_min && job?.salary_max && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrencyRange(job.salary_min, job.salary_max, job.currency, lang, "mo")}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" strokeWidth={1.75} />
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
                      </span>
                      {interviewAt && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Calendar className="h-3 w-3" />
                          {lang === "my" ? "အင်တာဗျူး " : "Interview "}
                          {new Date(interviewAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {app.status === "offered" && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-500">
                          <ArrowRight className="h-3 w-3" /> {lang === "my" ? "တုံ့ပြန်ရန်" : "Respond"}
                        </span>
                      )}
                    </div>

                    {app.status === "rejected" && app.rejection_reason && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-destructive/90">
                        {lang === "my" ? `အကြောင်းပြချက်: ${app.rejection_reason_my || app.rejection_reason}` : `Reason: ${app.rejection_reason}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
              </motion.button>
            );
          };

          if (filter !== "all") {
            return <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{filteredApps.map(renderCard)}</div>;
          }

          const action = filteredApps.filter((a: any) => ACTION_STATUSES.includes(a.status));
          const progress = filteredApps.filter((a: any) => PROGRESS_STATUSES.includes(a.status));
          const closed = filteredApps.filter((a: any) => CLOSED_STATUSES.includes(a.status));

          const Section = ({ title, items, accent }: { title: string; items: any[]; accent?: string }) =>
            items.length === 0 ? null : (
              <div>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${accent || "bg-primary"}`} />
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {title} <span className="ml-1 text-foreground/60 tabular-nums">{items.length}</span>
                  </h2>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{items.map(renderCard)}</div>
              </div>
            );

          return (
            <div className="space-y-5">
              <Section title={lang === "my" ? "သင့်လုပ်ဆောင်ရန်" : "Action needed"} items={action} accent="bg-amber-500" />
              <Section title={lang === "my" ? "ဆောင်ရွက်ဆဲ" : "In progress"} items={progress} accent="bg-primary" />
              <Section title={lang === "my" ? "ပြီးဆုံး" : "Closed"} items={closed} accent="bg-muted-foreground/40" />
            </div>
          );
        })()}
      </div>


      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedApp(null)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{selected.jobs?.title || "Job"}</h2>
                <button onClick={() => setSelectedApp(null)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{selected.jobs?.company}</p>
              <div className="mb-4 flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${(statusLabels[selected.status] || statusLabels.applied).color}`}>
                  {lang === "my" ? (statusLabels[selected.status] || statusLabels.applied).my : (statusLabels[selected.status] || statusLabels.applied).en}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {(selected.status === "offered" || selected.status === "interviewed") && (
                  <div className="flex gap-2">
                    <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmAccept(true)}>
                      {lang === "my" ? "ကမ်းလှမ်းမှု လက်ခံ" : "Accept Offer"}
                    </Button>
                    <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmDecline(true)}>
                      {lang === "my" ? "ငြင်းပယ်" : "Decline"}
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  {(selected.status === "applied" || selected.status === "submitted") && (
                    <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmWithdraw(true)}>
                      {lang === "my" ? "ရုပ်သိမ်းရန်" : "Withdraw"}
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => { setSelectedApp(null); navigate(`/jobs/${selected.job_id}`); }}>
                    {lang === "my" ? "အလုပ် ကြည့်ရှုရန်" : "View Job"}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setHistoryOpen(true)}>
                  <History className="mr-1.5 h-4 w-4" /> {lang === "my" ? "အခြေအနေ မှတ်တမ်း" : "Status History"}
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
        subtitle={selected?.jobs?.title}
      />

      <AnimatePresence>
        {confirmWithdraw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setConfirmWithdraw(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "လျှောက်လွှာ ရုပ်သိမ်းမှာ သေချာပါသလား?" : "Withdraw this application?"}</h3>
              <p className="mb-5 text-xs text-muted-foreground">{lang === "my" ? "ရုပ်သိမ်းပြီးသည့်နောက် ပြန်လည် မရနိုင်ပါ။" : "This cannot be undone."}</p>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmWithdraw(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={handleWithdraw}>{lang === "my" ? "ရုပ်သိမ်း" : "Withdraw"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAccept && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setConfirmAccept(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "ကမ်းလှမ်းမှု လက်ခံမှာ သေချာပါသလား?" : "Accept this offer and confirm placement?"}</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                {lang === "my"
                  ? "လက်ခံပြီးပါက အခြေအနေသည် 'ခန့်အပ်ပြီး' ဖြစ်သွားပါမည်။"
                  : "Once accepted, the application status will be marked as Placed."}
              </p>
              <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground/80">
                {isAgentOffer ? (
                  <>
                    <p className="mb-1 font-semibold text-foreground">{lang === "my" ? "ခန့်အပ်ခ ၈%" : "8% placement fee"}</p>
                    <p>
                      {lang === "my"
                        ? `ဤကမ်းလှမ်းမှုသည် ခေါ်ယူရေး အေဂျင့်မှ ဖြစ်ပါသည်။ လက်ခံပါက သဘောတူထားသော လစာ၏ ၈% ${offerFee > 0 ? `(${offerFee.toLocaleString()} ကျပ်) ` : ""}ကို အေဂျင့်သို့ ပေးချေရပါမည်။`
                        : `This offer is from a recruiting agent. By accepting, you agree to pay the agent 8%${offerFee > 0 ? ` (${offerFee.toLocaleString()} MMK)` : ""} of your agreed salary as a placement fee.`}
                    </p>
                  </>
                ) : (
                  lang === "my"
                    ? "သင် လက်ခံခြင်းဖြင့် ခန့်အပ်မှုကို အတည်ပြုပါသည်။"
                    : "By accepting, you confirm the placement with this employer."
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmAccept(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="default" size="lg" className="flex-1 rounded-xl" onClick={handleAcceptOffer}>{lang === "my" ? "လက်ခံ" : "Accept"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDecline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setConfirmDecline(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "ကမ်းလှမ်းမှု ငြင်းပယ်မှာ သေချာပါသလား?" : "Decline this offer?"}</h3>
              <p className="mb-5 text-xs text-muted-foreground">{lang === "my" ? "ငြင်းပယ်ပြီးသည့်နောက် ပြန်လည်လက်ခံ၍ မရနိုင်ပါ။" : "This action cannot be undone."}</p>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => setConfirmDecline(false)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={handleDeclineOffer}>{lang === "my" ? "ငြင်းပယ်" : "Decline"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Applications;
