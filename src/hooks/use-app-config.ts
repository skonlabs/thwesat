import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface PaymentAccountInfo {
  account_name?: string;
  account_number?: string;
  account_email?: string;
  /** Optional admin-uploaded QR image (e.g. merchant QR). When absent, UI generates a QR from account_number. */
  qr_url?: string;
}

export interface PaymentAccountsConfig {
  kbzpay: PaymentAccountInfo;
  cbpay: PaymentAccountInfo;
  wavepay: PaymentAccountInfo;
  ayapay: PaymentAccountInfo;
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
  payment_accounts: {
    kbzpay: { account_name: "ThweSat", account_number: "09-000-000-000" },
    cbpay: { account_name: "ThweSat", account_number: "09-000-000-000" },
    wavepay: { account_name: "ThweSat", account_number: "09-000-000-000" },
    ayapay: { account_name: "ThweSat", account_number: "09-000-000-000" },
  },
  telegram_bot: { username: "ThweSatBot", url: "https://t.me/ThweSatBot" },
  referral_rewards: { friends_required: 5, reward_credits: 5000 },
};

export function useAppConfig<T = any>(key: string) {
  return useQuery({
    queryKey: ["app-config", key],
    queryFn: async (): Promise<T> => {
      const { data, error } = await (supabase as any)
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

export function usePaymentAccounts() {
  return useAppConfig<PaymentAccountsConfig>("payment_accounts");
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
      const { error } = await (supabase as any)
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

