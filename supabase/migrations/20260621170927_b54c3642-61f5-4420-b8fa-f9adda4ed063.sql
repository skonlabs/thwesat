
CREATE OR REPLACE FUNCTION public.try_grant_signup_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus bigint := 1000;
  v_tx uuid;
  v_role text;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.wallet_transactions
             WHERE user_id = _user_id AND ref_type = 'signup_bonus') THEN
    RETURN false;
  END IF;

  SELECT primary_role INTO v_role FROM public.profiles WHERE id = _user_id;
  IF v_role IS NULL OR v_role NOT IN ('jobseeker','mentor') THEN
    RETURN false;
  END IF;

  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
    idempotency_key, note, created_by
  ) VALUES (
    _user_id, 'topup', v_bonus, v_bonus, 'completed', 'signup_bonus', _user_id::text,
    'signup_bonus:' || _user_id::text, 'Welcome bonus', _user_id
  ) RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(_user_id, v_bonus, v_bonus);

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_user_id, 'payment',
    '🎁 Welcome bonus: 1,000 Ks',
    '🎁 ကြိုဆိုဆုကြေး: 1,000 Ks',
    '1,000 Ks added to your wallet. Enjoy!',
    'သင့်ပိုက်ဆံအိတ်ထဲ 1,000 Ks ထည့်ပေးပြီးပါပြီ။',
    '/wallet');

  RETURN true;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_rewards ON public.applications;

CREATE OR REPLACE FUNCTION public._trg_profile_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.try_grant_signup_bonus(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_signup_bonus ON public.profiles;
CREATE TRIGGER trg_profile_signup_bonus
AFTER INSERT OR UPDATE OF primary_role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public._trg_profile_signup_bonus();

-- Backfill eligible users
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.id FROM public.profiles p
    WHERE p.primary_role IN ('jobseeker','mentor')
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id = p.id AND wt.ref_type = 'signup_bonus'
      )
  LOOP
    PERFORM public.try_grant_signup_bonus(r.id);
  END LOOP;
END $$;

-- Reverse out bonuses previously granted to non-eligible roles
DO $$
DECLARE
  r record;
  v_bonus bigint := 1000;
  v_reversal_id uuid;
BEGIN
  FOR r IN
    SELECT wt.user_id, wt.id AS tx_id
    FROM public.wallet_transactions wt
    JOIN public.profiles p ON p.id = wt.user_id
    WHERE wt.ref_type = 'signup_bonus'
      AND wt.status = 'completed'
      AND (p.primary_role IS NULL OR p.primary_role NOT IN ('jobseeker','mentor'))
  LOOP
    UPDATE public.wallet_transactions
      SET status = 'reversed',
          note = COALESCE(note,'') || ' [revoked: role not eligible]'
      WHERE id = r.tx_id;
    -- Record a compensating adjustment so the ledger stays consistent
    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
      idempotency_key, note, created_by
    ) VALUES (
      r.user_id, 'adjustment', -v_bonus, -v_bonus, 'completed',
      'signup_bonus_revoke', r.tx_id::text,
      'signup_bonus_revoke:' || r.tx_id::text,
      'Signup bonus reversed (role not eligible)', r.user_id
    );
    UPDATE public.wallets
       SET balance_credits = GREATEST(0, balance_credits - v_bonus),
           lifetime_topup_mmk = GREATEST(0, lifetime_topup_mmk - v_bonus)
     WHERE user_id = r.user_id;
  END LOOP;
END $$;
