CREATE OR REPLACE FUNCTION public.unlock_contact_with_quota(
  _target_type text,
  _target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_quota public.subscription_quotas%ROWTYPE;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _target_id IS NULL OR _target_type IS NULL THEN
    RAISE EXCEPTION 'invalid_target';
  END IF;

  -- idempotent: return existing active unlock
  SELECT id INTO v_existing
  FROM public.feature_unlocks
  WHERE user_id = v_user
    AND feature_key = 'unlock_contact'
    AND target_id = _target_id
    AND is_active = true
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('unlock', v_existing, 'already_unlocked', true);
  END IF;

  SELECT * INTO v_quota FROM public.subscription_quotas WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_subscription';
  END IF;

  IF (v_quota.unlocks_total - v_quota.unlocks_used) <= 0 THEN
    RAISE EXCEPTION 'no_unlocks_remaining';
  END IF;

  UPDATE public.subscription_quotas
     SET unlocks_used = unlocks_used + 1,
         updated_at = now()
   WHERE user_id = v_user;

  INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, credits_spent, is_active, metadata)
  VALUES (v_user, 'unlock_contact', _target_type, _target_id, 0, true,
          jsonb_build_object('source','subscription_quota'))
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('unlock', v_new_id, 'already_unlocked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_contact_with_quota(text, uuid) TO authenticated;