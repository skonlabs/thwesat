import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Clock, ChevronRight, CheckCircle, Eye, FileText, X, Calendar, History } from "lucide-react";
import StatusHistorySheet from "@/components/StatusHistorySheet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { useApplications } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrencyRange } from "@/lib/currency";
import { getApplicationStatusMeta } from "@/lib/status-labels";
import ListSkeleton from "@/components/ListSkeleton";

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
  const filteredApps = apps.filter((a: any) => {
    if (filter === "all") return true;
    if (filter === "new") return NEW_APPLICATION_STATUSES.includes(a.status);
    if (filter === "interview") return INTERVIEW_APPLICATION_STATUSES.includes(a.status);
    return a.status === filter;
  });
  const selected = apps.find((a: any) => a.id === selectedApp);

  const statusCounts = {
    total: apps.length,
    viewed: apps.filter((a: any) => a.status === "viewed").length,
    shortlisted: apps.filter((a: any) => a.status === "shortlisted").length,
    placed: apps.filter((a: any) => a.status === "placed").length,
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
    invalidate();
    setConfirmDecline(false);
    setSelectedApp(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လျှောက်လွှာများ" : "My Applications"} showBack />
      <div className="px-5">
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: lang === "my" ? "တင်ပြပြီး" : "Total", count: statusCounts.total, color: "text-foreground", filterVal: "all" },
            { label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed", count: statusCounts.viewed, color: "text-primary", filterVal: "viewed" },
            { label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted", count: statusCounts.shortlisted, color: "text-emerald", filterVal: "shortlisted" },
            { label: lang === "my" ? "အောင်မြင်" : "Placed", count: statusCounts.placed, color: "text-emerald", filterVal: "placed" },
          ].map((s) => (
            <button key={s.label} onClick={() => setFilter(s.filterVal)} className={`rounded-xl border bg-card p-2.5 text-center transition-colors active:bg-muted/30 ${filter === s.filterVal ? "border-primary" : "border-border"}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { value: "all", label: lang === "my" ? "အားလုံး" : "All" },
            { value: "new", label: lang === "my" ? "တင်ပြပြီး" : "Applied" },
            { value: "viewed", label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed" },
            { value: "shortlisted", label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted" },
            { value: "interview", label: lang === "my" ? "အင်တာဗျူး" : "Interview" },
            { value: "offered", label: lang === "my" ? "ကမ်းလှမ်းခံရ" : "Offered" },
            { value: "rejected", label: lang === "my" ? "ငြင်းပယ်ခံရ" : "Rejected" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-5 pb-24">
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
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
        ) : (
          filteredApps.map((app: any, i: number) => {
            const job = app.jobs;
            const sl = statusLabels[app.status] || statusLabels.applied;
            const Icon = statusIcons[app.status] || FileText;
            return (
              <motion.button key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedApp(app.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left active:bg-muted">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{job?.title || "Job"}</h3>
                  <p className="text-xs text-muted-foreground">{job?.company} {job?.salary_min && job?.salary_max ? `· ${formatCurrencyRange(job.salary_min, job.salary_max, job.currency, lang, "mo")}` : ""}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sl.color}`}>
                      <Icon className="h-3 w-3" /> {lang === "my" ? sl.my : sl.en}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
                    </span>
                    {app.status === "interview" && (app.interview_scheduled_at || app.interview_date) && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Calendar className="h-3 w-3" />
                        {lang === "my" ? "အင်တာဗျူး: " : "Interview: "}
                        {new Date(app.interview_scheduled_at || app.interview_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {app.status !== "interview" && app.interview_date && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Calendar className="h-3 w-3" /> {new Date(app.interview_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  {app.status === "rejected" && app.rejection_reason && (
                    <p className="mt-1 text-[10px] text-destructive">
                      {lang === "my" ? `အကြောင်းပြချက်: ${app.rejection_reason_my || app.rejection_reason}` : `Reason: ${app.rejection_reason}`}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </motion.button>
            );
          })
        )}
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
              <p className="mb-5 text-xs text-muted-foreground">{lang === "my" ? "ရုပ်သိမ်းပြီးသည့်နောက် ပြန်လည် မရနိုင်ပါ။" : "This action cannot be undone. The employer will see your application as withdrawn."}</p>
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
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "ကမ်းလှမ်းမှု လက်ခံမှာ သေချာပါသလား?" : "Accept this offer?"}</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                {lang === "my"
                  ? "လက်ခံပြီးပါက အခြေအနေသည် 'ခန့်အပ်ပြီး' ဖြစ်သွားပါမည်။"
                  : "Once accepted, the application status will be marked as Placed."}
              </p>
              <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground/80">
                {lang === "my"
                  ? "သင် လက်ခံခြင်းဖြင့် ခန့်အပ်မှုကို အတည်ပြုပါသည်။ သင့်အလုပ်ရှင်သည် ပေးချေငွေ မှတ်တမ်းတင်ပါမည်။ ဆက်သွားမည်လား?"
                  : "By accepting, you confirm your placement. Your employer will record a placement fee. Confirm acceptance?"}
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
