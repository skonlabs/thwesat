import { motion } from "framer-motion";
import { Briefcase, Clock, ChevronRight, CheckCircle, Eye, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const applications = [
  { title: "Senior React Developer", company: "TechCorp Asia", date: "Mar 28", status: "shortlisted", statusMm: "ရွေးချယ်ခံရ", statusEn: "Shortlisted", statusColor: "bg-emerald/10 text-emerald" },
  { title: "UI/UX Designer", company: "DesignStudio BKK", date: "Mar 25", status: "viewed", statusMm: "ကြည့်ရှုပြီး", statusEn: "Viewed", statusColor: "bg-primary/10 text-primary" },
  { title: "Full Stack Developer", company: "StartupHub SG", date: "Mar 22", status: "submitted", statusMm: "တင်ပြပြီး", statusEn: "Submitted", statusColor: "bg-muted text-muted-foreground" },
  { title: "Project Coordinator", company: "NGO Partners", date: "Mar 15", status: "rejected", statusMm: "ငြင်းပယ်ခံရ", statusEn: "Rejected", statusColor: "bg-destructive/10 text-destructive" },
  { title: "Digital Marketing", company: "Growth Co", date: "Mar 10", status: "placed", statusMm: "အောင်မြင်", statusEn: "Placed", statusColor: "bg-emerald/10 text-emerald" },
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

  const stats = [
    { label: lang === "my" ? "တင်ပြပြီး" : "Submitted", count: 5, color: "text-foreground" },
    { label: lang === "my" ? "ကြည့်ရှုပြီး" : "Viewed", count: 3, color: "text-primary" },
    { label: lang === "my" ? "ရွေးချယ်ခံ" : "Shortlisted", count: 1, color: "text-emerald" },
    { label: lang === "my" ? "အောင်မြင်" : "Placed", count: 1, color: "text-emerald" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "လျှောက်လွှာများ" : "My Applications"} />

      <div className="px-6">
        <div className="mb-5 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-card p-2.5 text-center shadow-card">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-6 pb-6">
        {applications.map((app, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card active:scale-[0.99]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">{app.title}</h3>
              <p className="text-xs text-muted-foreground">{app.company}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${app.statusColor}`}>
                  {(() => { const Icon = statusIcons[app.status]; return <Icon className="h-3 w-3" />; })()}
                  {lang === "my" ? app.statusMm : app.statusEn}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {app.date}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Applications;
