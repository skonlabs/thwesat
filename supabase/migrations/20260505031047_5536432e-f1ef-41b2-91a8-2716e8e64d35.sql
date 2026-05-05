CREATE OR REPLACE FUNCTION public.process_referral_reward(_referrer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completed_count integer;
  has_reward boolean;
  v_reward_credits bigint := 5000;
  v_tx uuid;
BEGIN
  -- Count completed referrals
  SELECT count(*) INTO completed_count
  FROM public.referrals
  WHERE referrer_id = _referrer_id AND status = 'completed';

  -- Check if already rewarded (look for prior referral_reward wallet tx)
  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = _referrer_id
      AND ref_type = 'referral_reward'
  ) INTO has_reward;

  -- Grant 5,000 credits at 5 completed referrals (only once)
  IF completed_count >= 5 AND NOT has_reward THEN
    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by
    ) VALUES (
      _referrer_id, 'topup', v_reward_credits, v_reward_credits, 'completed',
      'referral_reward', _referrer_id::text,
      'referral_reward:' || _referrer_id::text,
      'Referral reward: 5 friends joined', _referrer_id
    ) RETURNING id INTO v_tx;

    PERFORM public._wallet_apply(_referrer_id, v_reward_credits, v_reward_credits);

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      _referrer_id,
      'referral_reward',
      '🎉 You earned 5,000 credits!',
      '🎉 ၅,၀၀၀ credits ရရှိပါပြီ!',
      'You referred 5 friends successfully. 5,000 credits (≈ 5,000 MMK) have been added to your wallet.',
      'သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုမှု အောင်မြင်ပါပြီ။ ၅,၀၀၀ credits (≈ ၅,၀၀၀ ကျပ်) သင့်ပိုက်ဆံအိတ်သို့ ထည့်ပေးပြီးပါပြီ။',
      '/wallet'
    );
  END IF;
END;
$function$;