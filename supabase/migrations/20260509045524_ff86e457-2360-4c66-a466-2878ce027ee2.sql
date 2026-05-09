-- Allow authenticated users to read the new single 'receiving_account' app_config key
DROP POLICY IF EXISTS "Authenticated read public config keys" ON public.app_config;
CREATE POLICY "Authenticated read public config keys"
ON public.app_config FOR SELECT TO authenticated
USING (key = ANY (ARRAY['telegram_bot'::text, 'payment_accounts'::text, 'receiving_account'::text, 'referral_rewards'::text]));