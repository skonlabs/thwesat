import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Clock, ChevronRight, CheckCircle, Eye, FileText, X, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { useApplications } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusIcons: Record<string, typeof CheckCircle> = {
  shortlisted: CheckCircle, viewed: Eye, applied: FileText, submitted: FileText,
  rejected: X, placed: CheckCircle, interviewed: Calendar, offered: CheckCircle,
  withdrawn: X,
};

const statusLabels: Record<string, { my: string; en: string; color: string }> = {
  applied: { my: "တင်ပြပြီး", en: "Applied", color: "bg-muted text-muted-foreground" },
  submitted: { my: "တင်ပြပြီး", en: "Submitted", color: "bg-muted text-muted-foreground" },
  viewed: { my: "ကြည့်ရှုပြီး", en: "Viewed", color: "bg-primary/10 text-primary" },
  shortlisted: { my: "ရွေးချယ်ခံရ", en: "Shortlisted", color: "bg-emerald/10 text-emerald" },
  interviewed: { my: "အင်တာဗျူး", en: "Interviewed", color: "bg-primary/10 text-primary" },
  offered: { my: "ကမ်းလှမ်းခံရ", en: "Offered", color: "bg-emerald/10 text-emerald" },
  rejected: { my: "ငြင်းပယ်ခံရ", en: "Rejected", color: "bg-destructive/10 text-destructive" },
  placed: { my: "အောင်မြင်", en: "Placed", color: "bg-emerald/10 text-emerald" },
  withdrawn: { my: "ရုပ်သိမ်းပြီး", en: "Withdrawn", color: "bg-muted text-muted-foreground" },
};

const Applications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: applications, isLoading } = useApplications();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const apps = applications || [];
  const filteredApps = filter === "all" ? apps : apps.filter((a: any) => a.status === filter);
  const selected = apps.find((a: any) => a.id === selectedApp);

  const statusCounts = {
    total: apps.length,
    viewed: apps.filter((a: any) => a.status === "viewed").length,
    shortlisted: apps.filter((a: any) => a.status === "shortlisted").length,
    placed: apps.filter((a: any) => a.status === "placed").length,
  };

  const handleWithdraw = async () => {
    if (!selectedApp) return;
    const { error } = await supabase.from("applications").update({ status: "withdrawn", withdrawn_at: new Date().toISOString() }).eq("id", selectedApp);
    if (error) {
      toast.error(lang === "my" ? "ရုပ်သိမ်း၍ မရပါ" : "Failed to withdraw application");
      return;
    }
    toast.success(lang === "my" ? "လျှောက်လွှာ ရုပ်သိမ်းပြီး" : "Application withdrawn successfully");
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    setSelectedApp(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "လျှောက်လွှာများ" : "My Applications"} />
      <div className="px-5">
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: lang === "my" ? "တင်ပြပြီး" : "Total", count: statusCounts.total, color: "text-foreground" },
            { label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed", count: statusCounts.viewed, color: "text-primary" },
            { label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted", count: statusCounts.shortlisted, color: "text-emerald" },
            { label: lang === "my" ? "အောင်မြင်" : "Placed", count: statusCounts.placed, color: "text-emerald" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { value: "all", label: lang === "my" ? "အားလုံး" : "All" },
            { value: "applied", label: lang === "my" ? "တင်ပြပြီး" : "Applied" },
            { value: "viewed", label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed" },
            { value: "shortlisted", label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted" },
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
         <div className="flex flex-col items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading..."}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "လျှောက်လွှာ မရှိပါ" : "No applications yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "အလုပ်ရှာဖွေပြီး လျှောက်ထားပါ" : "Browse jobs and start applying"}</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/jobs")}>
              {lang === "my" ? "အလုပ်ရှာဖွေရန်" : "Browse Jobs"}
            </Button>
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
                  <p className="text-xs text-muted-foreground">{job?.company} {job?.salary_min && job?.salary_max ? `· $${job.salary_min}-${job.salary_max}/mo` : ""}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sl.color}`}>
                      <Icon className="h-3 w-3" /> {lang === "my" ? sl.my : sl.en}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
                    </span>
                    {app.interview_date && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Calendar className="h-3 w-3" /> {lang === "my" ? "အင်တာဗျူး" : "Interview"}
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
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
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
              <div className="flex gap-3">
                {(selected.status === "applied" || selected.status === "submitted") && (
                  <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={handleWithdraw}>
                    {lang === "my" ? "ရုပ်သိမ်းရန်" : "Withdraw"}
                  </Button>
                )}
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => { setSelectedApp(null); navigate(`/jobs/${selected.job_id}`); }}>
                  {lang === "my" ? "အလုပ် ကြည့်ရှုရန်" : "View Job"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Applications;
