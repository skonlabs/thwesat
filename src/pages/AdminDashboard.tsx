import { motion } from "framer-motion";
import { Users, Briefcase, Shield, TrendingUp, AlertTriangle, MessageCircle, DollarSign, ChevronRight, Clock, CheckCircle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const stats = [
  { icon: Users, label: { my: "စုစုပေါင်း အသုံးပြုသူ", en: "Total Users" }, value: "2,847", trend: "+12%", color: "text-primary bg-primary/10" },
  { icon: Briefcase, label: { my: "တက်ကြွ အလုပ်ခေါ်စာ", en: "Active Listings" }, value: "156", trend: "+8%", color: "text-emerald bg-emerald/10" },
  { icon: Crown, label: { my: "Premium အသုံးပြုသူ", en: "Premium Users" }, value: "342", trend: "+23%", color: "text-accent bg-accent/10" },
  { icon: DollarSign, label: { my: "လစဉ်ဝင်ငွေ", en: "MRR" }, value: "$4,280", trend: "+18%", color: "text-primary bg-primary/10" },
];

const pendingItems = [
  { icon: Briefcase, label: { my: "စစ်ဆေးရန် အလုပ်ခေါ်စာ", en: "Pending Job Listings" }, count: 7, oldest: "3h", path: "/admin/jobs", urgent: true },
  { icon: MessageCircle, label: { my: "စစ်ဆေးရန် ပို့စ်", en: "Pending Community Posts" }, count: 12, oldest: "1h", path: "/admin/moderation", urgent: false },
  { icon: Shield, label: { my: "အလုပ်ရှင် အတည်ပြုရန်", en: "Employer Verifications" }, count: 3, oldest: "1d", path: "/admin/employers", urgent: false },
  { icon: Users, label: { my: "Mentor လျှောက်လွှာ", en: "Mentor Applications" }, count: 2, oldest: "2d", path: "/admin/mentors", urgent: false },
  { icon: AlertTriangle, label: { my: "Scam တိုင်ကြားချက်", en: "Scam Reports" }, count: 1, oldest: "5h", path: "/admin/reports", urgent: true },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "Admin Dashboard" : "Admin Dashboard"} />
      <div className="px-5">
        {/* Stats Grid */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3.5">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
                <span className="text-[10px] font-medium text-emerald">{stat.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pending Actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "လုပ်ဆောင်ရန်" : "Pending Actions"}</h2>
        <div className="space-y-2">
          {pendingItems.map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left active:bg-muted/30 ${item.urgent ? "border-destructive/30" : "border-border"}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">{lang === "my" ? item.label.my : item.label.en}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {lang === "my" ? `အဟောင်းဆုံး: ${item.oldest} အကြာ` : `Oldest: ${item.oldest} ago`}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.urgent ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary"}`}>{item.count}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </motion.button>
          ))}
        </div>

        {/* Quick Navigation */}
        <h2 className="mb-3 mt-6 text-sm font-bold text-foreground">{lang === "my" ? "စီမံခန့်ခွဲမှု" : "Management"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: { my: "အသုံးပြုသူ", en: "Users" }, path: "/admin/users", icon: Users },
            { label: { my: "ခွဲခြမ်းစိတ်ဖြာ", en: "Analytics" }, path: "/admin/analytics", icon: TrendingUp },
            { label: { my: "လမ်းညွှန်ချက်", en: "Legal Guides" }, path: "/admin/guides", icon: Shield },
            { label: { my: "ဆက်တင်များ", en: "Settings" }, path: "/admin/settings", icon: CheckCircle },
          ].map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-4 active:bg-muted/30"
            >
              <item.icon className="mb-2 h-6 w-6 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-medium text-foreground">{lang === "my" ? item.label.my : item.label.en}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
