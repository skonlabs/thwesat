import { motion } from "framer-motion";
import { Bell, Search, Briefcase, Users, Shield, TrendingUp, MapPin, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const quickActions = [
  { icon: Briefcase, label: "အလုပ်ရှာ", labelEn: "Jobs", path: "/jobs", gradient: "from-primary to-gold-dark" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", gradient: "from-emerald to-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", gradient: "from-accent to-accent" },
  { icon: Sparkles, label: "AI Tools", labelEn: "AI Tools", path: "/ai-tools", gradient: "from-gold-dark to-primary" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community", gradient: "from-primary to-accent" },
  { icon: TrendingUp, label: "လျှောက်လွှာ", labelEn: "Applications", path: "/applications", gradient: "from-emerald to-emerald" },
];

const featuredJobs = [
  { title: "React Developer", company: "TechCorp Asia", location: "Remote", salary: "$2,500 - $4,000/mo", isNew: true },
  { title: "UI/UX Designer", company: "DesignStudio", location: "Bangkok, TH", salary: "$1,800 - $3,000/mo", isNew: true },
  { title: "Project Manager", company: "NGO Partners", location: "Remote", salary: "$2,000 - $3,500/mo", isNew: false },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={lang === "my" ? "ပင်မစာမျက်နှာ" : "Home"} />

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden bg-gradient-gold pb-16 pt-5">
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10" />
        <div className="absolute -left-4 bottom-4 h-20 w-20 rounded-full bg-primary-foreground/8" />

        <div className="relative px-5">
          {/* Greeting row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/25 text-lg font-bold text-primary-foreground shadow-lg backdrop-blur-sm">
                M
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-primary-foreground/60">
                  {lang === "my" ? "မင်္ဂလာပါ" : "Welcome back"}
                </p>
                <h2 className="text-lg font-bold text-primary-foreground">
                  {lang === "my" ? "မောင်မောင်" : "Maung Maung"}
                </h2>
              </div>
            </div>
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm transition-all active:scale-95"
            >
              <Bell className="h-5 w-5 text-primary-foreground" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-primary" />
            </button>
          </div>

          {/* Search floating card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-lg"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              {lang === "my" ? "အလုပ်၊ ကျွမ်းကျင်မှု ရှာဖွေရန်..." : "Search jobs, skills..."}
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── Quick Actions (overlapping hero) ── */}
      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="-mt-8 grid grid-cols-3 gap-2.5"
        >
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-card transition-all active:scale-[0.97]"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}>
                <action.icon className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Profile Completion ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 overflow-hidden rounded-2xl bg-card shadow-card"
        >
          <div className="p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">45%</span>
            </div>
            <div className="mb-2.5 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "45%" }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-gold"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {lang === "my" ? "ပရိုဖိုင်ကို ပြည့်စုံအောင် ဖြည့်ပြီး အလုပ် အကြံပြုချက်များ တိုးမြှင့်ပါ" : "Complete your profile to unlock better job matches"}
            </p>
          </div>
          <button
            onClick={() => navigate("/profile/edit")}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-muted/30 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-muted/60"
          >
            {lang === "my" ? "ပြည့်စုံအောင် ဖြည့်ရန်" : "Complete Now"}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* ── Featured Jobs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">{lang === "my" ? "အသစ်ထွက် အလုပ်များ" : "Featured Jobs"}</h2>
            <button onClick={() => navigate("/jobs")} className="flex items-center gap-0.5 text-xs font-semibold text-primary">
              {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {featuredJobs.map((job, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06 }}
                onClick={() => navigate("/jobs/detail")}
                className="flex w-full items-center gap-3.5 rounded-2xl bg-card p-3.5 text-left shadow-card transition-all active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold-dark shadow-sm">
                  <Briefcase className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-foreground">{job.title}</h3>
                    {job.isNew && (
                      <span className="flex-shrink-0 rounded-md bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                    <span className="text-[11px] font-bold text-primary">{job.salary}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Community Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-6 mt-6 overflow-hidden rounded-2xl bg-gradient-gold shadow-gold"
        >
          <div className="px-5 pb-5 pt-4">
            <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-primary-foreground/80">
              {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "5K+", label: lang === "my" ? "အဖွဲ့ဝင်" : "Members" },
                { value: "200+", label: lang === "my" ? "အလုပ်" : "Jobs" },
                { value: "50+", label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-primary-foreground/15 p-3 text-center backdrop-blur-sm">
                  <p className="text-xl font-extrabold text-primary-foreground">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-primary-foreground/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
