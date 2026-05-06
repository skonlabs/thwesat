
-- 1. Master referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used')),
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_status ON public.referral_codes(status);
CREATE INDEX IF NOT EXISTS idx_referral_codes_used_by ON public.referral_codes(used_by);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own codes"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE: all mutations go through SECURITY DEFINER functions.

-- 2. Helper: mint a batch of N unused codes for a given owner
CREATE OR REPLACE FUNCTION public.mint_referral_codes(_owner_id uuid, _count int DEFAULT 10)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int := 0;
  v_attempt int;
  v_code text;
BEGIN
  FOR v_attempt IN 1.._count LOOP
    LOOP
      v_code := 'TS-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
      BEGIN
        INSERT INTO public.referral_codes(code, owner_id) VALUES (v_code, _owner_id);
        v_inserted := v_inserted + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- collision, try a new code
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
  RETURN v_inserted;
END;
$$;

-- 3. Auto-mint 10 codes per new profile
CREATE OR REPLACE FUNCTION public._trg_mint_referral_codes_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.mint_referral_codes(NEW.id, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mint_referral_codes_on_profile ON public.profiles;
CREATE TRIGGER trg_mint_referral_codes_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public._trg_mint_referral_codes_on_profile();

-- 4. Backfill: mint 10 codes for every existing profile that has none
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.id FROM public.profiles p
           WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.owner_id = p.id)
  LOOP
    PERFORM public.mint_referral_codes(r.id, 10);
  END LOOP;
END $$;

-- 5. Update lookup: only return owner if code exists AND is unused
CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_input text := upper(coalesce(_code, ''));
  v_match text[];
  v_normalized text;
  v_referrer uuid;
BEGIN
  v_match := regexp_match(v_input, '(^|[^A-Z0-9])(TS[^A-Z0-9]*[A-F0-9]{6})([^A-Z0-9]|$)');
  v_normalized := regexp_replace(coalesce(v_match[2], v_input), '[^A-Z0-9]', '', 'g');
  IF length(v_normalized) = 6 THEN
    v_normalized := 'TS' || v_normalized;
  END IF;
  -- Reformat as TS-XXXXXX for matching against referral_codes.code
  IF length(v_normalized) = 8 AND substr(v_normalized,1,2) = 'TS' THEN
    v_normalized := 'TS-' || substr(v_normalized, 3);
  END IF;

  SELECT owner_id INTO v_referrer
  FROM public.referral_codes
  WHERE code = v_normalized AND status = 'unused'
  LIMIT 1;

  RETURN v_referrer;
END;
$$;

-- 6. Atomic redeem: marks code used, sets profiles.referred_by, inserts referrals row, awards reward
CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code text, _new_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.referrals(referrer_id, referred_id, referral_code, status)
  VALUES (rc.owner_id, _new_user_id, rc.code, 'completed');

  RETURN jsonb_build_object('ok', true, 'referrer_id', rc.owner_id, 'code', rc.code);
END;
$$;

-- 7. Reward every 5 redemptions (repeating, not one-time)
CREATE OR REPLACE FUNCTION public.process_referral_reward(_referrer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count integer;
  reward_count integer;
  earned_rewards integer;
  pending_rewards integer;
  v_config jsonb;
  v_friends_required integer;
  v_reward_credits bigint;
  v_tx uuid;
  i integer;
  v_idem text;
BEGIN
  SELECT value INTO v_config FROM public.app_config WHERE key = 'referral_rewards';
  v_friends_required := COALESCE((v_config->>'friends_required')::int, 5);
  v_reward_credits := COALESCE((v_config->>'reward_credits')::bigint, 5000);

  SELECT count(*) INTO completed_count
  FROM public.referrals
  WHERE referrer_id = _referrer_id AND status = 'completed';

  earned_rewards := completed_count / v_friends_required;

  SELECT count(*) INTO reward_count
  FROM public.wallet_transactions
  WHERE user_id = _referrer_id AND ref_type = 'referral_reward';

  pending_rewards := earned_rewards - reward_count;
  IF pending_rewards <= 0 THEN RETURN; END IF;

  FOR i IN 1..pending_rewards LOOP
    v_idem := 'referral_reward:' || _referrer_id::text || ':' || (reward_count + i)::text;
    INSERT INTO public.wallet_transactions(
      user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by
    ) VALUES (
      _referrer_id, 'topup', v_reward_credits, v_reward_credits, 'completed',
      'referral_reward', _referrer_id::text, v_idem,
      'Referral reward: ' || ((reward_count + i) * v_friends_required) || ' friends joined', _referrer_id
    ) RETURNING id INTO v_tx;

    PERFORM public._wallet_apply(_referrer_id, v_reward_credits, v_reward_credits);

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      _referrer_id, 'referral_reward',
      '🎉 You earned ' || v_reward_credits || ' credits!',
      '🎉 ' || v_reward_credits || ' credits ရရှိပါပြီ!',
      'You referred ' || v_friends_required || ' more friends. ' || v_reward_credits || ' credits added to your wallet.',
      'သူငယ်ချင်း ' || v_friends_required || ' ဦး ထပ်မံ ညွှန်းဆိုပါပြီ။ ' || v_reward_credits || ' credits ထည့်ပေးပြီးပါပြီ။',
      '/wallet'
    );
  END LOOP;
END;
$$;
