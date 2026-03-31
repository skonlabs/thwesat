import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Clock, ChevronRight, CheckCircle, Eye, FileText, X, Star, Calendar, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

const applications = [
  { title: "Senior React Developer", company: "TechCorp Asia", date: "Mar 28", status: "shortlisted", statusMm: "ရွေးချယ်ခံရ", statusEn: "Shortlisted", statusColor: "bg-emerald/10 text-emerald", interviewDate: "Apr 2, 2:00 PM SGT", salary: "$3,000-5,000/mo" },
  { title: "UI/UX Designer", company: "DesignStudio BKK", date: "Mar 25", status: "viewed", statusMm: "ကြည့်ရှုပြီး", statusEn: "Viewed", statusColor: "bg-primary/10 text-primary", interviewDate: null, salary: "$2,000-3,500/mo" },
  { title: "Full Stack Developer", company: "StartupHub SG", date: "Mar 22", status: "submitted", statusMm: "တင်ပြပြီး", statusEn: "Submitted", statusColor: "bg-muted text-muted-foreground", interviewDate: null, salary: "$4,000-6,000/mo" },
  { title: "Project Coordinator", company: "NGO Partners", date: "Mar 15", status: "rejected", statusMm: "ငြင်းပယ်ခံရ", statusEn: "Rejected", statusColor: "bg-destructive/10 text-destructive", rejectionReason: { my: "အတွေ့အကြုံ မလုံလောက်", en: "Not enough experience" }, interviewDate: null, salary: "$1,800-2,800/mo" },
  { title: "Digital Marketing", company: "Growth Co", date: "Mar 10", status: "placed", statusMm: "အောင်မြင်", statusEn: "Placed", statusColor: "bg-emerald/10 text-emerald", interviewDate: null, salary: "$1,500-2,500/mo" },
];

const statusIcons: Record<string, typeof CheckCircle> = {
  shortlisted: CheckCircle,
  viewed: Eye,
  submitted: FileText,
  rejected: X,
  placed: CheckCircle,
};

const Applications = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const stats = [
    { label: lang === "my" ? "တင်ပြပြီး" : "Submitted", count: 5, color: "text-foreground" },
    { label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed", count: 3, color: "text-primary" },
    { label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted", count: 1, color: "text-emerald" },
    { label: lang === "my" ? "အောင်မြင်" : "Placed", count: 1, color: "text-emerald" },
  ];

  const filteredApps = filter === "all" ? applications : applications.filter(a => a.status === filter);

  const handleWithdraw = (index: number) => {
    toast({
      title: lang === "my" ? "လျှောက်လွှာ ရုပ်သိမ်းပြီးပါပြီ" : "Application withdrawn",
    });
    setSelectedApp(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "လျှောက်လွှာများ" : "My Applications"} />

      <div className="px-5">
        <div className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { value: "all", label: lang === "my" ? "အားလုံး" : "All" },
            { value: "shortlisted", label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted" },
            { value: "viewed", label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed" },
            { value: "submitted", label: lang === "my" ? "တင်ပြပြီး" : "Submitted" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6">
        {filteredApps.map((app, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedApp(i)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left active:bg-muted"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">{app.title}</h3>
              <p className="text-xs text-muted-foreground">{app.company} · {app.salary}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${app.statusColor}`}>
                  {(() => { const Icon = statusIcons[app.status]; return <Icon className="h-3 w-3" />; })()}
                  {lang === "my" ? app.statusMm : app.statusEn}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {app.date}
                </span>
                {app.interviewDate && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <Calendar className="h-3 w-3" /> {lang === "my" ? "အင်တာဗျူး" : "Interview"}
                  </span>
                )}
              </div>
              {app.status === "rejected" && app.rejectionReason && (
                <p className="mt-1 text-[10px] text-destructive">
                  {lang === "my" ? `အကြောင်းပြချက်: ${app.rejectionReason.my}` : `Reason: ${app.rejectionReason.en}`}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </motion.button>
        ))}
      </div>

      {/* Application Detail Sheet */}
      <AnimatePresence>
        {selectedApp !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 top-0 bottom-16 z-[60] flex items-end justify-center bg-foreground/40" onClick={() => setSelectedApp(null)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-8" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{applications[selectedApp].title}</h2>
                <button onClick={() => setSelectedApp(null)} className="rounded-lg p-1 active:bg-muted"><X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></button>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{applications[selectedApp].company}</p>
              <div className="mb-4 flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${applications[selectedApp].statusColor}`}>
                  {lang === "my" ? applications[selectedApp].statusMm : applications[selectedApp].statusEn}
                </span>
                <span className="text-xs text-muted-foreground">{applications[selectedApp].salary}</span>
              </div>

              {/* Timeline */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-xs text-foreground">{lang === "my" ? "လျှောက်လွှာ တင်ပြပြီး" : "Application submitted"} · {applications[selectedApp].date}</p>
                </div>
                {applications[selectedApp].status !== "submitted" && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <p className="text-xs text-foreground">{lang === "my" ? "အလုပ်ရှင် ကြည့်ရှုပြီး" : "Employer viewed"}</p>
                  </div>
                )}
                {applications[selectedApp].interviewDate && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald" />
                    <p className="text-xs text-emerald font-medium">{lang === "my" ? "အင်တာဗျူး" : "Interview"}: {applications[selectedApp].interviewDate}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {applications[selectedApp].status === "submitted" && (
                  <Button variant="destructive" size="lg" className="flex-1 rounded-xl" onClick={() => handleWithdraw(selectedApp)}>
                    {lang === "my" ? "ရုပ်သိမ်းရန်" : "Withdraw"}
                  </Button>
                )}
                <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => { setSelectedApp(null); navigate("/jobs/detail"); }}>
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
