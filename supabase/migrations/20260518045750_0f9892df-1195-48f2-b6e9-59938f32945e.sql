
CREATE OR REPLACE FUNCTION public.wallet_topup_approve(_topup_id uuid, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t public.topup_requests%ROWTYPE;
  v_caller uuid := auth.uid();
  v_tx uuid;
  v_total_credits bigint;
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO t FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF t.status = 'approved' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.topup_requests
     SET status='approved', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note)
   WHERE id=_topup_id;

  v_total_credits := t.credits_to_grant;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, mmk_amount, status, ref_type, ref_id, note, created_by)
  VALUES (t.user_id, 'topup', v_total_credits, t.mmk_amount, 'completed', 'topup_request', _topup_id, _admin_note, v_caller)
  RETURNING id INTO v_tx;

  PERFORM public._wallet_apply(t.user_id, v_total_credits, t.mmk_amount);

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'topup_approved', 'topup_request', _topup_id::text,
          jsonb_build_object('mmk_amount', t.mmk_amount, 'credits', v_total_credits, 'tx', v_tx));
  RETURN jsonb_build_object('ok', true, 'tx', v_tx, 'credits', v_total_credits);
END $function$;

CREATE OR REPLACE FUNCTION public.wallet_topup_reject(_topup_id uuid, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t public.topup_requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'partner'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO t FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF t.status = 'rejected' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF t.status <> 'pending' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.topup_requests
     SET status='rejected', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note)
   WHERE id=_topup_id;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'topup_rejected', 'topup_request', _topup_id::text,
          jsonb_build_object('mmk_amount', t.mmk_amount, 'note', _admin_note));
  RETURN jsonb_build_object('ok', true);
END $function$;
