import { useNavigate } from "react-router-dom";
import { Sparkles, KeyRound } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useMySubscription, useMyQuotas, useSubscriptionPlans, planLabel } from "@/hooks/use-subscription";

/**
 * Shows current subscription plan name + remaining candidate unlocks.
 * Falls back to a compact "Subscribe" pill when the user has no active plan.
 */
const WalletChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { data: sub } = useMySubscription();
  const { data: quotas } = useMyQuotas();
  const { data: plans = [] } = useSubscriptionPlans();
  const plan = plans.find((p) => p.id === sub?.plan_id);
  const unlocksLeft = Math.max(0, (quotas?.unlocks_total ?? 0) - (quotas?.unlocks_used ?? 0));

  if (!sub || !plan) {
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
      <span>{planLabel(plan.tier)}</span>
      <span className="ml-1 flex items-center gap-0.5 rounded-full bg-shell-foreground/10 px-1.5 py-0.5">
        <KeyRound className="h-2.5 w-2.5" strokeWidth={2} />
        <span className="tabular-nums">{unlocksLeft}</span>
      </span>
    </button>
  );
};

export default WalletChip;
