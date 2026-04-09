import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const { data: metrics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [users, premiumUsers, employers, verifiedEmployers, jobs, activeJobs, pendingJobs, posts, approvedPosts, mentors, bookings, applications, payments, approvedPayments, reports, guides] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("employer_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("mentor_profiles").select("id", { count: "exact", head: true }).not("title", "is", null).neq("title", ""),
        supabase.from("mentor_bookings").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("scam_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("guides").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalUsers: users.count || 0,
        premiumUsers: premiumUsers.count || 0,
        totalEmployers: employers.count || 0,
        verifiedEmployers: verifiedEmployers.count || 0,
        totalJobs: jobs.count || 0,
        activeJobs: activeJobs.count || 0,
        pendingJobs: pendingJobs.count || 0,
        totalPosts: posts.count || 0,
        approvedPosts: approvedPosts.count || 0,
        totalMentors: mentors.count || 0,
        totalBookings: bookings.count || 0,
        totalApplications: applications.count || 0,
        totalPayments: payments.count || 0,
        approvedPayments: approvedPayments.count || 0,
        pendingReports: reports.count || 0,
        totalGuides: guides.count || 0,
      };
    },
  });

  const sections = [
    {
      title: { my: "အဖွဲ့ဝင်များ", en: "Members" },
      items: [
        { label: { my: "စုစုပေါင်း မှတ်ပုံတင်", en: "Total Users" }, value: metrics?.totalUsers?.toLocaleString() || "0", path: "/admin/users" },
        { label: { my: "Premium အသုံးပြုသူ", en: "Premium Users" }, value: metrics?.premiumUsers?.toString() || "0", path: "/admin/users" },
      ],
    },
    {
      title: { my: "အလုပ်ရှင်များ", en: "Employers" },
      items: [
        { label: { my: "စုစုပေါင်း အလုပ်ရှင်", en: "Total Employers" }, value: metrics?.totalEmployers?.toString() || "0", path: "/admin/employers" },
        { label: { my: "အတည်ပြုပြီး", en: "Verified" }, value: metrics?.verifiedEmployers?.toString() || "0", path: "/admin/employers?status=approved" },
      ],
    },
    {
      title: { my: "အလုပ်ခေါ်စာ", en: "Jobs" },
      items: [
        { label: { my: "စုစုပေါင်း", en: "Total Listed" }, value: metrics?.totalJobs?.toString() || "0", path: "/admin/jobs" },
        { label: { my: "တက်ကြွ", en: "Active" }, value: metrics?.activeJobs?.toString() || "0", path: "/admin/jobs?status=active" },
        { label: { my: "စစ်ဆေးရန်", en: "Pending Review" }, value: metrics?.pendingJobs?.toString() || "0", path: "/admin/jobs?status=pending" },
        { label: { my: "လျှောက်ထားမှု", en: "Applications" }, value: metrics?.totalApplications?.toString() || "0", path: "/admin/jobs" },
      ],
    },
    {
      title: { my: "ငွေပေးချေမှု", en: "Payments" },
      items: [
        { label: { my: "စုစုပေါင်း", en: "Total Requests" }, value: metrics?.totalPayments?.toString() || "0", path: "/admin/payments" },
        { label: { my: "အတည်ပြုပြီး", en: "Approved" }, value: metrics?.approvedPayments?.toString() || "0", path: "/admin/payments" },
      ],
    },
    {
      title: { my: "အသိုင်းအဝိုင်း", en: "Community" },
      items: [
        { label: { my: "ပို့စ်များ", en: "Total Posts" }, value: metrics?.totalPosts?.toString() || "0", path: "/community" },
        { label: { my: "အတည်ပြုပြီး", en: "Approved Posts" }, value: metrics?.approvedPosts?.toString() || "0", path: "/community" },
        { label: { my: "ဥပဒေလမ်းညွှန်", en: "Guides" }, value: metrics?.totalGuides?.toString() || "0", path: "/guides" },
      ],
    },
    {
      title: { my: "Mentorship", en: "Mentorship" },
      items: [
        { label: { my: "Mentors", en: "Active Mentors" }, value: metrics?.totalMentors?.toString() || "0", path: "/mentors" },
        { label: { my: "ချိန်းဆိုမှုများ", en: "Total Sessions" }, value: metrics?.totalBookings?.toString() || "0", path: "/moderator" },
      ],
    },
    {
      title: { my: "လုံခြုံရေး", en: "Safety" },
      items: [
        { label: { my: "စစ်ဆေးရန် တိုင်ကြားချက်", en: "Pending Reports" }, value: metrics?.pendingReports?.toString() || "0", path: "/admin/users" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ခွဲခြမ်းစိတ်ဖြာ" : "Analytics"} />
      <div className="px-5 space-y-5">
        {sections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
            <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? section.title.my : section.title.en}</h2>
            <div className="grid grid-cols-2 gap-2">
              {section.items.map((m, mi) => (
                <button key={mi} onClick={() => navigate(m.path)} className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">{lang === "my" ? m.label.my : m.label.en}</p>
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalytics;