// useEffect removed: admin/moderator routing handled in HomeRedirect.
import { motion } from "framer-motion";
import { Briefcase, Users, Shield, TrendingUp, MapPin, ChevronRight, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { computeProfileCompletion } from "@/lib/profile-completion";
import { useJobs } from "@/hooks/use-jobs";
import { useMatchedJobs } from "@/hooks/use-matched-jobs";
import { useMentorProfiles } from "@/hooks/use-mentor-data";
import { useAllProfiles } from "@/hooks/use-profiles";
import { useUserRoles } from "@/hooks/use-user-roles";
import PageHeader from "@/components/PageHeader";
import InviteFriendsCard from "@/components/InviteFriendsCard";
import MentorCoachCue from "@/components/MentorCoachCue";
import SeekerWelcomeTour from "@/components/SeekerWelcomeTour";
import WelcomeTourVideoCard from "@/components/WelcomeTourVideoCard";
import DashboardHero from "@/components/DashboardHero";
import { formatJobSalary, translateJobLocation, translateJobTitle } from "@/lib/job-localization";

const jobseekerActions = [
  { icon: Briefcase, label: "အလုပ်ရှာ", labelEn: "Jobs", path: "/jobs", bg: "bg-accent/15", fg: "text-gold-dark" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-primary/8", fg: "text-primary" },
  { icon: Sparkles, label: "ကိရိယာများ", labelEn: "Career Tools", path: "/ai-tools", bg: "bg-accent/15", fg: "text-gold-dark" },
  { icon: Wallet, label: "ဝင်ငွေ", labelEn: "Earnings", path: "/finance", bg: "bg-emerald/10", fg: "text-emerald" },
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
  const { data: matchData } = useMatchedJobs(40);
  const scoreMap = matchData?.scoreMap;
  const hasMatches = !!scoreMap && scoreMap.size > 0;

  // NOTE: Admin/moderator routing is handled by HomeRedirect (which renders
  // the right dashboard inline). HomePage only ever mounts for non-admin
  // roles, so no redirect effect is needed here. Removing the previous
  // navigate() avoided a flash of HomePage before redirect.

  // Featured jobs personalized: when we have match scores, only show featured jobs
  // that actually match the seeker's profile (similarity > 0), ranked by similarity.
  // Falls back to all featured when matches aren't ready yet (cold start).
  const HOME_JOBS_LIMIT = 5;
  const allFeatured = (jobs || []).filter((j: any) => j.is_featured);
  const featuredJobs = hasMatches
    ? allFeatured
        .filter((j: any) => (scoreMap!.get(j.id) ?? 0) > 0)
        .sort((a: any, b: any) => (scoreMap!.get(b.id) ?? 0) - (scoreMap!.get(a.id) ?? 0))
    : allFeatured;
  // Always show up to N: featured first, then most-recent non-featured to fill.
  const featuredIdSet = new Set(featuredJobs.map((j: any) => j.id));
  const recentFill = (jobs || [])
    .filter((j: any) => !featuredIdSet.has(j.id))
    .slice(0, Math.max(0, HOME_JOBS_LIMIT - featuredJobs.length));
  const latestJobs = [...featuredJobs.slice(0, HOME_JOBS_LIMIT), ...recentFill].slice(0, HOME_JOBS_LIMIT);

  // "Matched for you" — top non-featured jobs by similarity (avoid duplicating featured).
  const featuredIds = new Set(featuredJobs.map((j: any) => j.id));
  const matchedForYou = hasMatches
    ? (jobs || [])
        .filter((j: any) => !featuredIds.has(j.id) && (scoreMap!.get(j.id) ?? 0) > 0)
        .sort((a: any, b: any) => (scoreMap!.get(b.id) ?? 0) - (scoreMap!.get(a.id) ?? 0))
        .slice(0, 5)
    : [];
  

  // Profile completion — must mirror DB function `is_profile_complete` exactly,
  // because the welcome/profile bonus is granted by the DB based on those rules.
  const { percent: completionPct } = computeProfileCompletion(profile as any);
  const showCompletionBar = !rolesLoading && !isAdmin && !isModerator && completionPct < 100;

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <PageHeader title={lang === "my" ? "ပင်မစာမျက်နှာ" : "Home"} />

      <div className="mx-auto max-w-7xl px-5 pt-5 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-6 md:px-8 md:pt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        {/* Main column */}
        <div className="md:min-w-0">
          <DashboardHero
            roleLabelEn="Job Seeker"
            roleLabelMy="အလုပ်ရှာသူ"
            subtitleEn="Your next opportunity is one tap away."
            subtitleMy="နောက်အခွင့်အလမ်းသည် တစ်ချက်နှိပ်ရုံသာ ဝေးပါသည်။"
            ctaLabelEn="Browse jobs"
            ctaLabelMy="အလုပ်များ ကြည့်ရန်"
            ctaPath="/jobs"
          />
          <WelcomeTourVideoCard variant="seeker" />
          <SeekerWelcomeTour />
          {showCompletionBar && (
            <motion.button
              type="button"
              onClick={() => navigate("/profile/edit")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-5 w-full text-left rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/30 active:bg-muted/30 md:p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground md:text-base">{lang === "my" ? "ပရိုဖိုင် ပြည့်စုံမှု" : "Profile Completion"}</p>
                <span className="text-xs font-bold text-accent md:text-sm">{completionPct}%</span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full bg-gradient-gold" />
              </div>
              <span className="mt-2 inline-block text-xs font-semibold text-accent">
                {lang === "my" ? "ယခု ဖြည့်စွက်ရန်" : "Complete now"} →
              </span>
            </motion.button>
          )}

          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {jobseekerActions.map((action, i) => (
              <motion.button key={action.path + action.labelEn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover active:bg-muted">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
                  <action.icon className={`h-5 w-5 ${action.fg}`} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-foreground md:text-xs">{lang === "my" ? action.label : action.labelEn}</span>
              </motion.button>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-foreground md:font-display md:text-xl md:font-semibold md:tracking-tight">
                {hasMatches
                  ? (lang === "my" ? "သင့်အတွက် ထူးချွန်အလုပ်များ" : "Featured for you")
                  : (lang === "my" ? "အသစ်ထွက် အလုပ်များ" : "Featured Jobs")}
              </h2>
              <button onClick={() => navigate("/jobs")} className="flex items-center text-xs font-semibold text-accent hover:underline">
                {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="grid gap-2.5 xl:grid-cols-2">
              {latestJobs.map((job: any, i: number) => (
                <motion.button key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover active:bg-muted">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15">
                    <Briefcase className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      {job.is_diaspora_safe && (
                        <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald">
                          <Shield className="mr-0.5 inline h-2.5 w-2.5" strokeWidth={2} />{lang === "my" ? "လုံခြုံ" : "Safe"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{translateJobLocation(job.location, lang)}</span>
                      </span>
                      <span className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-accent">{formatJobSalary(job, lang)}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
              {latestJobs.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground xl:col-span-2">{lang === "my" ? "အလုပ်ခေါ်စာ မရှိသေးပါ" : "No jobs yet"}</p>
              )}
            </div>
          </div>

          {matchedForYou.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-foreground md:font-display md:text-xl md:font-semibold md:tracking-tight">
                  {lang === "my" ? "သင့်အတွက် ကိုက်ညီသော အလုပ်များ" : "Matched for you"}
                </h2>
                <button onClick={() => navigate("/jobs")} className="flex items-center text-xs font-semibold text-accent hover:underline">
                  {lang === "my" ? "အားလုံး" : "View all"} <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="grid gap-2.5 xl:grid-cols-2">
                {matchedForYou.map((job: any, i: number) => {
                  const score = scoreMap?.get(job.id) ?? 0;
                  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
                  return (
                    <motion.button key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card-hover active:bg-muted">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald/10">
                        <Sparkles className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground">{translateJobTitle(job.title, job.title_my, lang)}</h3>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}</p>
                          </div>
                          <span className="flex-shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">{pct}%</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{translateJobLocation(job.location, lang)}</span>
                          </span>
                          <span className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-accent">{formatJobSalary(job, lang)}</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 md:hidden">
            <MentorCoachCue variant={completionPct < 60 ? "profile" : "general"} />
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6 mt-6 rounded-xl bg-primary p-5 md:hidden">
            <h3 className="mb-4 text-sm font-bold text-primary-foreground">
              {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: `${(jobs || []).length}+`, label: lang === "my" ? "အလုပ်" : "Jobs", path: "/jobs" },
                { value: `${(allProfiles || []).length}+`, label: lang === "my" ? "အဖွဲ့ဝင်" : "Members", path: "/community" },
                { value: `${(mentors || []).length}+`, label: lang === "my" ? "လမ်းညွှန်သူ" : "Mentors", path: "/mentors" },
              ].map((stat) => (
                <button key={stat.label} onClick={() => navigate(stat.path)} className="rounded-lg bg-primary-foreground/10 p-3 text-center transition-colors hover:bg-primary-foreground/20 active:bg-primary-foreground/25">
                  <p className="text-lg font-bold text-accent">{stat.value}</p>
                  <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
                </button>
              ))}
            </div>
          </motion.div>

          <div className="mb-6 md:hidden">
            <InviteFriendsCard />
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-4">
            <MentorCoachCue variant={completionPct < 60 ? "profile" : "general"} />

            {/* Community stats — moved into sidebar so the right column has substance */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl bg-primary p-5">
              <h3 className="mb-3 text-sm font-bold text-primary-foreground">
                {lang === "my" ? "ကျွန်ုပ်တို့ အသိုင်းအဝိုင်း" : "Our Community"}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: `${(jobs || []).length}+`, label: lang === "my" ? "အလုပ်" : "Jobs", path: "/jobs" },
                  { value: `${(allProfiles || []).length}+`, label: lang === "my" ? "အဖွဲ့ဝင်" : "Members", path: "/community" },
                  { value: `${(mentors || []).length}+`, label: lang === "my" ? "လမ်းညွှန်" : "Mentors", path: "/mentors" },
                ].map((stat) => (
                  <button key={stat.label} onClick={() => navigate(stat.path)} className="rounded-lg bg-primary-foreground/10 p-2.5 text-center transition-colors hover:bg-primary-foreground/20">
                    <p className="text-base font-bold text-accent">{stat.value}</p>
                    <p className="text-[10px] text-primary-foreground/70">{stat.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            <InviteFriendsCard />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
