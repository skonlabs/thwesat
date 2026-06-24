import { motion } from "framer-motion";
import { Users, UserSearch, CheckCircle, CreditCard, Briefcase, Building2, Plus, TrendingUp, Wallet, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import WelcomeTourVideoCard from "@/components/WelcomeTourVideoCard";
import DashboardHero from "@/components/DashboardHero";
import { formatMoney } from "@/lib/finance";
import { computeProfileCompletion } from "@/lib/profile-completion";

/**
 * Agent Dashboard — for Recruiting Agents.
 *
 * Distinct from Employer Dashboard:
 *  - Pipeline-first (candidates moving through placements)
 *  - Earnings & client relationships front and center
 *  - Quick actions are candidate-centric (browse jobs, log placement)
 *  - Wording: "Candidates", "Clients", "Commissions" — not "Applicants"/"Company"
 */
const AgentDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { data: empProfile } = useEmployerProfile();

  // Pipeline: applications across the agent's posted jobs, grouped by status
  const { data: pipeline } = useQuery({
    queryKey: ["agent-pipeline", user?.id],
    queryFn: async () => {
      if (!user) return { active: 0, interview: 0, placed: 0, totalFee: 0, clients: 0, recentPlacements: [] as any[] };
      const { data: rows } = await supabase
        .from("applications")
        .select("status, placement_fee, placement_salary, updated_at, jobs!inner(id, title, company, employer_id)")
        .eq("jobs.employer_id", user.id);
      const list = (rows || []) as any[];
      const active = list.filter((r) => ["applied", "viewed", "shortlisted", "interview", "interviewed", "offered"].includes(r.status)).length;
      const interview = list.filter((r) => r.status === "interview").length;
      const placedRows = list.filter((r) => r.status === "placed");
      const placed = placedRows.length;
      const totalFee = placedRows.reduce((s, r) => s + (Number(r.placement_fee) || 0), 0);
      const clients = new Set(placedRows.map((r) => r.jobs?.company).filter(Boolean)).size;
      const recentPlacements = placedRows
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3);
      return { active, interview, placed, totalFee, clients, recentPlacements };
    },
    enabled: !!user,
  });

  const stats = pipeline ?? { active: 0, interview: 0, placed: 0, totalFee: 0, clients: 0, recentPlacements: [] };

  const { percent: completionPct } = computeProfileCompletion({
    ...(profile as any),
    display_name: profile?.display_name || empProfile?.contact_name,
    bio: profile?.bio || empProfile?.company_description,
    location: profile?.location || empProfile?.hq_country,
    email: profile?.email || empProfile?.contact_email,
    phone: profile?.phone || empProfile?.contact_phone,
    headline: profile?.headline || empProfile?.industry,
    experience: profile?.experience || empProfile?.company_size,
  });

  const quickActions = [
    { icon: UserSearch, my: "ကိုယ်စားလှယ်ရှာ", en: "Find Candidates", path: "/agent/search", bg: "bg-primary/10", fg: "text-primary" },
    { icon: Briefcase, my: "ကျွန်ုပ်၏ ခေါ်ယူမှု", en: "My Postings", path: "/agent/jobs", bg: "bg-primary/10", fg: "text-primary" },
    { icon: Plus, my: "ခေါ်စာ တင်ရန်", en: "Post Job", path: "/agent/post-job", bg: "bg-emerald/10", fg: "text-emerald" },
    { icon: CreditCard, my: "Package & Add-ons", en: "Packages & Add-ons", path: "/pricing", bg: "bg-accent/20", fg: "text-gold-dark" },
    { icon: CreditCard, my: "ငွေကြေး", en: "Finance", path: "/agent/finance", bg: "bg-emerald/10", fg: "text-emerald" },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-5 md:px-8 md:pt-2">
        <DashboardHero
          roleLabelEn="Recruiting Agent"
          roleLabelMy="ခေါ်ယူရေး အေဂျင့်"
          subtitleEn={`${stats.active} active candidates · ${stats.placed} placed`}
          subtitleMy={`လက်ရှိ ${stats.active} ဦး · ခန့်အပ်ပြီး ${stats.placed} ဦး`}
          ctaLabelEn="Find candidates"
          ctaLabelMy="ကိုယ်စားလှယ် ရှာရန်"
          ctaPath="/agent/search"
        />
        <WelcomeTourVideoCard variant="agent" />
        {/* Profile completion (only if incomplete) */}
        {!empProfile?.is_verified && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/agent/profile")}
            className="mb-4 w-full rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">
                    {lang === "my" ? "အေဂျင့် ပရိုဖိုင်" : "Agent Profile"}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground">{completionPct}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </div>
          </motion.button>
        )}

        {/* Pipeline — the agent's daily workload */}
        <h2 className="mb-2 text-sm font-bold text-foreground">{lang === "my" ? "Pipeline" : "Pipeline"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-6">
          {[
            { icon: Users, label: { my: "လက်ရှိ", en: "Active" }, value: stats.active, color: "text-primary bg-primary/10", action: () => navigate("/agent/candidates") },
            { icon: Briefcase, label: { my: "အင်တာဗျူး", en: "Interview" }, value: stats.interview, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", action: () => navigate("/agent/candidates?filter=interview") },
            { icon: CheckCircle, label: { my: "ခန့်အပ်ပြီး", en: "Placed" }, value: stats.placed, color: "text-emerald bg-emerald/10", action: () => navigate("/agent/candidates?filter=placed") },
          ].map((stat, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={stat.action}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
            >
              <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="mb-3 text-sm font-bold text-foreground">{lang === "my" ? "အမြန်လုပ်ဆောင်ချက်" : "Quick Actions"}</h2>
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-5">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.path + a.en}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors active:bg-muted"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.bg}`}>
                <a.icon className={`h-5 w-5 ${a.fg}`} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{lang === "my" ? a.my : a.en}</span>
            </motion.button>
          ))}
        </div>

        {/* Recent placements — client relationships */}
        {stats.recentPlacements.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">{lang === "my" ? "လတ်တလော ခန့်အပ်မှုများ" : "Recent Placements"}</h2>
              <button onClick={() => navigate("/agent/candidates?filter=placed")} className="text-[11px] font-semibold text-primary hover:underline">
                {lang === "my" ? "အားလုံး" : "View all"} →
              </button>
            </div>
            <div className="mb-5 grid gap-2 md:grid-cols-3">
              {stats.recentPlacements.map((p: any, i: number) => (
                <button
                  key={i}
                  onClick={() => navigate("/agent/candidates?filter=placed")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors active:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{p.jobs?.title || "—"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{p.jobs?.company || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald">{formatMoney(Number(p.placement_fee) || 0, "MMK", lang)}</p>
                    <p className="text-[10px] text-muted-foreground">{lang === "my" ? "ခန့်အပ်ခ" : "fee"}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default AgentDashboard;
