import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet as WalletIcon,
  Sparkles,
  Briefcase,
  Star,
  Users,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useMyPackageGrants,
  useMyQuotas,
  useMyAddonPurchases,
  useMySubscriptionPaymentRequests,
  useSubscriptionPlans,
  useAddonProducts,
  formatMMK,
  planLabel,
} from "@/hooks/use-subscription";

const S = supabase as any;

interface UsageJob {
  id: string;
  title: string;
  status: string;
  is_featured: boolean;
  created_at: string;
}

interface UsageUnlock {
  id: string;
  target_id: string;
  target_type: string | null;
  created_at: string;
  target_name?: string;
}

function useUsageData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { jobs: [] as UsageJob[], unlocks: [] as UsageUnlock[] };
      const [{ data: jobs }, { data: unlocks }] = await Promise.all([
        S.from("jobs")
          .select("id,title,status,is_featured,created_at")
          .eq("employer_id", user.id)
          .order("created_at", { ascending: false }),
        S.from("feature_unlocks")
          .select("id,target_id,target_type,created_at")
          .eq("user_id", user.id)
          .eq("feature_key", "unlock_contact")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      const unlockRows: UsageUnlock[] = (unlocks as UsageUnlock[]) ?? [];
      const profileIds = Array.from(new Set(unlockRows.map((u) => u.target_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (profileIds.length) {
        const { data: profs } = await S.from("profiles").select("id,full_name").in("id", profileIds);
        nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name as string]));
      }
      return {
        jobs: (jobs as UsageJob[]) ?? [],
        unlocks: unlockRows.map((u) => ({ ...u, target_name: nameMap.get(u.target_id) })),
      };
    },
    staleTime: 30_000,
  });
}

