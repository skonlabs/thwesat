import { motion } from "framer-motion";
import { Search, Briefcase, Users, Shield, TrendingUp, MapPin, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const quickActions = [
  { icon: Briefcase, label: "အလုပ်ရှာ", labelEn: "Jobs", path: "/jobs", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-accent/10", fg: "text-accent" },
  { icon: Sparkles, label: "Career Tools", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-primary/10", fg: "text-primary" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: TrendingUp, label: "လျှောက်လွှာ", labelEn: "Applications", path: "/applications", bg: "bg-accent/10", fg: "text-accent" },
];

const featuredJobs = [
  { title: "React Developer", company: "TechCorp Asia", location: "Remote", salary: "$2,500–$4,000/mo", isNew: true },
  { title: "UI/UX Designer", company: "DesignStudio", location: "Bangkok, TH", salary: "$1,800–$3,000/mo", isNew: true },
  { title: "Project Manager", company: "NGO Partners", location: "Remote", salary: "$2,000–$3,500/mo", isNew: false },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "ပင်မစာမျက်နှာ" : "Home"} />

      {/* Greeting + Notification */}
      <div className="border-b border-border bg-card px-5 pb-5 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              M
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lang === "my" ? "မင်္ဂလာပါ" : "Welcome back"}</p>
              <p className="text-[15px] font-bold text-foreground">{lang === "my" ? "မောင်မောင်" : "Maung Maung"}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-foreground active:bg-muted"
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </div>

        {/* Search */}
        <button
          onClick={() => navigate("/jobs")}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm text-muted-foreground">
            {lang === "my" ? "အလုပ်၊ ကျွမ်းကျင်မှု ရှာဖွေရန်..." : "Search jobs, skills..."}
          </span>
        </button>
      </div>

      <div className="px-5 pt-5">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

        {/* Profile Completion */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 rounded-xl border border-border bg-card p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
            <span className="text-xs font-bold text-primary">45%</span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "45%" }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "my" ? "ပရိုဖိုင်ကို ပြည့်စုံအောင် ဖြည့်ပြီး အလုပ် အကြံပြုချက်များ တိုးမြှင့်ပါ" : "Complete your profile to unlock better job matches"}
          </p>
        </motion.div>

        {/* Featured Jobs */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">{lang === "my" ? "အသစ်ထွက် အလုပ်များ" : "Featured Jobs"}</h2>
            <button onClick={() => navigate("/jobs")} className="flex items-center text-xs font-semibold text-primary">
              {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="space-y-2.5">
            {featuredJobs.map((job, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                onClick={() => navigate("/jobs/detail")}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{job.title}</h3>
                    {job.isNew && (
                      <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">NEW</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} /> {job.location}
                    </span>
                    <span className="text-[11px] font-semibold text-primary">{job.salary}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 mt-6 rounded-xl bg-primary p-5"
        >
          <h3 className="mb-4 text-sm font-bold text-primary-foreground">
            {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "5K+", label: lang === "my" ? "အဖွဲ့ဝင်" : "Members" },
              { value: "200+", label: lang === "my" ? "အလုပ်" : "Jobs" },
              { value: "50+", label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-primary-foreground/15 p-3 text-center">
                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
