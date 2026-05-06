
-- 1) Stop auto-granting signup bonus on user creation. Only create the wallet row.
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2) Insert referrals as 'pending' instead of 'completed' on redeem.
CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code text, _new_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_input text := upper(coalesce(_code,''));
  v_normalized text;
  v_match text[];
  rc public.referral_codes%ROWTYPE;
BEGIN
  IF _new_user_id IS NULL THEN RAISE EXCEPTION 'invalid_user'; END IF;

  v_match := regexp_match(v_input, '(^|[^A-Z0-9])(TS[^A-Z0-9]*[A-F0-9]{6})([^A-Z0-9]|$)');
  v_normalized := regexp_replace(coalesce(v_match[2], v_input), '[^A-Z0-9]', '', 'g');
  IF length(v_normalized) = 6 THEN v_normalized := 'TS' || v_normalized; END IF;
  IF length(v_normalized) = 8 AND substr(v_normalized,1,2) = 'TS' THEN
    v_normalized := 'TS-' || substr(v_normalized, 3);
  END IF;

  SELECT * INTO rc FROM public.referral_codes WHERE code = v_normalized FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF rc.status = 'used' THEN RAISE EXCEPTION 'code_already_used'; END IF;
  IF rc.owner_id = _new_user_id THEN RAISE EXCEPTION 'cannot_redeem_own_code'; END IF;

  UPDATE public.referral_codes
    SET status='used', used_by=_new_user_id, used_at=now()
    WHERE id = rc.id;

  UPDATE public.profiles SET referred_by = rc.code WHERE id = _new_user_id;

  -- Pending until the referred user applies for at least one job.
  INSERT INTO public.referrals(referrer_id, referred_id, referral_code, status)
  VALUES (rc.owner_id, _new_user_id, rc.code, 'pending');

  RETURN jsonb_build_object('ok', true, 'referrer_id', rc.owner_id, 'code', rc.code);
END;
$function$;

-- 3) Helper: check profile completion using the same 10 fields as the frontend.
CREATE OR REPLACE FUNCTION public.is_profile_complete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND COALESCE(NULLIF(trim(p.display_name), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.headline), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.bio), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.location), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.email), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.experience), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.avatar_url), ''), NULL) IS NOT NULL
      AND COALESCE(NULLIF(trim(p.phone), ''), NULL) IS NOT NULL
      AND p.skills IS NOT NULL AND cardinality(p.skills) > 0
      AND p.languages IS NOT NULL AND cardinality(p.languages) > 0
  );
$$;

-- 4) Grant signup bonus if eligible (idempotent via ref_type='signup_bonus').
CREATE OR REPLACE FUNCTION public.try_grant_signup_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus bigint := 1000;
  v_tx uuid;
  v_has_application boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Already granted?
  IF EXISTS (SELECT 1 FROM public.wallet_transactions
             WHERE user_id = _user_id AND ref_type = 'signup_bonus') THEN
    RETURN false;
  END IF;

  -- Profile complete?
  IF NOT public.is_profile_complete(_user_id) THEN RETURN false; END IF;

  -- Has at least one (non-withdrawn) application?
  SELECT EXISTS (
    SELECT 1 FROM public.applications
    WHERE applicant_id = _user_id AND COALESCE(status,'') <> 'withdrawn'
  ) INTO v_has_application;
  IF NOT v_has_application THEN RETURN false; END IF;

  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallet_transactions(
    user_id, kind, credits, mmk_amount, status, ref_type, ref_id,
    idempotency_key, note, created_by
  ) VALUES (
    _user_id, 'topup', v_bonus, v_bonus, 'completed', 'signup_bonus', _user_id::text,
    'signup_bonus:' || _user_id::text, 'Welcome bonus (profile + first application)', _user_id
  ) RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(_user_id, v_bonus, v_bonus);

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (_user_id, 'payment',
    '🎁 Welcome bonus: 1,000 credits',
    '🎁 ကြိုဆိုဆုကြေး: 1,000 credits',
    'You completed your profile and applied for a job. 1,000 credits added.',
    'ပရိုဖိုင်ပြည့်စုံပြီး အလုပ်တစ်ခု လျှောက်ထားသဖြင့် 1,000 credits ထည့်ပေးပြီးပါပြီ။',
    '/wallet');

  RETURN true;
END;
$$;

-- 5) After an application is created, run eligibility checks for the applicant.
CREATE OR REPLACE FUNCTION public._trg_application_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try signup bonus
  PERFORM public.try_grant_signup_bonus(NEW.applicant_id);

  -- Complete pending referral for this applicant (if any). The referral was
  -- created at signup; the application is by definition created after that,
  -- satisfying "applied since referral date". Only mark completed if the
  -- application was created at/after the referral row.
  UPDATE public.referrals
    SET status = 'completed'
    WHERE referred_id = NEW.applicant_id
      AND status = 'pending'
      AND created_at <= NEW.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_rewards ON public.applications;
CREATE TRIGGER trg_application_rewards
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public._trg_application_rewards();

-- 6) Also try to grant the bonus when the profile is updated (covers the case
-- where the user already applied first and then completes their profile).
CREATE OR REPLACE FUNCTION public._trg_profile_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.try_grant_signup_bonus(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_signup_bonus ON public.profiles;
CREATE TRIGGER trg_profile_signup_bonus
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public._trg_profile_signup_bonus();
