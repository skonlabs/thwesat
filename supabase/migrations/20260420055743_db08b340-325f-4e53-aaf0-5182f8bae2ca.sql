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
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_is_admin := public.has_role(v_caller, 'admin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'not_authorized: only admins can review payments';
  END IF;

  IF _new_status NOT IN ('approved','rejected','revoked') THEN
    RAISE EXCEPTION 'invalid_status: must be approved, rejected, or revoked';
  END IF;

  SELECT * INTO pr FROM public.payment_requests WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF pr.status = _new_status THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'status', pr.status);
  END IF;

  IF pr.status = 'revoked' THEN
    RAISE EXCEPTION 'invalid_transition: revoked is terminal';
  END IF;

  IF _new_status = 'revoked' AND pr.status <> 'approved' THEN
    RAISE EXCEPTION 'invalid_transition: only approved payments can be revoked';
  END IF;

  v_link_path := CASE pr.payment_type
    WHEN 'employer_subscription' THEN '/employer/dashboard'
    WHEN 'mentor_session' THEN '/mentor/bookings'
    ELSE '/premium'
  END;

  IF _new_status = 'approved' THEN

    IF pr.payment_type = 'subscription' THEN
      v_duration_months := 1;
      v_plan_currency := NULL;
      v_plan_price := NULL;
      IF pr.reference_id IS NOT NULL THEN
        SELECT duration_months, currency, price
          INTO v_duration_months, v_plan_currency, v_plan_price
          FROM public.subscription_plans
          WHERE plan_id = pr.reference_id
          LIMIT 1;
        IF v_duration_months IS NULL THEN v_duration_months := 1; END IF;
      END IF;

      IF v_plan_price IS NOT NULL AND abs(pr.amount - v_plan_price) > 1 THEN
        RAISE EXCEPTION 'amount_mismatch: expected % %, got % %',
          v_plan_price, COALESCE(v_plan_currency, pr.currency), pr.amount, pr.currency;
      END IF;

      SELECT current_period_end INTO v_existing_end
        FROM public.subscriptions
        WHERE user_id = pr.user_id
          AND status = 'active'
          AND current_period_end > v_now
        ORDER BY current_period_end DESC
        LIMIT 1;

      v_period_start := COALESCE(v_existing_end, v_now);
      v_period_end := v_period_start + (v_duration_months || ' months')::interval;

      UPDATE public.profiles SET is_premium = true WHERE id = pr.user_id;

      -- FIX: subscriptions.plan_type CHECK only allows 'free','premium','employer_*'.
      -- Always store 'premium' for jobseeker/mentor subscriptions; duration is captured by current_period_end.
      INSERT INTO public.subscriptions (
        user_id, plan_type, status, currency, price_cents,
        current_period_start, current_period_end, billing_cycle
      ) VALUES (
        pr.user_id,
        'premium',
        'active',
        COALESCE(v_plan_currency, pr.currency),
        round(pr.amount * 100)::int,
        v_now,
        v_period_end,
        CASE WHEN v_duration_months >= 12 THEN 'yearly' ELSE 'monthly' END
      );

    ELSIF pr.payment_type = 'employer_subscription' THEN
      v_duration_months := 12;
      v_period_end := v_now + (v_duration_months || ' months')::interval;

      UPDATE public.employer_profiles
        SET subscription_tier = COALESCE(pr.reference_id, 'basic'),
            subscription_expires_at = v_period_end
        WHERE id = pr.user_id;

      -- For employers, reference_id is e.g. 'employer_basic' / 'employer_standard' / 'employer_premium'
      -- which IS permitted by the check constraint, so we keep it.
      INSERT INTO public.subscriptions (
        user_id, plan_type, status, currency, price_cents,
        current_period_start, current_period_end, billing_cycle
      ) VALUES (
        pr.user_id,
        COALESCE(pr.reference_id, 'employer_basic'),
        'active',
        pr.currency,
        round(pr.amount * 100)::int,
        v_now,
        v_period_end,
        'yearly'
      );

    ELSIF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      SELECT * INTO v_booking FROM public.mentor_bookings WHERE id = pr.booking_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.mentor_bookings
          SET payment_status = 'paid'
          WHERE id = pr.booking_id;

        v_mentor_payout := round((pr.amount * 0.85)::numeric, 2);
        INSERT INTO public.mentor_earnings (
          mentor_id, booking_id, amount, currency, status
        ) VALUES (
          v_booking.mentor_id, pr.booking_id, v_mentor_payout, pr.currency, 'pending'
        );
      END IF;
    END IF;

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      pr.user_id, 'payment',
      'Payment Approved', 'ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ',
      'Your ' || pr.amount || ' ' || pr.currency || ' payment has been approved.',
      'သင့်ငွေပေးချေမှု ' || pr.amount || ' ' || pr.currency || ' ကို အတည်ပြုပြီးပါပြီ။',
      v_link_path
    );

  ELSIF _new_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      pr.user_id, 'payment',
      'Payment Rejected', 'ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်',
      COALESCE(_admin_note, 'Your payment was rejected. Please contact support.'),
      COALESCE(_admin_note, 'သင့်ငွေပေးချေမှု ငြင်းပယ်ခံရပါသည်။ Support သို့ ဆက်သွယ်ပါ။'),
      v_link_path
    );

  ELSIF _new_status = 'revoked' THEN
    -- Reverse approval side-effects
    IF pr.payment_type = 'subscription' THEN
      UPDATE public.subscriptions
        SET status = 'revoked', current_period_end = v_now
        WHERE user_id = pr.user_id
          AND status = 'active'
          AND price_cents = round(pr.amount * 100)::int;

      IF NOT EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = pr.user_id AND status = 'active' AND current_period_end > v_now
      ) THEN
        UPDATE public.profiles SET is_premium = false WHERE id = pr.user_id;
      END IF;

    ELSIF pr.payment_type = 'employer_subscription' THEN
      UPDATE public.employer_profiles
        SET subscription_tier = NULL, subscription_expires_at = NULL
        WHERE id = pr.user_id;
      UPDATE public.subscriptions
        SET status = 'revoked', current_period_end = v_now
        WHERE user_id = pr.user_id AND status = 'active';

    ELSIF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      UPDATE public.mentor_bookings SET payment_status = 'unpaid' WHERE id = pr.booking_id;
      DELETE FROM public.mentor_earnings WHERE booking_id = pr.booking_id AND status = 'pending';
    END IF;

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      pr.user_id, 'payment',
      'Payment Revoked', 'ငွေပေးချေမှု ပယ်ဖျက်ပြီးပါပြီ',
      'Your previously approved payment has been revoked.',
      'ယခင် အတည်ပြုထားသော ငွေပေးချေမှု ပယ်ဖျက်ပြီးပါပြီ။',
      v_link_path
    );
  END IF;

  UPDATE public.payment_requests
    SET status = _new_status,
        admin_note = COALESCE(_admin_note, admin_note),
        reviewed_by = v_caller,
        reviewed_at = v_now,
        updated_at = v_now
    WHERE id = _payment_id;

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END;
$function$;