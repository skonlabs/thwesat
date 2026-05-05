
DROP TABLE IF EXISTS public.subscriptions CASCADE;

DELETE FROM public.payment_requests
WHERE payment_type IN ('subscription','employer_subscription');

DROP VIEW IF EXISTS public.employer_profiles_public;

ALTER TABLE public.employer_profiles
  DROP COLUMN IF EXISTS subscription_tier,
  DROP COLUMN IF EXISTS subscription_expires_at;

CREATE VIEW public.employer_profiles_public AS
SELECT id,
    company_name,
    company_description,
    company_website,
    company_linkedin,
    industry,
    company_size,
    hq_country,
    payment_methods,
    is_verified,
    verification_status,
    created_at,
    updated_at,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_name ELSE NULL::text END AS contact_name,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_email ELSE NULL::text END AS contact_email,
    CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN contact_phone ELSE NULL::text END AS contact_phone
FROM public.employer_profiles;

CREATE OR REPLACE FUNCTION public.review_payment_request(_payment_id uuid, _new_status text, _admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END;
$function$;
