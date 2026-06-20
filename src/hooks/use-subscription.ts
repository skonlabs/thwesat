import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PlanRole = "employer" | "recruiting_agent" | "both";
export type PlanTier = "free_trial" | "starter" | "growth" | "business" | "enterprise";
export type AddonKind = "unlock_pack" | "featured_job" | "matching" | "branding";

export interface SubscriptionPlan {
  id: string;
  role: PlanRole;
  tier: PlanTier;
  price_mmk: number;
  active_jobs_quota: number;
  is_unlimited_jobs: boolean;
  unlock_quota: number;
  is_unlimited_unlocks: boolean;
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
  is_per_unit: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface PackageGrant {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active";
  started_at: string;
  mmk_paid: number;
}

export interface SubscriptionQuotas {
  user_id: string;
  active_jobs_quota: number;
  is_unlimited_jobs: boolean;
  active_jobs_used: number;
  unlocks_total: number;
  unlocks_used: number;
  is_unlimited_unlocks: boolean;
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

export interface SubscriptionPaymentRequest {
  id: string;
  user_id: string;
  request_type: "subscription" | "addon";
  plan_id: string | null;
  addon_id: string | null;
  quantity: number;
  mmk_amount: number;
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

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data } = await S.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
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

export function useMyPackageGrants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-package-grants", user?.id],
    queryFn: async (): Promise<PackageGrant[]> => {
      if (!user) return [];
      try { await S.rpc("tick_expire_subscriptions"); } catch {}
      const { data } = await S.from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false });
      return (data as PackageGrant[]) ?? [];
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

export function useMyPendingSubscriptionRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-pending-sub-requests", user?.id],
    queryFn: async (): Promise<SubscriptionPaymentRequest[]> => {
      if (!user) return [];
      const { data } = await S.from("subscription_payment_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data as SubscriptionPaymentRequest[]) ?? [];
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
      qc.invalidateQueries({ queryKey: ["my-pending-sub-requests"] });
    },
  });
}

export function formatMMK(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return `${n.toLocaleString()} Ks`;
}

export function planLabel(tier: PlanTier): string {
  if (tier === "free_trial") return "Free Trial";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/** Map app role -> addon role_scope filter */
export function planRoleFor(effectiveRole?: string): "employer" | "recruiting_agent" | null {
  if (effectiveRole === "employer") return "employer";
  if (effectiveRole === "agent") return "recruiting_agent";
  return null;
}
