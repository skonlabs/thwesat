import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Wallet {
  user_id: string;
  balance_credits: number;
  lifetime_topup_mmk: number;
  lifetime_spent_credits: number;
}

export interface CreditPackage {
  id: string;
  name_en: string;
  name_my: string;
  price_mmk: number;
  credits: number;
  bonus_credits: number;
  badge_en: string | null;
  badge_my: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ActionPrice {
  action_key: string;
  label_en: string;
  label_my: string;
  description_en: string;
  description_my: string;
  price_credits: number;
  duration_days: number | null;
  is_active: boolean;
}

export interface WalletTx {
  id: string;
  user_id: string;
  kind: string;
  credits: number;
  mmk_amount: number | null;
  status: string;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  metadata: any;
  created_at: string;
}

export interface TopupRequest {
  id: string;
  user_id: string;
  package_id: string | null;
  mmk_amount: number;
  credits_to_grant: number;
  payment_method: string;
  proof_url: string | null;
  sender_reference: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as Wallet) ?? { user_id: user.id, balance_credits: 0, lifetime_topup_mmk: 0, lifetime_spent_credits: 0 };
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

export function useCreditPackages() {
  return useQuery({
    queryKey: ["credit-packages"],
    queryFn: async (): Promise<CreditPackage[]> => {
      const { data } = await (supabase as any)
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data as CreditPackage[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useActionPrices() {
  return useQuery({
    queryKey: ["action-prices"],
    queryFn: async (): Promise<Record<string, ActionPrice>> => {
      const { data } = await (supabase as any)
        .from("action_prices")
        .select("*")
        .eq("is_active", true);
      const map: Record<string, ActionPrice> = {};
      (data as ActionPrice[] | null)?.forEach((p) => (map[p.action_key] = p));
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export function useActionPrice(key: string) {
  const { data } = useActionPrices();
  return data?.[key];
}

export function useWalletTransactions(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-transactions", user?.id, limit],
    queryFn: async (): Promise<WalletTx[]> => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as WalletTx[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useMyTopupRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topup-requests", user?.id],
    queryFn: async (): Promise<TopupRequest[]> => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("topup_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data as TopupRequest[]) ?? [];
    },
    enabled: !!user,
  });
}

export async function uploadTopupProof(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `topup/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useCreateTopupRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      package_id: string;
      mmk_amount: number;
      credits_to_grant: number;
      payment_method: string;
      proof_url?: string | null;
      sender_reference?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("topup_requests")
        .insert({ ...req, user_id: user.id, status: "pending" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topup-requests"] });
    },
  });
}

export function useSpendCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      action_key: string;
      target_type?: string;
      target_id?: string;
      idempotency_key?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await (supabase as any).rpc("wallet_spend", {
        _action_key: args.action_key,
        _target_type: args.target_type ?? null,
        _target_id: args.target_id ?? null,
        _idempotency_key: args.idempotency_key ?? null,
        _metadata: args.metadata ?? {},
      });
      if (error) throw new Error(error.message);
      return data as { ok: boolean; tx?: string; unlock?: string; price?: number; new_balance?: number; already_unlocked?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["feature-unlocks"] });
    },
  });
}

export function useFeatureUnlocks(featureKey?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feature-unlocks", user?.id, featureKey],
    queryFn: async () => {
      if (!user) return [];
      let q = (supabase as any).from("feature_unlocks").select("*").eq("user_id", user.id).eq("is_active", true);
      if (featureKey) q = q.eq("feature_key", featureKey);
      const { data } = await q.order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function formatMMK(amount: number, lang: "my" | "en" = "en"): string {
  return `${amount.toLocaleString()} ${lang === "my" ? "ကျပ်" : "MMK"}`;
}

export function formatCredits(credits: number, lang: "my" | "en" = "en"): string {
  return `${credits.toLocaleString()} ${lang === "my" ? "credits" : "credits"}`;
}
