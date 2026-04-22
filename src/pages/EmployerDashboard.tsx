import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Plus, Clock, CheckCircle, Pause, XCircle, Building2, Shield, MessageSquare, Sparkles, UserSearch, Pencil, Trash2, Settings, Crown, CreditCard, Link2, Mail, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useEmployerProfile } from "@/hooks/use-employer-data";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import EmployerOnboardingChecklist from "@/components/employer/EmployerOnboardingChecklist";
import { employerLabels as L, getApplicationMethodLabel } from "@/lib/employer-labels";

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
  { icon: MessageSquare, label: "မက်ဆေ့ချ်", labelEn: "Messages", path: "/messages", bg: "bg-accent/10", fg: "text-accent" },
  { icon: Users, label: "လမ်းညွှန်", labelEn: "Mentors", path: "/mentors", bg: "bg-primary/10", fg: "text-primary" },
  { icon: Shield, label: "ဥပဒေ", labelEn: "Guides", path: "/guides", bg: "bg-emerald/10", fg: "text-emerald" },
  { icon: Settings, label: "ကုမ္ပဏီ", labelEn: "Company", path: "/employer/edit-company", bg: "bg-accent/10", fg: "text-accent" },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: empProfile } = useEmployerProfile();
  const { data: jobs, isLoading } = useEmployerJobs();
  const [filter, setFilter] = useState(searchParams.get("listingFilter") || "all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync URL <-> local filter so context survives back/forward
  useEffect(() => {
    const f = searchParams.get("listingFilter");
    setFilter(f || "all");
  }, [searchParams]);

  const updateFilter = (next: string) => {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("listingFilter");
    else params.set("listingFilter", next);
    setSearchParams(params, { replace: true });
  };

  // Fetch employer subscription
  const { data: subscription } = useQuery({
    queryKey: ["employer-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch placement summary (count + total fees) across employer's jobs
  const { data: placementSummary } = useQuery({
    queryKey: ["employer-placements", user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, totalFee: 0 };
      const { data, error } = await supabase
        .from("applications")
        .select("placement_fee, jobs!inner(employer_id)")
        .eq("status", "placed")
        .eq("jobs.employer_id", user.id);
      if (error) return { count: 0, totalFee: 0 };
      const rows = (data || []) as any[];
      const totalFee = rows.reduce((sum, r) => sum + (Number(r.placement_fee) || 0), 0);
      return { count: rows.length, totalFee };
    },
    enabled: !!user,
  });

  const listings = jobs || [];
  const filteredListings = filter === "all" ? listings : listings.filter(l => l.status === filter);
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalApplicants = listings.reduce((a, l) => a + (l.applicant_count || 0), 0);
  const placedCount = placementSummary?.count || 0;
  const placedFees = placementSummary?.totalFee || 0;

  const planLabel = subscription?.plan_type?.toLowerCase().includes("pro") ? "Pro" : subscription?.plan_type ? "Basic" : null;
  const planExpiry = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : null;

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) {
      toast.error(lang === "my" ? "ဖျက်၍ မရပါ" : "Failed to delete job");
    } else {
      toast.success(lang === "my" ? "အလုပ်ခေါ်စာ ဖျက်ပြီး" : "Job deleted");
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "အလုပ်ရှင် ဒက်ရှ်ဘုတ်" : "Employer Dashboard"} />
      <div className="px-5">
        {/* Company info + subscription */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">{empProfile?.company_name || (lang === "my" ? "ကုမ္ပဏီအမည်" : "Company")}</p>
              <p className={`text-[11px] font-medium ${empProfile?.is_verified ? "text-emerald" : "text-muted-foreground"}`}>
                {empProfile?.is_verified ? `✓ ${lang === "my" ? "အတည်ပြုပြီး" : "Verified"}` : (lang === "my" ? "စစ်ဆေးဆဲ" : "Pending Verification")}
              </p>
            </div>
            {/* Subscription badge */}
            <button onClick={() => navigate("/employer/subscription")} className="flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1">
              {planLabel ? (
                <>
                  <Crown className="h-3 w-3 text-gold-dark" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-gold-dark">{planLabel}</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-muted-foreground">{lang === "my" ? "အဆင့်မြှင့်" : "Upgrade"}</span>
                </>
              )}
            </button>
          </div>
          {planLabel && planExpiry && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              {lang === "my" ? `${planLabel} အစီအစဉ် · ${planExpiry} ထိ` : `${planLabel} Plan · Expires ${planExpiry}`}
            </p>
          )}
        </motion.div>

        {/* Onboarding checklist (dismissible, hides when complete) */}
        <EmployerOnboardingChecklist
          hasCompany={!!empProfile?.company_name}
          hasAnyJob={listings.length > 0}
          hasAnyApplication={totalApplicants > 0}
        />

        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: { my: "လက်ခံနေသော အလုပ်ခေါ်စာ", en: "Active Listings" }, value: activeCount.toString(), color: "text-primary bg-primary/10", action: () => updateFilter("active") },
            { icon: Users, label: L.applications, value: totalApplicants.toString(), color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications") },
            { icon: CheckCircle, label: L.placements, value: placedCount.toString(), color: "text-emerald bg-emerald/10", action: () => navigate("/employer/applications?filter=placed") },
            { icon: CreditCard, label: { my: "ခန့်အပ်ခ စုစုပေါင်း", en: "Placement Fees" }, value: `$${placedFees.toLocaleString()}`, color: "text-gold-dark bg-accent/20", action: () => navigate("/employer/applications?filter=placed") },
          ].map((stat, i) => (
            <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={stat.action} className="rounded-xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted/30">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" strokeWidth={1.5} /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{lang === "my" ? stat.label.my : stat.label.en}</p>
            </motion.button>
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
          <h2 className="text-sm font-bold text-foreground">{L.listings[lang]}</h2>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "active", "pending", "paused", "closed"].map(f => (
            <button key={f} onClick={() => updateFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
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
                <motion.div key={listing.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 active:bg-muted/30">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <button onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)} className="flex-1 text-left">
                      <h3 className="text-sm font-semibold text-foreground">{lang === "my" && listing.title_my ? listing.title_my : listing.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ""}</p>
                    </button>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                      <sc.icon className="h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? sc.label.my : sc.label.en}
                    </span>
                  </div>
                  {/* App method badge */}
                  {(() => {
                    const m = getApplicationMethodLabel((listing as any).application_method, lang);
                    const Icon = (listing as any).application_method === "external" ? Link2 : (listing as any).application_method === "email" ? Mail : Send;
                    return (
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" strokeWidth={1.5} />
                        <span>{L.applicationMethod[lang]}: <span className="font-medium text-foreground">{m.label}</span></span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between">
                    <button onClick={() => navigate(`/employer/applications?jobId=${listing.id}`)} className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {listing.applicant_count || 0} {lang === "my" ? "လျှောက်" : "applied"}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/employer/edit-job/${listing.id}`)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted" title={lang === "my" ? "ပြင်ဆင်" : "Edit"}>
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setDeleteConfirmId(listing.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 active:bg-destructive/10" title={lang === "my" ? "ဖျက်ရန်" : "Delete"}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-6" onClick={() => setDeleteConfirmId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-base font-bold text-foreground">{lang === "my" ? "အလုပ်ခေါ်စာ ဖျက်မည်" : "Delete Job Listing"}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{lang === "my" ? "ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရပါ။ ဆက်လုပ်မည်လား?" : "This action cannot be undone. Continue?"}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteConfirmId(null)}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDeleteJob(deleteConfirmId)}>{lang === "my" ? "ဖျက်ရန်" : "Delete"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployerDashboard;