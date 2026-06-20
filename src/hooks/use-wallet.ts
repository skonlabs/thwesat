/**
 * Legacy wallet hooks — stubbed out as part of the wallet/credits removal.
 * Database tables (wallets, wallet_transactions, topup_requests, credit_packages,
 * action_prices) are kept for historical data but no longer read or written from the UI.
 * The exported shapes are preserved so existing call sites continue to compile.
 * `feature_unlocks` remains live and is still backed by its real table.
 */
import { useQuery } from "@tanstack/react-query";
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

const noopAsync = async () => { throw new Error("Wallet functionality has been removed."); };

export function useWallet() {
  // Returns a permanently empty wallet so any UI showing balance renders "0 Ks".
  return { data: null as Wallet | null, isLoading: false, isError: false };
}

export function useCreditPackages() {
  return { data: [] as CreditPackage[], isLoading: false };
}

export function useActionPrices() {
  return { data: {} as Record<string, ActionPrice>, isLoading: false };
}

export function useActionPrice(_key: string): ActionPrice | undefined {
  return undefined;
}

export function useWalletTransactions(_limit = 50) {
  return { data: [] as WalletTx[], isLoading: false };
}

export function useMyTopupRequests() {
  return { data: [] as TopupRequest[], isLoading: false };
}

export async function uploadTopupProof(_userId: string, _file: File): Promise<string> {
  throw new Error("Top-ups have been removed.");
}

export function useCreateTopupRequest() {
  return { mutate: noopAsync, mutateAsync: noopAsync, isPending: false };
}

export function useSpendCredits() {
  return { mutate: noopAsync, mutateAsync: noopAsync, isPending: false };
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

export function formatMMK(amount: number | null | undefined, _lang: "my" | "en" = "en"): string {
  const n = Number(amount || 0);
  const rounded = Math.round(n / 100) * 100;
  return `${rounded.toLocaleString()} Ks`;
}

export function formatCredits(credits: number | null | undefined, _lang: "my" | "en" = "en"): string {
  return `${Number(credits || 0).toLocaleString()} Ks`;
}
