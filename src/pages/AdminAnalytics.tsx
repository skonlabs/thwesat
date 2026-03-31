import { motion } from "framer-motion";
import { Users, Briefcase, DollarSign, MessageCircle, Star, Shield, TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import PageHeader from "@/components/PageHeader";

const sections = [
  {
    title: { my: "အဖွဲ့ဝင်များ", en: "Members" },
    metrics: [
      { label: { my: "စုစုပေါင်း မှတ်ပုံတင်", en: "Total Registrations" }, value: "2,847", trend: "+12%", up: true },
      { label: { my: "လစဉ် တက်ကြွ", en: "MAM" }, value: "1,234", trend: "+8%", up: true },
      { label: { my: "Onboarding ပြီးဆုံးနှုန်း", en: "Onboarding Completion" }, value: "73%", trend: "+5%", up: true },
      { label: { my: "ပရိုဖိုင် ပြည့်စုံနှုန်း", en: "Profile Completeness" }, value: "64%", trend: "+2%", up: true },
      { label: { my: "Referral စွမ်းဆောင်ရည်", en: "Referral Performance" }, value: "156", trend: "+34%", up: true },
    ],
  },
  {
    title: { my: "ဝင်ငွေ", en: "Revenue" },
    metrics: [
      { label: { my: "MRR", en: "MRR" }, value: "$4,280", trend: "+18%", up: true },
      { label: { my: "Premium ဝင်ငွေ", en: "Premium Revenue" }, value: "$2,394", trend: "+15%", up: true },
      { label: { my: "အလုပ်ရှင် ဝင်ငွေ", en: "Employer Revenue" }, value: "$1,560", trend: "+22%", up: true },
      { label: { my: "ခန့်အပ်ကြေး", en: "Placement Fees" }, value: "$326", trend: "-5%", up: false },
      { label: { my: "Churn နှုန်း", en: "Churn Rate" }, value: "4.2%", trend: "-1%", up: true },
      { label: { my: "ARPU", en: "ARPU" }, value: "$8.40", trend: "+3%", up: true },
    ],
  },
  {
    title: { my: "အလုပ်ခေါ်စာ", en: "Jobs" },
    metrics: [
      { label: { my: "တင်ထားသော", en: "Listed" }, value: "312", trend: "+20%", up: true },
      { label: { my: "အတည်ပြုပြီး", en: "Verified" }, value: "289", trend: "+18%", up: true },
      { label: { my: "ငြင်းပယ်ပြီး", en: "Rejected" }, value: "23", trend: "-12%", up: true },
      { label: { my: "လျှောက်ထားမှု/ခေါ်စာ", en: "Applications/Listing" }, value: "8.3", trend: "+5%", up: true },
      { label: { my: "ခန့်အပ်နှုန်း", en: "Placement Rate" }, value: "12%", trend: "+3%", up: true },
    ],
  },
  {
    title: { my: "အသိုင်းအဝိုင်း", en: "Community" },
    metrics: [
      { label: { my: "ပို့စ် ဖန်တီးမှု", en: "Posts Created" }, value: "456", trend: "+25%", up: true },
      { label: { my: "စစ်ဆေးရန် ကိုလုံ", en: "Moderation Queue" }, value: "12", trend: "-8%", up: true },
      { label: { my: "ပျမ်း စစ်ဆေးချိန်", en: "Avg Review Time" }, value: "2.4h", trend: "-15%", up: true },
      { label: { my: "ဖယ်ရှားနှုန်း", en: "Removal Rate" }, value: "3%", trend: "-1%", up: true },
    ],
  },
  {
    title: { my: "Mentorship", en: "Mentorship" },
    metrics: [
      { label: { my: "ချိတ်ဆက်မှု", en: "Matches" }, value: "89", trend: "+30%", up: true },
      { label: { my: "တက်ကြွ Mentors", en: "Active Mentors" }, value: "24", trend: "+4", up: true },
      { label: { my: "ချိန်းဆိုမှုများ", en: "Sessions" }, value: "312", trend: "+22%", up: true },
      { label: { my: "ပျမ်း အဆင့်သတ်မှတ်", en: "Avg Rating" }, value: "4.7", trend: "+0.1", up: true },
    ],
  },
  {
    title: { my: "လုံခြုံရေး", en: "Safety" },
    metrics: [
      { label: { my: "Delegate Token ဖန်တီးမှု", en: "Delegate Tokens Created" }, value: "45", trend: "+10", up: true },
      { label: { my: "အရေးပေါ် ထွက်ခွာမှု", en: "Emergency Clears" }, value: "12", trend: "", up: true },
    ],
  },
];

const AdminAnalytics = () => {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title={lang === "my" ? "ခွဲခြမ်းစိတ်ဖြာ" : "Analytics"} />
      <div className="px-5 space-y-5">
        {sections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
            <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? section.title.my : section.title.en}</h2>
            <div className="grid grid-cols-2 gap-2">
              {section.metrics.map((m, mi) => (
                <div key={mi} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? m.label.my : m.label.en}</p>
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                  {m.trend && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${m.up ? "text-emerald" : "text-destructive"}`}>
                      {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {m.trend}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalytics;