const Wallet = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const navigate = useNavigate();

  const { data: grants = [] } = useMyPackageGrants();
  const { data: quotas } = useMyQuotas();
  const { data: addonPurchases = [] } = useMyAddonPurchases();
  const { data: payReqs = [] } = useMySubscriptionPaymentRequests();
  const { data: allPlans = [] } = useSubscriptionPlans();
  const { data: allAddons = [] } = useAddonProducts();
  const { data: usage } = useUsageData();

  const planById = useMemo(() => Object.fromEntries(allPlans.map((p) => [p.id, p])), [allPlans]);
  const addonsById = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a])), [allAddons]);

  const pending = payReqs.filter((r) => r.status === "pending");
  const matching = addonPurchases.find((p) => addonsById[p.addon_id]?.kind === "matching" && p.status === "active");
  const branding = addonPurchases.find((p) => addonsById[p.addon_id]?.kind === "branding" && p.status === "active");

  const tierRank: Record<string, number> = { free_trial: 0, starter: 1, growth: 2, business: 3, enterprise: 4 };
  const grantsWithPlan = grants.map((g) => ({ ...g, plan: planById[g.plan_id] })).filter((g) => g.plan);
  const topGrant = [...grantsWithPlan].sort((a, b) => (tierRank[b.plan.tier] ?? 0) - (tierRank[a.plan.tier] ?? 0))[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ပိုက်ဆံအိတ်" : "Wallet"} />
      <div className="mx-auto w-full max-w-4xl px-5 space-y-5">
        {/* Hero card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <WalletIcon className="h-4 w-4" />
            <span>{my ? "သင်၏ Package များ" : "Your packages"}</span>
          </div>

          {topGrant ? (
            <>
              <div className="mt-2 text-3xl font-bold">
                {planLabel(topGrant.plan.tier)}
                {grants.length > 1 && <span className="ml-2 text-base opacity-80">+ {grants.length - 1} more</span>}
              </div>
              <div className="mt-0.5 text-xs opacity-80">
                {my
                  ? `${grants.length} Package ပိုင်ဆိုင်နေသည် · သက်တမ်း မရှိ`
                  : `${grants.length} package${grants.length > 1 ? "s" : ""} owned · never expire`}
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground active:opacity-90"
              >
                <ArrowUpRight className="h-4 w-4" />
                {my ? "ထပ်မံ ဝယ်ရန် / Add-on" : "Buy more / add-ons"}
              </button>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold">{my ? "Package မရှိသေးပါ" : "No packages yet"}</div>
              <div className="mt-0.5 text-xs opacity-80">
                {my ? "Package တစ်ခု ရွေးချယ်၍ စတင်ပါ" : "Pick a package to start posting jobs and unlocking candidates."}
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground"
              >
                <Sparkles className="h-4 w-4" />
                {my ? "Package ရွေးရန်" : "View pricing"}
              </button>
            </>
          )}
        </div>

        {pending.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              {my ? `${pending.length} ခု စစ်ဆေးနေသည်` : `${pending.length} purchase${pending.length > 1 ? "s" : ""} pending review`}
            </div>
            <div className="mt-1 opacity-80">
              {my ? "Admin အတည်ပြုပြီးမှ ပိုင်ဆိုင်မှု ထဲ ပေါင်းထည့်ပါမည်။" : "Approved purchases are added to your totals automatically."}
            </div>
          </div>
        )}

        {/* Pooled balance summary */}
        <section>
          <h2 className="mb-2 text-sm font-bold">{my ? "သုံးစွဲမှု ခြေရာခံ" : "Pooled balance"}</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <QuotaCard
              icon={Briefcase}
              label={my ? "Active Jobs" : "Active Jobs"}
              total={quotas?.is_unlimited_jobs ? Infinity : quotas?.active_jobs_quota ?? 0}
              used={quotas?.active_jobs_used ?? 0}
              hint={my ? "လုပ်ငန်းတင်နိုင်သော အရေအတွက်" : "Job posts available"}
            />
            <QuotaCard
              icon={Users}
              label={my ? "Candidate Unlocks" : "Candidate Unlocks"}
              total={quotas?.is_unlimited_unlocks ? Infinity : quotas?.unlocks_total ?? 0}
              used={quotas?.unlocks_used ?? 0}
              hint={my ? "ဆက်သွယ်ရန် Unlock ပြုနိုင်သော ပမာဏ" : "Contact unlocks remaining"}
            />
            <QuotaCard
              icon={Star}
              label={my ? "Featured Job Slots" : "Featured Job Slots"}
              total={quotas?.featured_jobs_total ?? 0}
              used={quotas?.featured_jobs_used ?? 0}
              hint={my ? "Add-on မှ ရရှိသော Featured slots" : "From featured-job add-ons"}
            />
          </div>
        </section>

        <Tabs defaultValue="usage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">{my ? "သုံးစွဲမှု" : "Usage"}</TabsTrigger>
            <TabsTrigger value="addons">{my ? "Add-ons" : "Add-ons"}</TabsTrigger>
            <TabsTrigger value="history">{my ? "မှတ်တမ်း" : "History"}</TabsTrigger>
          </TabsList>

          {/* USAGE TAB */}
          <TabsContent value="usage" className="space-y-3 pt-3">
            {((usage?.jobs?.length ?? 0) === 0 && (usage?.unlocks?.length ?? 0) === 0) ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                {my ? "သုံးစွဲမှတ်တမ်း မရှိသေးပါ" : "No usage yet"}
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Job rows: combine job slot + featured slot into one row */}
                {(usage?.jobs ?? []).map((j) => (
                  <button
                    key={`job-${j.id}`}
                    onClick={() => navigate(`/jobs/${j.id}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs hover:bg-muted/50 active:opacity-80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{j.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{new Date(j.created_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 font-medium">
                          <Briefcase className="h-2.5 w-2.5" />
                          {my ? "Job slot 1" : "Job slot 1"}
                        </span>
                        {j.is_featured && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-accent/20 px-1 py-0.5 font-medium text-accent-foreground">
                            <Star className="h-2.5 w-2.5" />
                            {my ? "Featured slot 1" : "Featured slot 1"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusPill status={j.status} />
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}

                {/* Unlock rows */}
                {(usage?.unlocks ?? []).map((u) => (
                  <button
                    key={`unlock-${u.id}`}
                    onClick={() => navigate(`/profile/${u.target_id}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs hover:bg-muted/50 active:opacity-80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {u.target_name || (my ? "ပရိုဖိုင်" : "Profile")}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{new Date(u.created_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 font-medium">
                          <Users className="h-2.5 w-2.5" />
                          {my ? "Unlock 1" : "Unlock 1"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ADDONS TAB */}
          <TabsContent value="addons" className="space-y-2 pt-3">
            <AddonStatusRow
              icon={Sparkles}
              label={my ? "Candidate Matching Pack" : "Candidate Matching Pack"}
              expiresAt={matching?.expires_at}
            />
            <AddonStatusRow
              icon={Globe}
              label={my ? "Branding Page" : "Branding Page"}
              expiresAt={branding?.expires_at}
            />
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="pt-3">
            {payReqs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                {my ? "မှတ်တမ်း မရှိသေးပါ" : "No purchases yet"}
              </div>
            ) : (
              <div className="space-y-1.5">
                {payReqs.slice(0, 50).map((r) => {
                  const StatusIcon = r.status === "approved" ? CheckCircle2 : r.status === "rejected" ? XCircle : Clock;
                  const tone = r.status === "approved" ? "text-emerald-600" : r.status === "rejected" ? "text-destructive" : "text-amber-600";
                  const planRow = r.plan_id ? planById[r.plan_id] : null;
                  const addonRow = r.addon_id ? addonsById[r.addon_id] : null;
                  const title =
                    r.request_type === "subscription" && planRow
                      ? planLabel(planRow.tier)
                      : addonRow
                        ? `${(my && addonRow.label_my) || addonRow.label_en}${r.quantity > 1 ? ` × ${r.quantity}` : ""}`
                        : my
                          ? "ပေးပို့မှု"
                          : "Payment";
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatMMK(r.mmk_amount)} · {new Date(r.created_at).toLocaleDateString()}
                          {r.payment_method ? ` · ${r.payment_method.toUpperCase()}` : ""}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 ${tone}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{r.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const UsageSection = ({
  icon: Icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: any;
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) => (
  <section>
    <div className="mb-2 flex items-center gap-1.5 text-sm font-bold">
      <Icon className="h-4 w-4 text-primary" />
      <span>{title}</span>
      <span className="ml-auto text-xs font-normal text-muted-foreground">{count}</span>
    </div>
    {count === 0 ? (
      <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    ) : (
      <div className="space-y-1.5">{children}</div>
    )}
  </section>
);

const StatusPill = ({ status }: { status: string }) => {
  const tone =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "pending" || status === "pending_approval"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : status === "rejected" || status === "expired" || status === "closed"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
};

const QuotaCard = ({
  icon: Icon,
  label,
  total,
  used,
  hint,
}: {
  icon: any;
  label: string;
  total: number;
  used: number;
  hint: string;
}) => {
  const unlimited = total === Infinity;
  const remaining = unlimited ? Infinity : Math.max(0, total - used);
  const pct = unlimited || total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{unlimited ? "∞" : remaining.toLocaleString()}</span>
        {!unlimited && <span className="text-[11px] text-muted-foreground">/ {total.toLocaleString()}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
      {!unlimited && total > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
};

const AddonStatusRow = ({
  icon: Icon,
  label,
  expiresAt,
}: {
  icon: any;
  label: string;
  expiresAt?: string | null;
}) => {
  const active = !!expiresAt && new Date(expiresAt).getTime() > Date.now();
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-[10px] text-muted-foreground">
            {active ? `Active until ${new Date(expiresAt!).toLocaleDateString()}` : "Not active"}
          </div>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
};

export default Wallet;
