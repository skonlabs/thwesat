import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useRole } from "@/hooks/use-role";
import {
  useMyPackageGrants,
  useSubscriptionPlans,
  useMyQuotas,
  useMyAddonPurchases,
  planLabel,
} from "@/hooks/use-subscription";

/**
 * Compact subscription/package chip for Employers and Agents.
 * Shows current plan tier, active add-on count, and remaining unlock balance.
 * Clicking opens the Packages & Add-ons page.
 */
const SubscriptionChip = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { role } = useRole();
  const { data: grants = [] } = useMyPackageGrants();
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: quotas } = useMyQuotas();
  const { data: addons = [] } = useMyAddonPurchases();

  if (role !== "employer" && role !== "agent") return null;

  const currentGrant = grants[0];
  const currentPlan = currentGrant ? plans.find((p) => p.id === currentGrant.plan_id) : undefined;
  const tierLabel = currentPlan ? planLabel(currentPlan.tier) : lang === "my" ? "မရှိ" : "Free";

  const activeAddons = addons.filter((a) => a.status === "active").length;

  const unlocksLeft = quotas
    ? quotas.is_unlimited_unlocks
      ? "∞"
      : Math.max(0, (quotas.unlocks_total ?? 0) - (quotas.unlocks_used ?? 0))
    : 0;

  return (
    <button
      onClick={() => navigate("/pricing")}
      className="hidden h-8 items-center gap-1.5 rounded-full bg-sidebar-accent px-2.5 text-[11px] font-bold text-shell-foreground transition-colors hover:bg-sidebar-accent/80 md:flex"
      aria-label={lang === "my" ? "ပက်ကေ့ဂျ်" : "Package"}
      title={lang === "my" ? "ပက်ကေ့ဂျ် နှင့် Add-ons" : "Package & Add-ons"}
    >
      <Package className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
      <span className="tabular-nums">{tierLabel}</span>
      <span className="text-shell-foreground/50">·</span>
      <span className="tabular-nums" title={lang === "my" ? "ဖွင့်ထားနိုင်သည်" : "Unlocks left"}>
        {unlocksLeft}
      </span>
      {activeAddons > 0 && (
        <>
          <span className="text-shell-foreground/50">·</span>
          <span className="tabular-nums" title={lang === "my" ? "Add-ons" : "Add-ons"}>
            +{activeAddons}
          </span>
        </>
      )}
    </button>
  );
};

export default SubscriptionChip;
