DELETE FROM public.subscriptions WHERE plan_type IN ('premium', 'referral_reward', 'basic');
DELETE FROM public.payment_requests WHERE payment_type = 'subscription';
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

DROP VIEW IF EXISTS public.profiles_public CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_premium;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT id, display_name, avatar_url, headline, bio, location, website, primary_role,
       skills, languages, experience, visibility, remote_ready, has_laptop, internet_stable,
       has_wise, has_payoneer, has_upwork, referral_code, preferred_work_types, role_title,
       last_seen_at, created_at, updated_at,
       CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN email ELSE NULL::text END AS email,
       CASE WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN phone ELSE NULL::text END AS phone
FROM public.profiles;

DROP FUNCTION IF EXISTS public.sync_profile_premium() CASCADE;
DROP FUNCTION IF EXISTS public.expire_referral_premium() CASCADE;

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
  v_duration_months int;
  v_period_end timestamptz;
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
    WHEN 'employer_subscription' THEN '/employer/finance'
    WHEN 'placement_fee' THEN '/employer/finance'
    WHEN 'mentor_session' THEN '/mentors/bookings'
    ELSE '/finance'
  END;

  IF _new_status = 'approved' THEN
    IF pr.payment_type = 'employer_subscription' THEN
      v_duration_months := 12;
      v_period_end := v_now + (v_duration_months || ' months')::interval;
      UPDATE public.employer_profiles SET subscription_tier = COALESCE(pr.reference_id, 'basic'), subscription_expires_at = v_period_end WHERE id = pr.user_id;
      INSERT INTO public.subscriptions (user_id, plan_type, status, currency, price_cents, current_period_start, current_period_end, billing_cycle)
      VALUES (pr.user_id, COALESCE(pr.reference_id, 'employer_basic'), 'active', pr.currency, round(pr.amount * 100)::int, v_now, v_period_end, 'yearly');

    ELSIF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      SELECT * INTO v_booking FROM public.mentor_bookings WHERE id = pr.booking_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.mentor_bookings SET payment_status = 'paid' WHERE id = pr.booking_id;
        v_mentor_payout := round((pr.amount * 0.85)::numeric, 2);
        INSERT INTO public.mentor_earnings (mentor_id, booking_id, amount, currency, status)
        VALUES (v_booking.mentor_id, pr.booking_id, v_mentor_payout, pr.currency, 'pending');
      END IF;

    ELSIF pr.payment_type = 'placement_fee' THEN
      NULL;
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
    IF pr.payment_type = 'employer_subscription' THEN
      UPDATE public.employer_profiles SET subscription_tier = NULL, subscription_expires_at = NULL WHERE id = pr.user_id;
      UPDATE public.subscriptions SET status = 'revoked', current_period_end = v_now WHERE user_id = pr.user_id AND status = 'active';
    ELSIF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
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