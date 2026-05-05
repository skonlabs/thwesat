-- Update new user wallet trigger to grant 1000 credit signup bonus
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bonus bigint := 1000;
  v_tx uuid;
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  -- Idempotent signup bonus
  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = NEW.id AND ref_type = 'signup_bonus'
  ) THEN
    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
      idempotency_key, note, created_by
    ) VALUES (
      NEW.id, 'topup', v_bonus, v_bonus, 'completed', 'signup_bonus', NEW.id::text,
      'signup_bonus:' || NEW.id::text, 'Welcome bonus', NEW.id
    ) RETURNING id INTO v_tx;

    PERFORM public._wallet_apply(NEW.id, v_bonus, v_bonus);

    INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (NEW.id, 'payment',
      '🎁 Welcome bonus: 1,000 credits',
      '🎁 ကြိုဆိုဆုကြေး: 1,000 credits',
      '1,000 credits have been added to your wallet to get started.',
      'စတင်ရန် 1,000 credits သင့်ပိုက်ဆံအိတ်သို့ ထည့်ပေးပြီးပါပြီ။',
      '/wallet');
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: grant 1000 credit one-time bonus to existing users without one
DO $$
DECLARE
  r RECORD;
  v_bonus bigint := 1000;
BEGIN
  FOR r IN
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
      WHERE wt.user_id = p.id AND wt.ref_type = 'signup_bonus'
    )
  LOOP
    INSERT INTO public.wallets(user_id) VALUES (r.user_id) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
      idempotency_key, note, created_by
    ) VALUES (
      r.user_id, 'topup', v_bonus, v_bonus, 'completed', 'signup_bonus', r.user_id::text,
      'signup_bonus:' || r.user_id::text, 'Welcome bonus (backfill)', r.user_id
    );

    PERFORM public._wallet_apply(r.user_id, v_bonus, v_bonus);

    INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (r.user_id, 'payment',
      '🎁 Welcome bonus: 1,000 credits',
      '🎁 ကြိုဆိုဆုကြေး: 1,000 credits',
      '1,000 credits have been added to your wallet.',
      '1,000 credits သင့်ပိုက်ဆံအိတ်သို့ ထည့်ပေးပြီးပါပြီ။',
      '/wallet');
  END LOOP;
END $$;