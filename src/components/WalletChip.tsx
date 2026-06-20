import { useNavigate } from "react-router-dom";
import { Sparkles, KeyRound } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useMyPackageGrants, useMyQuotas, useSubscriptionPlans, planLabel } from "@/hooks/use-subscription";

/**
 * Shows current package summary + remaining candidate unlocks.
 * Falls back to a compact "Packages" pill when the user has no packages.
 */
const WalletChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: grants = [] } = useMyPackageGrants();
  const { data: quotas } = useMyQuotas();
  const { data: plans = [] } = useSubscriptionPlans();
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));
  const tierRank: Record<string, number> = { free_trial: 0, starter: 1, growth: 2, business: 3, enterprise: 4 };
  const topPlan = grants
    .map((g) => planById[g.plan_id])
    .filter(Boolean)
    .sort((a: any, b: any) => (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0))[0];
  const unlocksLeft = quotas?.is_unlimited_unlocks
    ? Infinity
    : Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));

  if (!topPlan) {
    return (
      <button
        onClick={() => navigate("/pricing")}
        className="flex h-8 items-center gap-1 rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground transition-colors hover:opacity-90"
        aria-label={lang === "my" ? "Package ဝယ်ရန်" : "Packages"}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        <span>{lang === "my" ? "Package" : "Packages"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/wallet")}
      className="flex h-8 items-center gap-1 rounded-full bg-sidebar-accent px-2 text-[11px] font-bold text-shell-foreground transition-colors hover:bg-sidebar-accent/80"
      aria-label={lang === "my" ? "ပိုက်ဆံအိတ်" : "Wallet"}
    >
      <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
      <span>
        {planLabel(topPlan.tier)}
        {grants.length > 1 && <span className="ml-0.5 opacity-70">+{grants.length - 1}</span>}
      </span>
      <span className="ml-1 flex items-center gap-0.5 rounded-full bg-shell-foreground/10 px-1.5 py-0.5">
        <KeyRound className="h-2.5 w-2.5" strokeWidth={2} />
        <span className="tabular-nums">{unlocksLeft === Infinity ? "∞" : unlocksLeft}</span>
      </span>
    </button>
  );
};

export default WalletChip;
