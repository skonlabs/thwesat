import { useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, Users, Shield, TrendingUp, MapPin, ChevronRight, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useJobs } from "@/hooks/use-jobs";
import { useMentorProfiles } from "@/hooks/use-mentor-data";
import { useAllProfiles } from "@/hooks/use-profiles";
import { useUserRoles } from "@/hooks/use-user-roles";
import PageHeader from "@/components/PageHeader";
import { formatJobSalary, translateJobLocation, translateJobTitle } from "@/lib/job-localization";

const jobseekerActions = [
  { icon: Briefcase, label: "အလုပ်ရှာ", labelEn: "Jobs", path: "/jobs", bg: "bg-accent/15", fg: "text-gold-dark" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-primary/8", fg: "text-primary" },
  { icon: Sparkles, label: "ကိရိယာများ", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-accent/15", fg: "text-gold-dark" },
  { icon: Wallet, label: "ငွေကြေး", labelEn: "Finance", path: "/finance", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: TrendingUp, label: "လျှောက်လွှာ", labelEn: "Applications", path: "/applications", bg: "bg-primary/8", fg: "text-primary" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { isAdmin, isModerator, isLoading: rolesLoading } = useUserRoles();
  const { data: jobs } = useJobs();
  const { data: mentors } = useMentorProfiles();
  const { data: allProfiles } = useAllProfiles();

  // Redirect admin/moderator users to their dashboard
  useEffect(() => {
    if (!rolesLoading && isAdmin) {
      navigate("/admin", { replace: true });
    } else if (!rolesLoading && isModerator) {
      navigate("/moderator", { replace: true });
    }
  }, [rolesLoading, isAdmin, isModerator, navigate]);

  const featuredJobs = (jobs || []).filter((j: any) => j.is_featured).slice(0, 5);
  const latestJobs = featuredJobs.length > 0 ? featuredJobs : (jobs || []).slice(0, 3);
  

  // Calculate profile completion (must mirror Profile.tsx for consistency)
  const completionFields = [
    profile?.display_name,
    profile?.headline,
    profile?.bio,
    profile?.location,
    profile?.email,
    profile?.skills?.length,
    profile?.languages?.length,
    profile?.experience,
    profile?.avatar_url,
    profile?.phone,
  ];
  const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  const showCompletionBar = !rolesLoading && !isAdmin && !isModerator && completionPct < 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပင်မစာမျက်နှာ" : "Home"} />

      <div className="px-5 pt-5">
        {showCompletionBar && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
              <span className="text-xs font-bold text-gold-dark">{completionPct}%</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full bg-gradient-gold" />
            </div>
            <button onClick={() => navigate("/profile/edit")} className="mt-2 text-xs font-semibold text-accent">
              {lang === "my" ? "ယခု ဖြည့်စွက်ရန်" : "Complete now"} →
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {jobseekerActions.map((action, i) => (
            <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 shadow-card transition-colors active:bg-muted">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? action.label : action.labelEn}</span>
            </motion.button>
          ))}
        </div>


        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">{lang === "my" ? "အသစ်ထွက် အလုပ်များ" : "Featured Jobs"}</h2>
            <button onClick={() => navigate("/jobs")} className="flex items-center text-xs font-semibold text-accent">
              {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="space-y-2.5">
            {latestJobs.map((job: any, i: number) => (
              <motion.button key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-card transition-colors active:bg-muted">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15">
                  <Briefcase className="h-5 w-5 text-gold-dark" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                    <div className="flex gap-1">
                      {job.is_diaspora_safe && (
                        <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald">
                          <Shield className="mr-0.5 inline h-2.5 w-2.5" strokeWidth={2} />{lang === "my" ? "လုံခြုံ" : "Safe"}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} /> {translateJobLocation(job.location, lang)}
                    </span>
                    <span className="text-[11px] font-semibold text-gold-dark">{formatJobSalary(job, lang)}</span>
                  </div>
                </div>
              </motion.button>
            ))}
            {latestJobs.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ မရှိသေးပါ" : "No jobs yet"}</p>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6 mt-6 rounded-xl bg-primary p-5">
          <h3 className="mb-4 text-sm font-bold text-primary-foreground">
            {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: `${(jobs || []).length}+`, label: lang === "my" ? "အလုပ်" : "Jobs", path: "/jobs" },
              { value: `${(allProfiles || []).length}+`, label: lang === "my" ? "အဖွဲ့ဝင်" : "Members", path: "/community" },
              { value: `${(mentors || []).length}+`, label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors", path: "/mentors" },
            ].map((stat) => (
              <button key={stat.label} onClick={() => navigate(stat.path)} className="rounded-lg bg-primary-foreground/15 p-3 text-center transition-colors active:bg-primary-foreground/25">
                <p className="text-lg font-bold text-accent">{stat.value}</p>
                <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
