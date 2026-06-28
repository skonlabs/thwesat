import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface PaymentAccountInfo {
  account_name?: string;
  account_number?: string;
  account_email?: string;
  /** Optional admin-uploaded QR image (generic / fallback). When absent, no QR is shown. */
  qr_url?: string;
  /**
   * Per-payment-method QR images keyed by method (e.g. "kbzpay", "wavepay").
   * Falls back to `qr_url` when a method-specific entry is missing.
   */
  qr_by_method?: Record<string, string>;
}

/** Single receiving account used for ALL incoming payments (top-ups, mentor sessions, placement fees). */
export interface ReceivingAccountConfig extends PaymentAccountInfo {
  /** Human label, e.g. "KBZPay" — informational only, since the same account is shown to all payers. */
  method_label?: string;
}

export interface TelegramBotConfig {
  username: string;
  url: string;
}

export interface ReferralRewardsConfig {
  friends_required: number;
  reward_credits: number;
}

const DEFAULTS: Record<string, any> = {
  receiving_account: {
    method_label: "KBZPay",
    account_name: "ThweSat",
    account_number: "09-000-000-000",
  },
  telegram_bot: { username: "ThweSatBot", url: "https://t.me/ThweSatBot" },
  referral_rewards: { friends_required: 5, reward_credits: 5000 },
};

export function useAppConfig<T = any>(key: string) {
  return useQuery({
    queryKey: ["app-config", key],
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error || !data) return DEFAULTS[key] as T;
      return data.value as T;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useReceivingAccount() {
  return useAppConfig<ReceivingAccountConfig>("receiving_account");
}

export function useTelegramBot() {
  return useAppConfig<TelegramBotConfig>("telegram_bot");
}

export function useReferralRewards() {
  return useAppConfig<ReferralRewardsConfig>("referral_rewards");
}

export function useUpdateAppConfig<T = any>(key: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (value: T) => {
      const { error } = await supabase
        .from("app_config")
        .upsert(
          { key, value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
      return value;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-config", key] });
    },
  });
}
