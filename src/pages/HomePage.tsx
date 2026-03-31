import { motion } from "framer-motion";
import { Bell, Search, Briefcase, Users, Shield, TrendingUp, Star, MapPin, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const quickActions = [
  { icon: Briefcase, label: "အလုပ်ရှာ", labelEn: "Jobs", path: "/jobs", color: "bg-primary/10 text-primary" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", color: "bg-emerald/10 text-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", color: "bg-accent/10 text-accent" },
  { icon: Sparkles, label: "AI Tools", labelEn: "AI Tools", path: "/ai-tools", color: "bg-gold/10 text-gold-dark" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community", color: "bg-secondary text-secondary-foreground" },
  { icon: TrendingUp, label: "လျှောက်လွှာ", labelEn: "Applications", path: "/applications", color: "bg-primary/10 text-primary" },
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

      {/* Hero greeting */}
      <div className="bg-gradient-gold px-5 pb-10 pt-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary-foreground/70">{lang === "my" ? "မင်္ဂလာပါ 👋" : "Hello 👋"}</p>
            <h2 className="text-xl font-bold text-primary-foreground">
              {lang === "my" ? "မောင်မောင်" : "Maung Maung"}
            </h2>
          </div>
          <button onClick={() => navigate("/notifications")} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm transition-all active:scale-95">
            <Bell className="h-5 w-5 text-primary-foreground" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-destructive" />
          </button>
        </div>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary-foreground/20 px-4 py-3.5 backdrop-blur-sm">
          <Search className="h-4.5 w-4.5 text-primary-foreground/60" />
          <span className="text-sm text-primary-foreground/60">{lang === "my" ? "အလုပ်၊ ကျွမ်းကျင်မှု ရှာဖွေရန်..." : "Search jobs, skills..."}</span>
        </div>
      </div>

      <div className="px-6">
        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="-mt-4 grid grid-cols-3 gap-3"
        >
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-card p-3 shadow-card"
            >
              <div className={`rounded-xl p-2.5 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </button>
          ))}
        </motion.div>

        {/* Profile completion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-2xl bg-card p-4 shadow-card"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
            <span className="text-xs font-bold text-primary">45%</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[45%] rounded-full bg-gradient-gold transition-all" />
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "my" ? "ပရိုဖိုင်ကို ပြည့်စုံအောင် ဖြည့်စွက်ပြီး အလုပ်ရှာဖွေမှု အခွင့်အလမ်းများ တိုးမြှင့်ပါ" : "Complete your profile to get better job recommendations"}
          </p>
        </motion.div>

        {/* Featured jobs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">{lang === "my" ? "အသစ်ထွက် အလုပ်များ" : "Featured Jobs"}</h2>
            <button onClick={() => navigate("/jobs")} className="flex items-center text-xs font-medium text-primary">
              {lang === "my" ? "အားလုံးကြည့်ရန်" : "View all"} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {featuredJobs.map((job, i) => (
              <button
                key={i}
                onClick={() => navigate("/jobs/detail")}
                className="flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-card transition-all active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                    {job.isNew && (
                      <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                    <span className="text-[11px] font-medium text-primary">{job.salary}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Community stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 mt-6 rounded-2xl bg-gradient-gold p-5"
        >
          <h3 className="mb-4 text-sm font-bold text-primary-foreground">
            {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "5,000+", label: lang === "my" ? "အဖွဲ့ဝင်" : "Members" },
              { value: "200+", label: lang === "my" ? "အလုပ်" : "Jobs" },
              { value: "50+", label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
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
