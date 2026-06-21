import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Check, Sparkles, Zap, Crown, Rocket, Gift, Clock, Minus, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/hooks/use-language";
import { useUserRoles } from "@/hooks/use-user-roles";
import {
  useSubscriptionPlans,
  useAddonProducts,
  useMyPackageGrants,
  useMyPendingSubscriptionRequests,
  useMyQuotas,
  useMyAddonPurchases,
  formatMMK,
  planLabel,
  planRoleFor,
  type SubscriptionPlan,
  type AddonProduct,
} from "@/hooks/use-subscription";
import SubscribeSheet from "@/components/pricing/SubscribeSheet";

export type PurchaseSelection =
  | { kind: "subscription"; plan: SubscriptionPlan }
  | { kind: "addon"; addon: AddonProduct; quantity: number };

const TIER_ICON: Record<string, any> = {
  free_trial: Gift,
  starter: Sparkles,
  growth: Zap,
  business: Rocket,
  enterprise: Crown,
};

const TIER_DESC: Record<string, { en: string; my: string }> = {
  free_trial: { en: "Try everything risk-free — no commitment, no card.", my: "ဘေးကင်းစွာ စမ်းသပ်ပါ — ဘဏ်ကတ်မလိုပါ။" },
  starter: { en: "Ideal for small teams posting a handful of jobs each month.", my: "လတိုင်း အလုပ်အနည်းငယ် တင်မည့် အသေးစား အဖွဲ့အစည်းများအတွက် အထူးသင့်။" },
  growth: { en: "Best for growing companies with steady, regular hiring needs.", my: "ဆက်တိုက်လိုအပ်သော ကုမ္ပဏီများအတွက် အကောင်းဆုံး။" },
  business: { en: "For established companies hiring at scale with dedicated support.", my: "အကြီးစားစာရင်း လျှောက်ထားမှုအတွက် အထူးအကူအညီ ရှိသည်။" },
  enterprise: { en: "Large organizations with high-volume, multi-team recruitment.", my: "အဖွဲ့အများစု နှင့် လိုအပ်ချက်မြင့်သော အကြီးစားလုပ်ငန်းများ။" },
};

