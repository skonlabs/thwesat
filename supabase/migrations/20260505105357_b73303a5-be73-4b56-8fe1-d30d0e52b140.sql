-- 1. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER functions can write.

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action, created_at DESC);

-- 2. Lock down set_user_role: admin-only (or self granting 'user' role only)
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Allow admins to grant any role; allow a user to (re)assert the base 'user' role on themselves only.
  IF NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT (v_caller = _user_id AND _role = 'user'::app_role) THEN
    RAISE EXCEPTION 'not_authorized: only admins can assign roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF public.has_role(v_caller, 'admin'::app_role) AND v_caller <> _user_id THEN
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
    VALUES (v_caller, 'role_grant', 'user', _user_id::text, jsonb_build_object('role', _role));
  END IF;
END;
$function$;

-- Companion: revoke role (admin only) + audit
CREATE OR REPLACE FUNCTION public.revoke_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_caller = _user_id AND _role = 'admin'::app_role THEN
    RAISE EXCEPTION 'cannot_revoke_own_admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'role_revoke', 'user', _user_id::text, jsonb_build_object('role', _role));
END;
$function$;

-- 3. Recreate views with security_invoker so caller RLS is enforced
DROP VIEW IF EXISTS public.v_active_unlocks;
CREATE VIEW public.v_active_unlocks
WITH (security_invoker=on) AS
  SELECT user_id, feature_key, target_id, target_type, expires_at, starts_at, transaction_id
  FROM public.feature_unlocks
  WHERE is_active = true AND (expires_at IS NULL OR expires_at > now());

DROP VIEW IF EXISTS public.employer_profiles_public;
CREATE VIEW public.employer_profiles_public
WITH (security_invoker=on) AS
  SELECT id, company_name, company_description, company_website, company_linkedin,
         industry, company_size, hq_country, payment_methods, is_verified,
         verification_status, created_at, updated_at,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_name ELSE NULL END AS contact_name,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_email ELSE NULL END AS contact_email,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_phone ELSE NULL END AS contact_phone
  FROM public.employer_profiles;

-- 4. Audit existing admin functions (re-create with audit_log inserts)
CREATE OR REPLACE FUNCTION public.wallet_topup_approve(_topup_id uuid, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.topup_requests%ROWTYPE; v_tx uuid; v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',r.status); END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, credits, mmk_amount, status, ref_type, ref_id, idempotency_key, note, created_by)
  VALUES (r.user_id, 'topup', r.credits_to_grant, r.mmk_amount, 'completed', 'topup_request', r.id::text,
          'topup:' || r.id::text, _admin_note, v_caller)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(r.user_id, r.credits_to_grant, r.mmk_amount);
  UPDATE public.topup_requests SET status='approved', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note) WHERE id=_topup_id;

  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (r.user_id,'payment','Top-up approved','ငွေဖြည့်မှု အတည်ပြုပြီး',
          r.credits_to_grant || ' credits added to your wallet.',
          r.credits_to_grant || ' credits ပိုက်ဆံအိတ်သို့ ထည့်ပြီးပါပြီ။','/wallet');

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'wallet_topup_approve', 'topup_request', _topup_id::text,
          jsonb_build_object('user_id', r.user_id, 'credits', r.credits_to_grant, 'mmk', r.mmk_amount, 'tx', v_tx, 'note', _admin_note));
  RETURN jsonb_build_object('ok',true,'tx',v_tx);
END; $function$;

CREATE OR REPLACE FUNCTION public.wallet_topup_reject(_topup_id uuid, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.topup_requests%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.topup_requests WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'topup_not_found'; END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',true,'noop',true,'status',r.status); END IF;
  UPDATE public.topup_requests SET status='rejected', reviewed_by=v_caller, reviewed_at=now(), admin_note=COALESCE(_admin_note, admin_note) WHERE id=_topup_id;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (r.user_id,'payment','Top-up rejected','ငွေဖြည့်မှု ငြင်းပယ်ခံရပါသည်',
          COALESCE(_admin_note,'Please contact support.'), COALESCE(_admin_note,'Support သို့ ဆက်သွယ်ပါ။'),'/wallet');
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'wallet_topup_reject', 'topup_request', _topup_id::text,
          jsonb_build_object('user_id', r.user_id, 'note', _admin_note));
  RETURN jsonb_build_object('ok',true);
END; $function$;

CREATE OR REPLACE FUNCTION public.wallet_adjust(_user_id uuid, _delta bigint, _note text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_caller uuid := auth.uid(); v_tx uuid;
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'zero_delta'; END IF;
  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, note, created_by)
  VALUES (_user_id,'adjustment',_delta,'completed','adjustment',_note,v_caller) RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(_user_id, _delta, 0);
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'wallet_adjust', 'user', _user_id::text,
          jsonb_build_object('delta', _delta, 'note', _note, 'tx', v_tx));
  RETURN jsonb_build_object('ok',true,'tx',v_tx);
END; $function$;

