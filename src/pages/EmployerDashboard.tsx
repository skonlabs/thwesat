import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Users, Eye, TrendingUp, Plus, BarChart3, Clock, CheckCircle, Pause, XCircle, ChevronRight, DollarSign, Building2, Search, Shield, MessageSquare, Sparkles, UserSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

const mockListings = [
  { id: 1, title: "Senior React Developer", titleMy: "React Developer (အတွေ့အကြုံရှိ)", status: "active", views: 234, applications: 23, posted: "Mar 15", category: "tech" },
  { id: 2, title: "UI/UX Designer", titleMy: "UI/UX ဒီဇိုင်နာ", status: "active", views: 156, applications: 12, posted: "Mar 18", category: "design" },
  { id: 3, title: "Project Manager", titleMy: "ပရောဂျက် မန်နေဂျာ", status: "pending", views: 0, applications: 0, posted: "Mar 28", category: "pm" },
  { id: 4, title: "Content Writer", titleMy: "အကြောင်းအရာ ရေးသူ", status: "paused", views: 89, applications: 5, posted: "Feb 20", category: "translation" },
];

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  active: { label: { my: "လက်ခံနေ", en: "Active" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  pending: { label: { my: "စစ်ဆေးဆဲ", en: "Pending" }, color: "text-primary bg-primary/10", icon: Clock },
  paused: { label: { my: "ခေတ္တရပ်", en: "Paused" }, color: "text-muted-foreground bg-muted", icon: Pause },
  closed: { label: { my: "ပိတ်ပြီး", en: "Closed" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

const quickActions = [
  { icon: Plus, label: "အလုပ်တင်", labelEn: "Post Job", path: "/employer/post-job", bg: "bg-primary/10", fg: "text-primary" },
  { icon: UserSearch, label: "ဝန်ထမ်းရှာ", labelEn: "Find Talent", path: "/employer/search", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-accent/10", fg: "text-accent" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Sparkles, label: "အသက်မွေးမှု Tools", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-accent/10", fg: "text-accent" },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const filteredListings = filter === "all" ? mockListings : mockListings.filter(l => l.status === filter);

  const stats = [
    { icon: Briefcase, label: { my: "အလုပ်ခေါ်စာ", en: "Active Listings" }, value: "2", color: "text-primary bg-primary/10" },
    { icon: Users, label: { my: "လျှောက်ထားသူ", en: "Applications" }, value: "40", color: "text-emerald bg-emerald/10" },
    { icon: Eye, label: { my: "ကြည့်ရှုမှု", en: "Total Views" }, value: "479", color: "text-accent bg-accent/10" },
    { icon: TrendingUp, label: { my: "ခန့်အပ်မှု", en: "Placements" }, value: "3", color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် Dashboard" : "Employer Dashboard"} />
      <div className="px-5">
        {/* Verification Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-bold text-foreground">{lang === "my" ? "TechCorp Asia" : "TechCorp Asia"}</p>
            <p className="text-[11px] text-emerald font-medium">✓ {lang === "my" ? "အတည်ပြုပြီး" : "Verified Employer"}</p>
            <p className="text-[10px] text-muted-foreground">{lang === "my" ? "Standard Plan · အလုပ်ခေါ်စာ ၃ ခု" : "Standard Plan · 3 listings"}</p>
          </div>
        </motion.div>

        {/* Profile Completion */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
            <span className="text-xs font-bold text-primary">60%</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ width: 0 }} animate={{ width: "60%" }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full bg-primary" />
          </div>
          <button onClick={() => navigate("/profile/edit")} className="text-xs font-semibold text-primary">
            {lang === "my" ? "ပြင်ဆင်ရန်" : "Complete now"} →
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3.5">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.path + action.labelEn}
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

        {/* Listings */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "အလုပ်ခေါ်စာများ" : "My Listings"}</h2>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "active", "pending", "paused", "closed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
              {f === "all" ? (lang === "my" ? "အားလုံး" : "All") : (lang === "my" ? statusConfig[f]?.label.my : statusConfig[f]?.label.en)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredListings.map((listing, i) => {
            const sc = statusConfig[listing.status];
            return (
              <motion.button
                key={listing.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate("/employer/applications")}
                className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{lang === "my" ? listing.titleMy : listing.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? "တင်ရက်" : "Posted"}: {listing.posted}</p>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                    <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                    {lang === "my" ? sc.label.my : sc.label.en}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.views} {lang === "my" ? "ကြည့်" : "views"}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {listing.applications} {lang === "my" ? "လျှောက်" : "applied"}</span>
                  <ChevronRight className="ml-auto h-4 w-4" strokeWidth={1.5} />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Analytics Preview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-5 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground"><BarChart3 className="mr-1.5 inline h-4 w-4 text-primary" />{lang === "my" ? "စွမ်းဆောင်ရည်" : "Performance"}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">12.3%</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "လျှောက်ထားနှုန်း" : "Apply Rate"}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald">4.2</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ပျမ်း ရက်" : "Avg Days"}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-accent">87%</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? "အရည်အသွေး" : "Quality"}</p>
            </div>
          </div>
        </motion.div>

        {/* Community Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-6 mt-5 rounded-xl bg-primary p-5">
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
