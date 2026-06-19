import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PlanRole = "employer" | "recruiting_agent";
export type PlanTier = "starter" | "growth" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";
export type AddonKind = "unlock_pack" | "featured_job" | "matching" | "branding";

export interface SubscriptionPlan {
  id: string;
  role: PlanRole;
  tier: PlanTier;
  monthly_mmk: number;
  launch_mmk: number;
  active_jobs_quota: number;
  is_unlimited_jobs: boolean;
  unlock_quota: number;
  sort_order: number;
  is_active: boolean;
}

export interface AddonProduct {
  id: string;
  key: string;
  label_en: string;
  label_my: string | null;
  kind: AddonKind;
  role_scope: "both" | "employer" | "recruiting_agent";
  mmk: number;
  unlock_amount: number;
  duration_days: number | null;
  is_recurring: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  cycle: BillingCycle;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  current_period_end: string;
  launch_price_applied: boolean;
  launch_ends_at: string | null;
  auto_renew: boolean;
  cancelled_at: string | null;
  mmk_paid: number;
}

export interface SubscriptionQuotas {
  user_id: string;
  active_jobs_quota: number;
  is_unlimited_jobs: boolean;
  active_jobs_used: number;
  unlocks_total: number;
  unlocks_used: number;
  featured_jobs_total: number;
  featured_jobs_used: number;
}

export interface AddonPurchase {
  id: string;
  user_id: string;
  addon_id: string;
  mmk_paid: number;
  starts_at: string;
  expires_at: string | null;
  units_total: number;
  units_used: number;
  status: "active" | "expired" | "consumed";
}

export interface LaunchPromo {
  id: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface SubscriptionPaymentRequest {
  id: string;
  user_id: string;
  request_type: "subscription" | "addon";
  plan_id: string | null;
  cycle: BillingCycle | null;
  addon_id: string | null;
  mmk_amount: number;
  launch_price_applied: boolean;
  payment_method: string | null;
  proof_url: string | null;
  sender_reference: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const S = supabase as any;

export function useSubscriptionPlans(role?: PlanRole) {
  return useQuery({
    queryKey: ["subscription-plans", role],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      let q = S.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
      if (role) q = q.eq("role", role);
      const { data } = await q;
      return (data as SubscriptionPlan[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAddonProducts(roleScope?: "employer" | "recruiting_agent") {
  return useQuery({
    queryKey: ["addon-products", roleScope],
    queryFn: async (): Promise<AddonProduct[]> => {
      const { data } = await S.from("addon_products").select("*").eq("is_active", true).order("sort_order");
      const all = (data as AddonProduct[]) ?? [];
      if (!roleScope) return all;
      return all.filter((a) => a.role_scope === "both" || a.role_scope === roleScope);
    },
    staleTime: 5 * 60_000,
  });
}

export function useLaunchPromo() {
  return useQuery({
    queryKey: ["launch-promo"],
    queryFn: async (): Promise<LaunchPromo | null> => {
      const { data } = await S.from("launch_promo_config").select("*").eq("id", 1).maybeSingle();
      return data as LaunchPromo | null;
    },
    staleTime: 60_000,
  });
}

export function isLaunchActive(promo?: LaunchPromo | null): boolean {
  if (!promo || !promo.is_active) return false;
  const now = Date.now();
  return now >= new Date(promo.starts_at).getTime() && now <= new Date(promo.ends_at).getTime();
}

/** Compute the price the user actually pays right now for a given plan + cycle.
 *  Promo behavior: when a launch promo is active, the first 3 months are free for ALL plans.
 *  The user pays the standard plan price upfront; the paid period starts after the promo ends.
 *  Yearly is always billed as 11 × monthly (one month free).
 */
export function computePrice(plan: SubscriptionPlan, cycle: BillingCycle, launchActive: boolean): {
  mmk: number;
  originalYearlyMmk: number; // monthly × 12 (for strike-through on yearly)
  launchApplied: boolean;
  monthsCovered: number;
} {
  const originalYearlyMmk = plan.monthly_mmk * 12;
  if (cycle === "monthly") {
    return { mmk: plan.monthly_mmk, originalYearlyMmk, launchApplied: launchActive, monthsCovered: 1 };
  }
  return { mmk: plan.monthly_mmk * 11, originalYearlyMmk, launchApplied: launchActive, monthsCovered: 12 };
}

export function useMySubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-subscription", user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;
      // Auto-expire stale rows first (best-effort, ignored on failure)
      try { await S.rpc("tick_expire_subscriptions"); } catch {}
      const { data } = await S.from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Subscription) ?? null;
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

export function useMyQuotas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-quotas", user?.id],
    queryFn: async (): Promise<SubscriptionQuotas | null> => {
      if (!user) return null;
      const { data } = await S.from("subscription_quotas").select("*").eq("user_id", user.id).maybeSingle();
      return (data as SubscriptionQuotas) ?? null;
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

export function useMyAddonPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-addon-purchases", user?.id],
    queryFn: async (): Promise<AddonPurchase[]> => {
      if (!user) return [];
      const { data } = await S.from("addon_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data as AddonPurchase[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useMySubscriptionPaymentRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-sub-payment-requests", user?.id],
    queryFn: async (): Promise<SubscriptionPaymentRequest[]> => {
      if (!user) return [];
      const { data } = await S.from("subscription_payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data as SubscriptionPaymentRequest[]) ?? [];
    },
    enabled: !!user,
  });
}

export async function uploadSubscriptionProof(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/subscription/${Date.now()}-${rand}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useCreateSubscriptionPaymentRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: Omit<SubscriptionPaymentRequest, "id" | "user_id" | "status" | "admin_note" | "reviewed_by" | "reviewed_at" | "created_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await S.from("subscription_payment_requests")
        .insert({ ...req, user_id: user.id, status: "pending" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-sub-payment-requests"] });
    },
  });
}

export function formatMMK(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return `${n.toLocaleString()} Ks`;
}

export function planLabel(tier: PlanTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/** Map app role -> plan role */
export function planRoleFor(effectiveRole?: string): PlanRole | null {
  if (effectiveRole === "employer") return "employer";
  if (effectiveRole === "agent") return "recruiting_agent";
  return null;
}