CREATE OR REPLACE FUNCTION public.wallet_refund_transaction(_tx_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.wallet_transactions%ROWTYPE; v_caller uuid := auth.uid(); v_new uuid;
BEGIN
  IF NOT public.has_role(v_caller,'admin'::app_role) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.wallet_transactions WHERE id = _tx_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tx_not_found'; END IF;
  IF r.status = 'reversed' THEN RAISE EXCEPTION 'already_reversed'; END IF;
  IF r.kind NOT IN ('spend','earning') THEN RAISE EXCEPTION 'cannot_refund_kind: %', r.kind; END IF;
  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by, metadata)
  VALUES (r.user_id,'refund',-r.credits,'completed','refund',r.id::text, _reason, v_caller, jsonb_build_object('original_tx',r.id))
  RETURNING id INTO v_new;
  PERFORM public._wallet_apply(r.user_id, -r.credits, 0);
  UPDATE public.wallet_transactions SET status='reversed' WHERE id = r.id;
  UPDATE public.feature_unlocks SET is_active=false WHERE transaction_id = r.id;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'wallet_refund', 'transaction', _tx_id::text,
          jsonb_build_object('user_id', r.user_id, 'credits', r.credits, 'reason', _reason, 'refund_tx', v_new));
  RETURN jsonb_build_object('ok',true,'refund_tx',v_new);
END; $function$;

CREATE OR REPLACE FUNCTION public.review_payment_request(_payment_id uuid, _new_status text, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  pr public.payment_requests%ROWTYPE;
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_now timestamptz := now();
  v_booking public.mentor_bookings%ROWTYPE;
  v_mentor_payout numeric;
  v_link_path text;
  v_note text := NULLIF(trim(coalesce(_admin_note,'')), '');
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_is_admin := public.has_role(v_caller, 'admin'::app_role);
  IF NOT v_is_admin THEN RAISE EXCEPTION 'not_authorized: only admins can review payments'; END IF;
  IF _new_status NOT IN ('approved','rejected','revoked') THEN
    RAISE EXCEPTION 'invalid_status: must be approved, rejected, or revoked';
  END IF;
  SELECT * INTO pr FROM public.payment_requests WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF pr.status = _new_status THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'status', pr.status);
  END IF;
  IF pr.status = 'revoked' THEN RAISE EXCEPTION 'invalid_transition: revoked is terminal'; END IF;
  IF _new_status = 'revoked' AND pr.status <> 'approved' THEN
    RAISE EXCEPTION 'invalid_transition: only approved payments can be revoked';
  END IF;

  v_link_path := CASE pr.payment_type
    WHEN 'placement_fee' THEN '/employer/finance'
    WHEN 'mentor_session' THEN '/mentors/bookings'
    ELSE '/finance'
  END;

  IF _new_status = 'approved' THEN
    IF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      SELECT * INTO v_booking FROM public.mentor_bookings WHERE id = pr.booking_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.mentor_bookings SET payment_status = 'paid' WHERE id = pr.booking_id;
        v_mentor_payout := round((pr.amount * 0.85)::numeric, 2);
        INSERT INTO public.mentor_earnings (mentor_id, booking_id, amount, currency, status)
        VALUES (v_booking.mentor_id, pr.booking_id, v_mentor_payout, pr.currency, 'pending');
      END IF;
    END IF;
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (pr.user_id, 'payment',
      'Payment Approved', 'ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ',
      'Your ' || pr.amount || ' ' || pr.currency || ' payment has been approved.',
      'သင့်ငွေပေးချေမှု ' || pr.amount || ' ' || pr.currency || ' ကို အတည်ပြုပြီးပါပြီ။',
      v_link_path);
  ELSIF _new_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (pr.user_id, 'payment',
      'Payment Rejected', 'ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်',
      COALESCE(v_note, 'Your payment was rejected. Please contact support.'),
      COALESCE(v_note, 'သင့်ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်။ Support သို့ ဆက်သွယ်ပါ။'),
      v_link_path);
  ELSIF _new_status = 'revoked' THEN
    IF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      UPDATE public.mentor_bookings SET payment_status = 'unpaid' WHERE id = pr.booking_id;
      DELETE FROM public.mentor_earnings WHERE booking_id = pr.booking_id AND status = 'pending';
    END IF;
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (pr.user_id, 'payment',
      'Payment Revoked', 'ငွေပေးချေမှု ပယ်ဖျက်ပြီးပါပြီ',
      'Your previously approved payment has been revoked.',
      'ယခင် အတည်ပြုထားသော ငွေပေးချေမှု ပယ်ဖျက်ပြီးပါပြီ။',
      v_link_path);
  END IF;

  UPDATE public.payment_requests
    SET status = _new_status, admin_note = COALESCE(v_note, admin_note),
        reviewed_by = v_caller, reviewed_at = v_now, updated_at = v_now
    WHERE id = _payment_id;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'payment_review', 'payment_request', _payment_id::text,
          jsonb_build_object('status', _new_status, 'amount', pr.amount, 'currency', pr.currency, 'user_id', pr.user_id, 'note', v_note));

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END;
$function$;