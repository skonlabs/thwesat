
-- ============================================================
-- PA: Audited RPCs for partner admin actions
-- ============================================================

-- 1) Attribute a user to a partner (audited)
CREATE OR REPLACE FUNCTION public.admin_attribute_user(
  _partner_id uuid,
  _user_id uuid,
  _channel text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_partner_name text;
BEGIN
  IF NOT (public.has_role(v_actor, 'admin') OR public.has_role(v_actor, 'moderator')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT name INTO v_partner_name FROM public.partners WHERE id = _partner_id;
  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'partner_not_found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF _channel NOT IN ('manual','referral','import','campaign') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  INSERT INTO public.partner_attributions (partner_id, user_id, channel, created_by)
  VALUES (_partner_id, _user_id, _channel, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_attribute_user', 'partner', _partner_id,
    jsonb_build_object('user_id', _user_id, 'channel', _channel, 'attribution_id', v_id, 'partner_name', v_partner_name));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_attribute_user(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_attribute_user(uuid, uuid, text) TO authenticated;

-- 2) Link partner record to user account (audited)
CREATE OR REPLACE FUNCTION public.admin_link_partner_user(
  _partner_id uuid,
  _user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing_partner uuid;
  v_partner_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT name INTO v_partner_name FROM public.partners WHERE id = _partner_id;
  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'partner_not_found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  SELECT id INTO v_existing_partner FROM public.partners
   WHERE user_id = _user_id AND id <> _partner_id LIMIT 1;
  IF v_existing_partner IS NOT NULL THEN
    RAISE EXCEPTION 'user_already_linked_to_partner';
  END IF;

  UPDATE public.partners SET user_id = _user_id, updated_at = now() WHERE id = _partner_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_link_user', 'partner', _partner_id,
    jsonb_build_object('user_id', _user_id, 'partner_name', v_partner_name));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_partner_user(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_partner_user(uuid, uuid) TO authenticated;

-- 3) Unlink partner record (audited)
CREATE OR REPLACE FUNCTION public.admin_unlink_partner_user(
  _partner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prev_user uuid;
  v_partner_name text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT user_id, name INTO v_prev_user, v_partner_name FROM public.partners WHERE id = _partner_id;
  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'partner_not_found';
  END IF;

  UPDATE public.partners SET user_id = NULL, updated_at = now() WHERE id = _partner_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_unlink_user', 'partner', _partner_id,
    jsonb_build_object('previous_user_id', v_prev_user, 'partner_name', v_partner_name));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unlink_partner_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_unlink_partner_user(uuid) TO authenticated;

-- 4) Create partner (audited, code-unique guarded)
CREATE OR REPLACE FUNCTION public.admin_create_partner(
  _name text,
  _code text,
  _contact_email text DEFAULT NULL,
  _contract_start_date date DEFAULT current_date,
  _user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_norm_code text := upper(trim(_code));
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF coalesce(trim(_name), '') = '' THEN RAISE EXCEPTION 'name_required'; END IF;
  IF coalesce(v_norm_code, '') = '' THEN RAISE EXCEPTION 'code_required'; END IF;
  IF v_norm_code !~ '^[A-Z0-9_-]{2,32}$' THEN RAISE EXCEPTION 'invalid_code_format'; END IF;

  IF EXISTS (SELECT 1 FROM public.partners WHERE upper(code) = v_norm_code) THEN
    RAISE EXCEPTION 'duplicate_code';
  END IF;

  IF _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.partners WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'user_already_linked_to_partner';
  END IF;

  INSERT INTO public.partners (name, code, contact_email, contract_start_date, user_id)
  VALUES (trim(_name), v_norm_code, nullif(trim(coalesce(_contact_email,'')),''), _contract_start_date, _user_id)
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_create', 'partner', v_id,
    jsonb_build_object('name', _name, 'code', v_norm_code, 'linked_user_id', _user_id));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_partner(text, text, text, date, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_partner(text, text, text, date, uuid) TO authenticated;

-- 5) Record payment reversal (audited, validated)
CREATE OR REPLACE FUNCTION public.admin_record_payment_reversal(
  _payment_request_id uuid,
  _reversal_type text,
  _amount numeric,
  _npr_amount numeric DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_pay_amount numeric;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _reversal_type NOT IN ('refund','chargeback','reversal','unpaid','fraud_writeoff') THEN
    RAISE EXCEPTION 'invalid_reversal_type';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;

  IF _npr_amount IS NOT NULL AND _npr_amount < 0 THEN
    RAISE EXCEPTION 'npr_amount_invalid';
  END IF;

  SELECT amount INTO v_pay_amount FROM public.payment_requests WHERE id = _payment_request_id;
  IF v_pay_amount IS NULL THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF _amount > v_pay_amount THEN
    RAISE EXCEPTION 'amount_exceeds_payment';
  END IF;

  INSERT INTO public.payment_reversals (payment_request_id, reversal_type, amount, npr_amount, reason, created_by)
  VALUES (_payment_request_id, _reversal_type, _amount, _npr_amount, _reason, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'payment_reversal_record', 'payment_request', _payment_request_id,
    jsonb_build_object('reversal_id', v_id, 'type', _reversal_type, 'amount', _amount, 'npr_amount', _npr_amount, 'reason', _reason));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_payment_reversal(uuid, text, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_payment_reversal(uuid, text, numeric, numeric, text) TO authenticated;

-- 6) current_partner — returns caller's own partner record (PB-7)
CREATE OR REPLACE FUNCTION public.current_partner()
RETURNS SETOF public.partners
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_partner() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_partner() TO authenticated;
