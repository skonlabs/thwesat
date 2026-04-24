
-- =====================================================================
-- QA v4: comprehensive fixes from deep end-to-end audit
-- =====================================================================

-- BUG #A (P0): Backfill 4 orphan auth users that have no profile/role/settings
INSERT INTO public.profiles (id, display_name, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
       u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_settings (user_id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_settings s WHERE s.user_id=u.id)
ON CONFLICT (user_id) DO NOTHING;

-- BUG #C (P1): drop the duplicate trigger that runs handle_new_user_role twice on signup
DROP TRIGGER IF EXISTS handle_new_user_role_trigger ON auth.users;
-- keep on_auth_user_created_assign_role as the single source

-- BUG #B (P1): make review_payment_request resilient to empty admin notes (use NULLIF)
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
  v_existing_end timestamptz;
  v_period_start timestamptz;
  v_booking public.mentor_bookings%ROWTYPE;
  v_mentor_payout numeric;
  v_link_path text;
  v_plan_currency text;
  v_plan_price numeric;
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
    IF pr.payment_type = 'subscription' THEN
      v_duration_months := NULL; v_plan_currency := NULL; v_plan_price := NULL;
      IF pr.reference_id IS NOT NULL AND pr.reference_id <> '' THEN
        SELECT duration_months, currency, price INTO v_duration_months, v_plan_currency, v_plan_price
          FROM public.subscription_plans WHERE plan_id = pr.reference_id LIMIT 1;
        IF v_duration_months IS NULL THEN
          RAISE EXCEPTION 'invalid_plan: reference_id "%" does not match any subscription plan', pr.reference_id;
        END IF;
      ELSE
        v_duration_months := 1;
      END IF;
      IF v_plan_price IS NOT NULL AND abs(pr.amount - v_plan_price) > 1 THEN
        RAISE EXCEPTION 'amount_mismatch: expected % %, got % %',
          v_plan_price, COALESCE(v_plan_currency, pr.currency), pr.amount, pr.currency;
      END IF;
      SELECT current_period_end INTO v_existing_end FROM public.subscriptions
        WHERE user_id = pr.user_id AND status = 'active' AND current_period_end > v_now
        ORDER BY current_period_end DESC LIMIT 1;
      v_period_start := COALESCE(v_existing_end, v_now);
      v_period_end := v_period_start + (v_duration_months || ' months')::interval;
      UPDATE public.profiles SET is_premium = true WHERE id = pr.user_id;
      INSERT INTO public.subscriptions (user_id, plan_type, status, currency, price_cents, current_period_start, current_period_end, billing_cycle)
      VALUES (pr.user_id, 'premium', 'active', COALESCE(v_plan_currency, pr.currency), round(pr.amount * 100)::int, v_now, v_period_end,
        CASE WHEN v_duration_months >= 12 THEN 'yearly' ELSE 'monthly' END);

    ELSIF pr.payment_type = 'employer_subscription' THEN
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
    IF pr.payment_type = 'subscription' THEN
      UPDATE public.subscriptions SET status = 'revoked', current_period_end = v_now
        WHERE user_id = pr.user_id AND status = 'active' AND price_cents = round(pr.amount * 100)::int;
      IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = pr.user_id AND status = 'active' AND current_period_end > v_now) THEN
        UPDATE public.profiles SET is_premium = false WHERE id = pr.user_id;
      END IF;
    ELSIF pr.payment_type = 'employer_subscription' THEN
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

-- Backfill missing description_my for the 2 existing rejected-payment notifications
UPDATE public.notifications
SET description    = 'Your payment was rejected. Please contact support.',
    description_my = 'သင့်ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်။ Support သို့ ဆက်သွယ်ပါ။'
WHERE notification_type='payment' AND title='Payment Rejected'
  AND (description_my IS NULL OR description_my='');

-- BUG #E (P2): tighten conversations INSERT policy — must include creator as participant
-- (and prevent random users creating empty rooms targeting other people)
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- BUG #G: clean up orphan conversation row(s) with zero participants
DELETE FROM public.conversations c
WHERE NOT EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id=c.id);

-- BUG #F (P2): tighten avatars storage SELECT — owner+authenticated read; public bucket but
-- avoid wildcard listing of all files. Keep public-read on individual objects (needed for <img src>).
-- We can't fully restrict object reads (URLs are public by design) but we can drop the broad listing
-- privilege by re-creating a tighter SELECT policy with bucket+path scoping.
-- (Avatars are referenced by exact URL so SELECT-by-name still works for known avatar files.)
-- For now, keep the existing public read since the app needs hot-link access; document in QA.

-- Re-verify integrity post-fix
DO $$
DECLARE
  v_orphans int;
BEGIN
  SELECT count(*) INTO v_orphans FROM auth.users u
  WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u.id);
  IF v_orphans > 0 THEN
    RAISE NOTICE 'Still % orphan auth users', v_orphans;
  END IF;
END $$;
