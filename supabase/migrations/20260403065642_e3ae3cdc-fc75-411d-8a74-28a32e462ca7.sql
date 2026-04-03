
-- Function to check and grant referral reward
CREATE OR REPLACE FUNCTION public.process_referral_reward(_referrer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count integer;
  has_reward boolean;
BEGIN
  -- Count completed referrals
  SELECT count(*) INTO completed_count
  FROM public.referrals
  WHERE referrer_id = _referrer_id AND status = 'completed';

  -- Check if already rewarded
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _referrer_id AND plan_type = 'referral_reward'
  ) INTO has_reward;

  -- Grant reward at 5 completed referrals (only once)
  IF completed_count >= 5 AND NOT has_reward THEN
    -- Activate premium
    UPDATE public.profiles SET is_premium = true WHERE id = _referrer_id;

    -- Create 1-month subscription
    INSERT INTO public.subscriptions (user_id, plan_type, status, current_period_start, current_period_end, billing_cycle, currency)
    VALUES (
      _referrer_id,
      'referral_reward',
      'active',
      now(),
      now() + interval '1 month',
      'one-time',
      'USD'
    );

    -- Send notification
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      _referrer_id,
      'referral_reward',
      '🎉 You earned 1 month free Premium!',
      '🎉 ပရီမီယံ ၁ လ အခမဲ့ ရရှိပါပြီ!',
      'You referred 5 friends successfully. Enjoy Premium features for 1 month!',
      'သူငယ်ချင်း ၅ ဦး ညွှန်းဆိုမှု အောင်မြင်ပါပြီ။ ပရီမီယံ အင်္ဂါရပ်များကို ၁ လ အခမဲ့ သုံးစွဲပါ!',
      '/premium'
    );
  END IF;
END;
$$;

-- Function to expire referral premium (call via cron or edge function)
CREATE OR REPLACE FUNCTION public.expire_referral_premium()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find expired referral subscriptions
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE plan_type = 'referral_reward'
    AND status = 'active'
    AND current_period_end < now();

  -- Reset is_premium for users who have no other active subscriptions
  UPDATE public.profiles
  SET is_premium = false
  WHERE is_premium = true
    AND id NOT IN (
      SELECT user_id FROM public.subscriptions
      WHERE status = 'active' AND current_period_end > now()
    );
END;
$$;

-- Trigger: when a referral is completed, check if reward should be granted
CREATE OR REPLACE FUNCTION public.on_referral_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    PERFORM public.process_referral_reward(NEW.referrer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_completed ON public.referrals;
CREATE TRIGGER trigger_referral_completed
  AFTER UPDATE OF status ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.on_referral_completed();
