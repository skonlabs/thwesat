
INSERT INTO public.app_config (key, value)
VALUES ('referral_rewards', '{"friends_required": 5, "reward_credits": 5000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Allow authenticated users to read this public config key
DROP POLICY IF EXISTS "Authenticated read public config keys" ON public.app_config;
CREATE POLICY "Authenticated read public config keys"
ON public.app_config
FOR SELECT
TO authenticated
USING (key = ANY (ARRAY['telegram_bot'::text, 'payment_accounts'::text, 'referral_rewards'::text]));

-- Refactor referral reward function to read from app_config
CREATE OR REPLACE FUNCTION public.process_referral_reward(_referrer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completed_count integer;
  has_reward boolean;
  v_config jsonb;
  v_friends_required integer;
  v_reward_credits bigint;
  v_tx uuid;
BEGIN
  SELECT value INTO v_config FROM public.app_config WHERE key = 'referral_rewards';
  v_friends_required := COALESCE((v_config->>'friends_required')::int, 5);
  v_reward_credits := COALESCE((v_config->>'reward_credits')::bigint, 5000);

  SELECT count(*) INTO completed_count
  FROM public.referrals
  WHERE referrer_id = _referrer_id AND status = 'completed';

  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = _referrer_id AND ref_type = 'referral_reward'
  ) INTO has_reward;

  IF completed_count >= v_friends_required AND NOT has_reward THEN
    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by
    ) VALUES (
      _referrer_id, 'topup', v_reward_credits, v_reward_credits, 'completed',
      'referral_reward', _referrer_id::text,
      'referral_reward:' || _referrer_id::text,
      'Referral reward: ' || v_friends_required || ' friends joined', _referrer_id
    ) RETURNING id INTO v_tx;

    PERFORM public._wallet_apply(_referrer_id, v_reward_credits, v_reward_credits);

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      _referrer_id,
      'referral_reward',
      '🎉 You earned ' || v_reward_credits || ' credits!',
      '🎉 ' || v_reward_credits || ' credits ရရှိပါပြီ!',
      'You referred ' || v_friends_required || ' friends successfully. ' || v_reward_credits || ' credits have been added to your wallet.',
      'သူငယ်ချင်း ' || v_friends_required || ' ဦး ညွှန်းဆိုမှု အောင်မြင်ပါပြီ။ ' || v_reward_credits || ' credits သင့်ပိုက်ဆံအိတ်သို့ ထည့်ပေးပြီးပါပြီ။',
      '/wallet'
    );
  END IF;
END;
$function$;
