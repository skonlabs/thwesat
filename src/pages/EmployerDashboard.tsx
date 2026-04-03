import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Users, Eye, TrendingUp, Plus, BarChart3, Clock, CheckCircle, Pause, XCircle, ChevronRight, Building2, Shield, MessageSquare, Sparkles, UserSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { useEmployerJobs } from "@/hooks/use-jobs";
import PageHeader from "@/components/PageHeader";

const statusConfig: Record<string, { label: { my: string; en: string }; color: string; icon: typeof CheckCircle }> = {
  active: { label: { my: "လက်ခံနေ", en: "Active" }, color: "text-emerald bg-emerald/10", icon: CheckCircle },
  pending: { label: { my: "စစ်ဆေးဆဲ", en: "Pending" }, color: "text-primary bg-primary/10", icon: Clock },
  paused: { label: { my: "ခေတ္တရပ်", en: "Paused" }, color: "text-muted-foreground bg-muted", icon: Pause },
  closed: { label: { my: "ပိတ်ပြီး", en: "Closed" }, color: "text-destructive bg-destructive/10", icon: XCircle },
  rejected: { label: { my: "ငြင်းပယ်", en: "Rejected" }, color: "text-destructive bg-destructive/10", icon: XCircle },
};

const quickActions = [
  { icon: Plus, label: "အလုပ်တင်", labelEn: "Post Job", path: "/employer/post-job", bg: "bg-primary/10", fg: "text-primary" },
  { icon: UserSearch, label: "ဝန်ထမ်းရှာ", labelEn: "Find Talent", path: "/employer/search", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-accent/10", fg: "text-accent" },
  { icon: MessageSquare, label: "အသိုင်း", labelEn: "Community", path: "/community", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Sparkles, label: "ကိရိယာများ", labelEn: "Tools", path: "/ai-tools", bg: "bg-accent/10", fg: "text-accent" },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: empProfile } = useEmployerProfile();
  const { data: jobs, isLoading } = useEmployerJobs();
  const [filter, setFilter] = useState("all");

  const listings = jobs || [];
  const filteredListings = filter === "all" ? listings : listings.filter(l => l.status === filter);
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalApplicants = listings.reduce((a, l) => a + (l.applicant_count || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် ဒက်ရှ်ဘုတ်" : "Employer Dashboard"} />
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-bold text-foreground">{empProfile?.company_name || (lang === "my" ? "ကုမ္ပဏီအမည်" : "Company")}</p>
            <p className={`text-[11px] font-medium ${empProfile?.is_verified ? "text-emerald" : "text-muted-foreground"}`}>
              {empProfile?.is_verified ? `✓ ${lang === "my" ? "အတည်ပြုပြီး" : "Verified"}` : (lang === "my" ? "စစ်ဆေးဆဲ" : "Pending Verification")}
            </p>
          </div>
        </motion.div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: { my: "အလုပ်ခေါ်စာ", en: "Active Listings" }, value: activeCount.toString(), color: "text-primary bg-primary/10" },
            { icon: Users, label: { my: "လျှောက်ထားသူ", en: "Applications" }, value: totalApplicants.toString(), color: "text-emerald bg-emerald/10" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3.5">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" strokeWidth={1.5} /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.div>
          ))}
        </div>

        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}><action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} /></div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>

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
          {isLoading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">{lang === "my" ? "ရှာဖွေနေပါသည်..." : "Loading..."}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="text-sm font-medium text-muted-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ မရှိပါ" : "No job listings yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{lang === "my" ? "ပထမဆုံး အလုပ်ခေါ်စာကို တင်ပါ" : "Post your first job to start receiving applications"}</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => navigate("/employer/post-job")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {lang === "my" ? "အလုပ်တင်ရန်" : "Post a Job"}
              </Button>
            </div>
          ) : (
            filteredListings.map((listing, i) => {
              const sc = statusConfig[listing.status || "pending"] || statusConfig.pending;
              return (
                <motion.button key={listing.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate("/employer/applications")}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left active:bg-muted/30">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" && listing.title_my ? listing.title_my : listing.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}</p>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                      <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? sc.label.my : sc.label.en}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {listing.applicant_count || 0} {lang === "my" ? "လျှောက်" : "applied"}</span>
                    <ChevronRight className="ml-auto h-4 w-4" strokeWidth={1.5} />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
