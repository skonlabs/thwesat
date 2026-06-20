import { useMemo, useState } from "react";
import { Check, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/hooks/use-language";
import { useUserRoles } from "@/hooks/use-user-roles";
import {
  useSubscriptionPlans,
  useAddonProducts,
  useLaunchPromo,
  useMySubscription,
  useMyScheduledSubscription,
  useMyPendingSubscriptionRequest,
  isLaunchActive,
  computePrice,
  formatMMK,
  planLabel,
  type SubscriptionPlan,
  type AddonProduct,
  type BillingCycle,
  type PlanRole,
} from "@/hooks/use-subscription";
import SubscribeSheet from "@/components/pricing/SubscribeSheet";
import { Clock } from "lucide-react";

type Selection =
  | { kind: "subscription"; plan: SubscriptionPlan; cycle: BillingCycle }
  | { kind: "addon"; addon: AddonProduct };

const TIER_ICON: Record<string, any> = {
  starter: Sparkles,
  growth: Zap,
  business: Rocket,
  enterprise: Crown,
};

const Pricing = () => {
  const { lang } = useLanguage();
  const my = lang === "my";
  const { allowedRoles } = useUserRoles();
  const detected: PlanRole = allowedRoles.includes("agent")
    ? "recruiting_agent"
    : "employer";
  const [role, setRole] = useState<PlanRole>(detected);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: plans = [] } = useSubscriptionPlans(role);
  const { data: addons = [] } = useAddonProducts(role);
  const { data: promo } = useLaunchPromo();
  const { data: currentSub } = useMySubscription();
  const launchActive = isLaunchActive(promo);

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.sort_order - b.sort_order), [plans]);

  const onSubscribe = (plan: SubscriptionPlan) => {
    setSelection({ kind: "subscription", plan, cycle });
    setSheetOpen(true);
  };

  const onBuyAddon = (addon: AddonProduct) => {
    setSelection({ kind: "addon", addon });
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={my ? "ဈေးနှုန်းများ" : "Pricing"} />
      <div className="mx-auto w-full max-w-6xl px-5 space-y-5">
        {/* Launch promo banner */}
        {launchActive && (
          <div className="rounded-2xl bg-gradient-to-r from-accent/30 to-primary/15 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
              {my ? "ဖွင့်ပွဲ ပရိုမိုးရှင်း" : "Launch promotion"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {my
                ? `မည်သည့် Package မဆို ပထမ ၃ လ အခမဲ့။ ${promo ? new Date(promo.ends_at).toLocaleDateString() : ""} အထိ။`
                : `First 3 months free on any plan. Promo ends ${promo ? new Date(promo.ends_at).toLocaleDateString() : ""}.`}
            </div>
          </div>
        )}

        {/* Role tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            {(["employer", "recruiting_agent"] as PlanRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r === "employer" ? (my ? "အလုပ်ရှင်" : "Employers") : my ? "Recruiting Agents" : "Recruiting Agents"}
              </button>
            ))}
          </div>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-3 py-1 font-semibold ${cycle === "monthly" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {my ? "လစဉ်" : "Monthly"}
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${cycle === "yearly" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {my ? "နှစ်စဉ်" : "Yearly"}
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                {my ? "၁ လ အခမဲ့" : "1 mo free"}
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sortedPlans.map((plan) => {
            const Icon = TIER_ICON[plan.tier] ?? Sparkles;
            const priceInfo = computePrice(plan, cycle, launchActive);
            const isCurrent = currentSub?.plan_id === plan.id;
            const popular = plan.tier === "growth";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border ${
                  popular ? "border-primary bg-card shadow-lg" : "border-border bg-card"
                } p-4`}
              >
                {popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {my ? "ရေပန်းစား" : "Popular"}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">{planLabel(plan.tier)}</h3>
                </div>

                <div className="mt-3">
                  {cycle === "yearly" ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground line-through tabular-nums">
                          {formatMMK(priceInfo.originalYearlyMmk)}
                        </span>
                      </div>
                      <div className="text-2xl font-bold tabular-nums">{formatMMK(priceInfo.mmk)}</div>
                      <div className="text-[11px] text-muted-foreground">{my ? "/ နှစ် (၁၁ လ စျေး)" : "/ year (pay 11, get 12)"}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold tabular-nums">{formatMMK(priceInfo.mmk)}</div>
                      <div className="text-[11px] text-muted-foreground">{my ? "/ လ" : "/ month"}</div>
                    </>
                  )}
                  {launchActive && (
                    <div className="mt-1 inline-block rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold">
                      {my ? "ပထမ ၃ လ အခမဲ့" : "First 3 months free"}
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-1.5 text-xs">
                  <FeatureRow
                    text={
                      plan.is_unlimited_jobs
                        ? my ? "Unlimited Active Jobs" : "Unlimited Active Jobs"
                        : my ? `Active Jobs ${plan.active_jobs_quota} ခု` : `${plan.active_jobs_quota} Active Jobs`
                    }
                  />
                  <FeatureRow
                    text={my ? `Candidate Unlocks ${plan.unlock_quota.toLocaleString()} ခု` : `${plan.unlock_quota.toLocaleString()} Candidate Unlocks`}
                  />
                  <FeatureRow text={my ? "Wallet & အသုံးပြုမှု မှတ်တမ်း" : "Wallet & usage tracking"} />
                  {plan.tier === "enterprise" && <FeatureRow text={my ? "ဦးစားပေး အကူအညီ" : "Priority support"} />}
                </ul>

                <button
                  disabled={isCurrent}
                  onClick={() => onSubscribe(plan)}
                  className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition ${
                    isCurrent
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {isCurrent ? (my ? "လက်ရှိ Package" : "Current plan") : my ? "Subscribe" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <section>
          <h2 className="mb-2 mt-4 text-sm font-bold">{my ? "Add-ons" : "Add-ons"}</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {my ? "မည်သည့် Package ပေါ်တွင်မဆို ထပ်ဖြည့်နိုင်သည်။" : "Boost any plan with extra unlocks and features."}
          </p>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{(my && a.label_my) || a.label_en}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.is_recurring && a.duration_days
                      ? my
                        ? `${formatMMK(a.mmk)} / လ`
                        : `${formatMMK(a.mmk)} / month`
                      : formatMMK(a.mmk)}
                  </div>
                </div>
                <button
                  onClick={() => onBuyAddon(a)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  {my ? "ဝယ်ရန်" : "Buy"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SubscribeSheet open={sheetOpen} onOpenChange={setSheetOpen} selection={selection} />
    </div>
  );
};

const FeatureRow = ({ text }: { text: string }) => (
  <li className="flex items-start gap-1.5">
    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <span>{text}</span>
  </li>
);

export default Pricing;
