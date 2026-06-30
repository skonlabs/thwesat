CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(_request_type text, _plan_id uuid, _addon_id uuid, _quantity integer, _mmk_amount numeric, _payment_method text, _proof_url text, _sender_reference text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_expected numeric;
  v_id uuid;
  v_scope text;
  v_is_employer boolean;
  v_is_agent boolean;
  v_is_jobseeker boolean;
  v_is_mentor boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _request_type NOT IN ('subscription','addon') THEN RAISE EXCEPTION 'invalid_request_type'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN _quantity := 1; END IF;

  v_is_employer  := public.has_role(v_user, 'employer'::public.app_role);
  v_is_agent     := public.has_role(v_user, 'agent'::public.app_role);
  v_is_jobseeker := public.has_role(v_user, 'job_seeker'::public.app_role);
  v_is_mentor    := public.has_role(v_user, 'mentor'::public.app_role);

  IF _request_type = 'subscription' THEN
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_required'; END IF;
    SELECT price_mmk INTO v_expected
      FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;
    IF _mmk_amount <> v_expected THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    -- Plans are scope-agnostic now; require buyer to be employer or agent.
    IF NOT (v_is_employer OR v_is_agent) THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    END IF;

    IF _payment_method = 'free_trial' AND v_expected <> 0 THEN
      RAISE EXCEPTION 'free_trial_not_allowed';
    END IF;
    IF v_expected = 0 AND _payment_method <> 'free_trial' THEN
      RAISE EXCEPTION 'invalid_method_for_free_plan';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND plan_id = _plan_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  ELSE
    IF _addon_id IS NULL THEN RAISE EXCEPTION 'addon_required'; END IF;
    SELECT mmk, role_scope INTO v_expected, v_scope
      FROM public.addon_products WHERE id = _addon_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'addon_not_found'; END IF;
    IF _mmk_amount <> (v_expected * _quantity) THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    IF v_scope = 'employer' AND NOT v_is_employer THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'recruiting_agent' AND NOT v_is_agent THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope IN ('jobseeker','job_seeker') AND NOT v_is_jobseeker THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    ELSIF v_scope = 'mentor' AND NOT v_is_mentor THEN
      RAISE EXCEPTION 'role_scope_mismatch' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND addon_id = _addon_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  END IF;

  INSERT INTO public.subscription_payment_requests(
    user_id, request_type, plan_id, addon_id, quantity, mmk_amount,
    payment_method, proof_url, sender_reference, status
  ) VALUES (
    v_user, _request_type, _plan_id, _addon_id, _quantity, _mmk_amount,
    _payment_method, _proof_url, _sender_reference, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;