const Pricing = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const my = lang === "my";
  const { allowedRoles } = useUserRoles();
  const effectiveRole: "employer" | "recruiting_agent" =
    allowedRoles.includes("agent") ? "recruiting_agent" : "employer";

  const [selection, setSelection] = useState<PurchaseSelection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});

  const { data: plans = [] } = useSubscriptionPlans();
  const { data: addons = [] } = useAddonProducts(effectiveRole);
  const { data: grants = [] } = useMyPackageGrants();
  const { data: pending = [] } = useMyPendingSubscriptionRequests();
  const { data: quotas } = useMyQuotas();
  const { data: addonPurchases = [] } = useMyAddonPurchases();

  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  const ownedPackageCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const g of grants) acc[g.plan_id] = (acc[g.plan_id] ?? 0) + 1;
    return acc;
  }, [grants]);
  const hasFreeTrial = grants.some((g) => planById[g.plan_id]?.tier === "free_trial");

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.sort_order - b.sort_order), [plans]);

  const getQty = (id: string) => Math.max(1, qty[id] ?? 1);
  const setUnitQty = (id: string, v: number) => setQty((s) => ({ ...s, [id]: Math.max(1, Math.min(10000, v || 1)) }));

  const onBuyPlan = (plan: SubscriptionPlan) => {
    setSelection({ kind: "subscription", plan });
    setSheetOpen(true);
  };
  const onBuyAddon = (addon: AddonProduct) => {
    const quantity = addon.is_per_unit ? getQty(addon.id) : 1;
    setSelection({ kind: "addon", addon, quantity });
    setSheetOpen(true);
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title={my ? "ဈေးနှုန်းများ" : "Pricing"} />
      <div className="mx-auto w-full max-w-6xl px-5 space-y-5">
        {/* Your totals */}
        {user && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {my ? "သင်၏ စုစုပေါင်း ပိုင်ဆိုင်မှု" : "Your totals"}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Totals
                label={my ? "အလုပ်ခေါ်စာများ" : "JOB POSTINGS"}
                value={quotas?.is_unlimited_jobs ? "∞" : Math.max(0, (quotas?.active_jobs_quota ?? 0) - (quotas?.active_jobs_used ?? 0)).toLocaleString()}
                total={quotas?.is_unlimited_jobs ? null : quotas?.active_jobs_quota ?? 0}
              />
              <Totals
                label={my ? "Candidate Unlocks" : "Candidate Unlocks"}
                value={quotas?.is_unlimited_unlocks ? "∞" : Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0)).toLocaleString()}
                total={quotas?.is_unlimited_unlocks ? null : quotas?.unlocks_total ?? 0}
              />
              <Totals
                label={my ? "Featured Jobs" : "Featured Jobs"}
                value={Math.max(0, (quotas?.featured_jobs_total ?? 0) - (quotas?.featured_jobs_used ?? 0)).toLocaleString()}
                total={quotas?.featured_jobs_total ?? 0}
              />
              <Totals
                label={my ? "Add-Ons" : "Add-Ons"}
                value=""
                total={null}
                listItems={(() => {
                  const owned = addonPurchases.filter((p) => p.status === "active" && p.expires_at);
                  if (owned.length === 0) return [{ label: my ? "မရှိ" : "None" }];
                  return owned
                    .map((p) => {
                      const a = addons.find((x) => x.id === p.addon_id);
                      const name = (my && a?.label_my) || a?.label_en || "";
                      const expiry = p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "";
                      return { label: name, detail: expiry ? (my ? `သက်တမ်း ${expiry}` : `Until ${expiry}`) : "" };
                    })
                    .filter((x) => x.label);
                })()}
              />

            </div>
          </div>
        )}

        {pending.length > 0 && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Clock className="h-3 w-3" /> {my ? "အတည်ပြုခြင်း စောင့်ဆိုင်းနေသည်" : "Awaiting approval"}
            </div>
            <div className="mt-0.5 text-xs">
              {my
                ? `${pending.length} ခု စစ်ဆေးနေသည်။ နောက်ထပ် ဝယ်ယူနိုင်ပါသည် — အတည်ပြုပြီးချိန်တွင် ပိုင်ဆိုင်မှု ပေါင်းထည့်ပါမည်။`
                : `You have ${pending.length} purchase${pending.length > 1 ? "s" : ""} waiting for admin/partner approval. You can still buy more — they'll be added to your totals once approved.`}
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {sortedPlans.map((plan) => {
            const Icon = TIER_ICON[plan.tier] ?? Sparkles;
            const owned = ownedPackageCounts[plan.id] ?? 0;
            const popular = plan.tier === "growth";
            const isFreeTrial = plan.tier === "free_trial";
            const disabled = isFreeTrial && hasFreeTrial;
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
                {isFreeTrial && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {my ? "အခမဲ့ ၃ လ" : "Free 3 months"}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">{planLabel(plan.tier)}</h3>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {TIER_DESC[plan.tier]?.[my ? "my" : "en"] ?? ""}
                </p>

                <div className="mt-3">
                  <div className="text-2xl font-bold tabular-nums">{formatMMK(plan.price_mmk)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isFreeTrial
                      ? (my ? "၃ လ စမ်းသပ်ခွင့် (တစ်ကြိမ်သာ)" : "3-month trial (one per user)")
                      : (my ? "တစ်ကြိမ်တည်း · သက်တမ်း မရှိ" : "One-time · never expires")}
                  </div>
                </div>

                <ul className="mt-4 flex-1 space-y-1.5 text-xs">
                  <FeatureRow
                    text={
                      plan.is_unlimited_jobs
                        ? my ? "Unlimited Active Jobs" : "Unlimited Active Jobs"
                        : my ? `Active Jobs ${plan.active_jobs_quota.toLocaleString()} ခု` : `${plan.active_jobs_quota.toLocaleString()} Active Jobs`
                    }
                  />
                  {plan.featured_jobs_quota > 0 && (
                    <FeatureRow
                      text={
                        my
                          ? `Featured Jobs ${plan.featured_jobs_quota.toLocaleString()} ခု`
                          : `${plan.featured_jobs_quota.toLocaleString()} Featured Jobs`
                      }
                    />
                  )}
                  <FeatureRow
                    text={
                      plan.is_unlimited_unlocks
                        ? my ? "Unlimited Candidate Unlocks" : "Unlimited Candidate Unlocks"
                        : my ? `Candidate Unlocks ${plan.unlock_quota.toLocaleString()} ခု` : `${plan.unlock_quota.toLocaleString()} Candidate Unlocks`
                    }
                  />
                  {!isFreeTrial && <FeatureRow text={my ? "ပိုင်ဆိုင်မှု စုစုပေါင်းတွင် ပေါင်းထည့်" : "Stacks with other packages you own"} />}
                </ul>

                <div className="mt-3 min-h-[16px] text-[10px] text-emerald-700 dark:text-emerald-400">
                  {owned > 0 ? (my ? `သင် ${owned} ကြိမ် ပိုင်ဆိုင်နေသည်` : `You own ${owned} ×`) : ""}
                </div>

                <button
                  disabled={disabled}
                  onClick={() => onBuyPlan(plan)}
                  className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition ${
                    disabled
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {disabled
                    ? (my ? "သုံးပြီးပါပြီ" : "Already used")
                    : isFreeTrial
                      ? (my ? "အခမဲ့ စမ်းသပ်ခွင့် တောင်းရန်" : "Request Free Trial")
                      : owned > 0
                        ? (my ? "ထပ်မံ ဝယ်ရန်" : "Buy again")
                        : (my ? "ဝယ်ရန်" : "Buy")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <section>
          <h2 className="mb-2 mt-4 text-sm font-bold">{my ? "Add-ons" : "Add-ons"}</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {my ? "မည်သည့် Package ပေါ်တွင်မဆို ထပ်ဖြည့်နိုင်သည်။" : "Top up unlocks, feature your jobs, or add brand & matching for 1 year."}
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {addons.map((a) => {
              const q = getQty(a.id);
              const total = a.is_per_unit ? a.mmk * q : a.mmk;
              return (
                <div key={a.id} className="flex flex-col rounded-xl border border-border bg-card p-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold">{(my && a.label_my) || a.label_en}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.is_per_unit
                        ? my
                          ? `${formatMMK(a.mmk)} / တစ်ခု`
                          : `${formatMMK(a.mmk)} each`
                        : a.duration_days
                          ? my ? `${formatMMK(a.mmk)} · ၁ နှစ်` : `${formatMMK(a.mmk)} · 1 year`
                          : formatMMK(a.mmk)}
                    </div>
                    {a.kind === "unlock_pack" && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        {my
                          ? "သင့် job အတွက် apply လာသူများ၏ အသေးစိတ် CV နှင့် contact information ကို one-click နှင့် ပြန်ဖွင့်နိုင်မှာဖြစ်ပါသည်။"
                          : "Instantly reveal full CVs, contact details, and experience for every candidate who applies to your jobs — one click each."}
                      </p>
                    )}
                    {a.kind === "featured_job" && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        {my
                          ? "သင့် job ကို search ရလဒ်များ၏ အပေါ်ဆုံးတွင် ပရိုမိုရှင်း လုပ်ပေးပြီး၊ candidate များ၏ မျက်နှာစာတွင် ပို၍ ထင်ရှားစေပါသည်။"
                          : "Promote your job to the top of search results and candidate home feeds for maximum visibility and faster applications."}
                      </p>
                    )}
                    {a.kind === "matching" && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        {my
                          ? "သင့်ရဲ့ job နှင့် ကိုက်ညီသော အကောင်းဆုံး candidate များကို ရှာဖွေပေးပြီး၊ စိစစ်ရွေးချယ်ထားသော အမည်စာရင်းကို တိုက်ရိုက် ပေးပို့ပါသည်။"
                          : "We match your jobs to top candidates in our talent pool and deliver a curated shortlist straight to your inbox."}
                      </p>
                    )}
                    {a.kind === "branding" && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                        {my
                          ? "ကုမ္ပဏီ logo, ဓာတ်ပုံများ, မိတ်ဆက်စာ နှင့် ဖွင့်ထားသော job အားလုံးကို ပြသမည့် သတ်မှတ်ထားသော ကိုယ်ပိုင် branding စာမျက်နှာ။"
                          : "A dedicated public profile page with your logo, photos, company story, and all your open jobs — share one link with candidates anywhere."}
                      </p>
                    )}
                    {a.duration_days && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {my ? "သက်တမ်း ပြီးချိန်တွင် ပြန်လည် ဝယ်ယူရန် လိုအပ်ပါသည်" : "Renew after expiry"}
                      </div>
                    )}
                  </div>

                  {a.is_per_unit && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setUnitQty(a.id, q - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                        aria-label="decrease"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={q}
                        onChange={(e) => setUnitQty(a.id, parseInt(e.target.value || "1", 10))}
                        className="h-7 w-16 rounded-md border border-border bg-background text-center text-xs tabular-nums"
                      />
                      <button
                        onClick={() => setUnitQty(a.id, q + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                        aria-label="increase"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <div className="ml-auto text-xs">
                        <span className="text-muted-foreground">{my ? "စုစုပေါင်း " : "Total "}</span>
                        <span className="font-bold tabular-nums">{formatMMK(total)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onBuyAddon(a)}
                    className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    {my ? "ဝယ်ရန်" : "Buy"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <SubscribeSheet open={sheetOpen} onOpenChange={setSheetOpen} selection={selection} />
    </div>
  );
};

const Totals = ({ label, value, total, listItems }: { label: string; value: string; total: number | null; listItems?: { label: string; detail?: string }[] }) => (
  <div className="rounded-xl border border-border bg-muted/30 p-3">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    {listItems ? (
      <ul className="mt-1.5 space-y-0.5">
        {listItems.map((item, i) => (
          <li key={i} className="truncate">
            <span className="text-xs font-semibold text-foreground">{item.label}</span>
            {item.detail && (
              <span className="ml-1 text-[10px] text-emerald-700 dark:text-emerald-400">{item.detail}</span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
        {total !== null && total > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            / {total.toLocaleString()}
          </span>
        )}
      </div>
    )}
  </div>
);

const FeatureRow = ({ text }: { text: string }) => (
  <li className="flex items-start gap-1.5">
    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <span>{text}</span>
  </li>
);

export default Pricing;
