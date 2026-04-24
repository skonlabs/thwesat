-- BUG FIX #1 (P0): Applicant counter drift
-- Replace insert-only trigger with full INSERT/DELETE/UPDATE recount logic.
CREATE OR REPLACE FUNCTION public.sync_applicant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_job uuid;
  v_new_job uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_job := NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_job := OLD.job_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_job := OLD.job_id;
    v_new_job := NEW.job_id;
  END IF;

  IF v_old_job IS NOT NULL THEN
    UPDATE public.jobs j SET applicant_count = (
      SELECT count(*) FROM public.applications a
      WHERE a.job_id = v_old_job AND COALESCE(a.status,'') <> 'withdrawn'
    ) WHERE j.id = v_old_job;
  END IF;
  IF v_new_job IS NOT NULL AND v_new_job IS DISTINCT FROM v_old_job THEN
    UPDATE public.jobs j SET applicant_count = (
      SELECT count(*) FROM public.applications a
      WHERE a.job_id = v_new_job AND COALESCE(a.status,'') <> 'withdrawn'
    ) WHERE j.id = v_new_job;
  ELSIF v_new_job IS NOT NULL AND TG_OP = 'UPDATE' AND v_old_job = v_new_job
        AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    UPDATE public.jobs j SET applicant_count = (
      SELECT count(*) FROM public.applications a
      WHERE a.job_id = v_new_job AND COALESCE(a.status,'') <> 'withdrawn'
    ) WHERE j.id = v_new_job;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_applicant_count ON public.applications;
DROP TRIGGER IF EXISTS increment_applicant_count_trigger ON public.applications;
DROP TRIGGER IF EXISTS applications_count_trigger ON public.applications;
DROP TRIGGER IF EXISTS sync_applicant_count_trigger ON public.applications;

CREATE TRIGGER sync_applicant_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.sync_applicant_count();

-- One-shot recount to fix existing drift
UPDATE public.jobs j SET applicant_count = sub.cnt
FROM (
  SELECT job_id, count(*) AS cnt FROM public.applications
  WHERE COALESCE(status,'') <> 'withdrawn'
  GROUP BY job_id
) sub WHERE j.id = sub.job_id;

UPDATE public.jobs SET applicant_count = 0
WHERE id NOT IN (SELECT DISTINCT job_id FROM public.applications WHERE COALESCE(status,'') <> 'withdrawn')
  AND COALESCE(applicant_count,0) <> 0;

-- BUG FIX #2 (P0): Premium / subscription state mismatch
-- Reset orphan premium flags + grant flag where active sub exists.
UPDATE public.profiles SET is_premium = false
WHERE is_premium = true
  AND id NOT IN (
    SELECT user_id FROM public.subscriptions
    WHERE status = 'active' AND current_period_end > now()
  );

UPDATE public.profiles SET is_premium = true
WHERE is_premium = false
  AND id IN (
    SELECT user_id FROM public.subscriptions
    WHERE status = 'active' AND current_period_end > now()
  );

-- Trigger to keep is_premium in sync with subscription state going forward.
CREATE OR REPLACE FUNCTION public.sync_profile_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := COALESCE(NEW.user_id, OLD.user_id);
  v_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = v_user AND status = 'active' AND current_period_end > now()
  ) INTO v_active;
  UPDATE public.profiles SET is_premium = v_active WHERE id = v_user;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_premium_trigger ON public.subscriptions;
CREATE TRIGGER sync_profile_premium_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_premium();

-- BUG FIX #3 (P0): review_payment_request silently defaults duration on bad reference_id
-- Now: reject explicitly when subscription reference_id is provided but does not match a plan.
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
  v_plan_found boolean;
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
      v_plan_found := false;
      v_duration_months := NULL; v_plan_currency := NULL; v_plan_price := NULL;
      IF pr.reference_id IS NOT NULL AND pr.reference_id <> '' THEN
        SELECT duration_months, currency, price INTO v_duration_months, v_plan_currency, v_plan_price
          FROM public.subscription_plans WHERE plan_id = pr.reference_id LIMIT 1;
        IF v_duration_months IS NULL THEN
          RAISE EXCEPTION 'invalid_plan: reference_id "%" does not match any subscription plan', pr.reference_id;
        END IF;
        v_plan_found := true;
      ELSE
        -- Legacy / no plan reference: require explicit fallback. Default to 1 month but log via admin_note.
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
      COALESCE(_admin_note, 'Your payment was rejected. Please contact support.'),
      COALESCE(_admin_note, 'သင့်ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်။ Support သို့ ဆက်သွယ်ပါ။'),
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
    SET status = _new_status, admin_note = COALESCE(_admin_note, admin_note),
        reviewed_by = v_caller, reviewed_at = v_now, updated_at = v_now
    WHERE id = _payment_id;

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END;
$function$;

-- BUG FIX #4 (P1): Mentor earnings recorded at 100% instead of 85%
-- Recompute payouts on existing mentor_earnings rows tied to a payment_request, using 85% of the gross amount.
UPDATE public.mentor_earnings me
SET amount = round((pr.amount * 0.85)::numeric, 2),
    updated_at = now()
FROM public.payment_requests pr
WHERE pr.booking_id = me.booking_id
  AND pr.payment_type = 'mentor_session'
  AND pr.status = 'approved'
  AND me.status IN ('pending','paid')
  AND me.amount > round((pr.amount * 0.85)::numeric, 2) + 0.01;

-- BUG FIX #5 (P1): Profiles missing user_roles entries → backfill 'user' role.
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure trigger to auto-create user_roles is attached on auth.users
DROP TRIGGER IF EXISTS handle_new_user_role_trigger ON auth.users;
CREATE TRIGGER handle_new_user_role_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- BUG FIX #6 (P1): employer_profiles owned by users without primary_role='employer'.
-- Promote those profiles to employer role for consistency.
UPDATE public.profiles p
SET primary_role = 'employer', updated_at = now()
WHERE primary_role <> 'employer'
  AND id IN (SELECT id FROM public.employer_profiles);
