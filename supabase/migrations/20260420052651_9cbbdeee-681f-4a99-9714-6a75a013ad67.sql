-- ========== PAYMENT SYSTEM HARDENING ==========

-- 1. Add 'revoked' as a valid status (no enum, just doc)
-- 2. Add CHECK constraints on payment_requests
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_amount_positive,
  DROP CONSTRAINT IF EXISTS payment_requests_status_valid,
  DROP CONSTRAINT IF EXISTS payment_requests_type_valid,
  DROP CONSTRAINT IF EXISTS payment_requests_method_valid;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT payment_requests_status_valid CHECK (status IN ('pending','approved','rejected','revoked')),
  ADD CONSTRAINT payment_requests_type_valid CHECK (payment_type IN ('subscription','employer_subscription','mentor_session')),
  ADD CONSTRAINT payment_requests_method_valid CHECK (payment_method IN ('kbzpay','wave','promptpay','wise','payoneer'));

-- 3. mentor_bookings.payment_status valid set
ALTER TABLE public.mentor_bookings
  DROP CONSTRAINT IF EXISTS mentor_bookings_payment_status_valid;
ALTER TABLE public.mentor_bookings
  ADD CONSTRAINT mentor_bookings_payment_status_valid CHECK (payment_status IN ('unpaid','pending','paid','refunded'));

-- 4. mentor_earnings: unique per booking (idempotency), valid status
DROP INDEX IF EXISTS idx_mentor_earnings_booking_unique;
CREATE UNIQUE INDEX idx_mentor_earnings_booking_unique
  ON public.mentor_earnings(booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.mentor_earnings
  DROP CONSTRAINT IF EXISTS mentor_earnings_status_valid,
  DROP CONSTRAINT IF EXISTS mentor_earnings_amount_nonneg;
ALTER TABLE public.mentor_earnings
  ADD CONSTRAINT mentor_earnings_status_valid CHECK (status IN ('pending','paid','refunded')),
  ADD CONSTRAINT mentor_earnings_amount_nonneg CHECK (amount >= 0);

-- 5. Subscriptions: status valid
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_valid;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_valid CHECK (status IN ('active','expired','cancelled','revoked'));

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status ON public.payment_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 7. Allow admins to UPDATE mentor_bookings (needed for payment_status updates)
DROP POLICY IF EXISTS "Admins can update bookings" ON public.mentor_bookings;
CREATE POLICY "Admins can update bookings"
  ON public.mentor_bookings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ========== APPROVAL RPC (atomic, idempotent, validates) ==========

CREATE OR REPLACE FUNCTION public.review_payment_request(
  _payment_id uuid,
  _new_status text,
  _admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Auth check
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_is_admin := public.has_role(v_caller, 'admin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'not_authorized: only admins can review payments';
  END IF;

  -- Validate new status
  IF _new_status NOT IN ('approved','rejected','revoked') THEN
    RAISE EXCEPTION 'invalid_status: must be approved, rejected, or revoked';
  END IF;

  -- Load + lock payment request
  SELECT * INTO pr FROM public.payment_requests WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  -- Idempotency: no-op if already in target state
  IF pr.status = _new_status THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'status', pr.status);
  END IF;

  -- State machine
  -- pending -> approved | rejected
  -- approved -> revoked
  -- rejected -> approved (re-review allowed)
  -- revoked -> (terminal)
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

  -- ===== APPROVAL =====
  IF _new_status = 'approved' THEN

    -- Subscription (jobseeker / mentor premium)
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

      -- Amount validation: if we have a known plan price, require match (±1 unit slack)
      IF v_plan_price IS NOT NULL AND abs(pr.amount - v_plan_price) > 1 THEN
        RAISE EXCEPTION 'amount_mismatch: expected % %, got % %',
          v_plan_price, COALESCE(v_plan_currency, pr.currency), pr.amount, pr.currency;
      END IF;

      -- EXTEND existing active subscription instead of stacking
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

      INSERT INTO public.subscriptions (
        user_id, plan_type, status, currency, price_cents,
        current_period_start, current_period_end, billing_cycle
      ) VALUES (
        pr.user_id,
        COALESCE(pr.reference_id, 'premium'),
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

      INSERT INTO public.subscriptions (
        user_id, plan_type, status, currency, price_cents,
        current_period_start, current_period_end, billing_cycle
      ) VALUES (
        pr.user_id,
        'employer_' || COALESCE(pr.reference_id, 'basic'),
        'active',
        pr.currency,
        round(pr.amount * 100)::int,
        v_now,
        v_period_end,
        'yearly'
      );

    ELSIF pr.payment_type = 'mentor_session' THEN
      IF pr.booking_id IS NULL THEN
        RAISE EXCEPTION 'missing_booking: mentor_session payment requires booking_id';
      END IF;

      SELECT * INTO v_booking
        FROM public.mentor_bookings
        WHERE id = pr.booking_id
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'booking_not_found';
      END IF;

      -- Disallow approving payment for cancelled / declined bookings
      IF v_booking.status IN ('cancelled','declined') THEN
        RAISE EXCEPTION 'invalid_booking_state: cannot approve payment for % booking', v_booking.status;
      END IF;

      UPDATE public.mentor_bookings
        SET payment_status = 'paid', updated_at = v_now
        WHERE id = v_booking.id;

      v_mentor_payout := round(pr.amount * 0.8 * 100) / 100.0;

      -- Idempotent earnings insert (unique index on booking_id)
      INSERT INTO public.mentor_earnings (
        mentor_id, booking_id, amount, currency, status
      ) VALUES (
        v_booking.mentor_id, v_booking.id, v_mentor_payout, pr.currency, 'pending'
      )
      ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO NOTHING;
    END IF;

    -- Notify
    INSERT INTO public.notifications (
      user_id, notification_type, title, title_my, description, description_my, link_path
    ) VALUES (
      pr.user_id, 'payment_approved',
      'Payment Approved', 'ငွေပေးချေမှု အတည်ပြုပြီး',
      'Your payment has been approved and your account has been activated.',
      'သင့်ငွေပေးချေမှုကို အတည်ပြုပြီး သင့်အကောင့်ကို အသက်သွင်းပြီးပါပြီ။',
      v_link_path
    );

  -- ===== REJECTION =====
  ELSIF _new_status = 'rejected' THEN
    IF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      UPDATE public.mentor_bookings
        SET payment_status = 'unpaid', updated_at = v_now
        WHERE id = pr.booking_id
          AND payment_status IN ('pending','unpaid');
    END IF;

    INSERT INTO public.notifications (
      user_id, notification_type, title, title_my, description, description_my, link_path
    ) VALUES (
      pr.user_id, 'payment_rejected',
      'Payment Rejected', 'ငွေပေးချေမှု ပယ်ချခံရသည်',
      COALESCE(_admin_note, 'Your payment was not approved. Please try again or contact support.'),
      COALESCE(_admin_note, 'သင့်ငွေပေးချေမှုကို အတည်မပြုပါ။ ထပ်မံကြိုးစားပါ သို့မဟုတ် ပံ့ပိုးကူညီမှုကို ဆက်သွယ်ပါ။'),
      v_link_path
    );

  -- ===== REVOCATION (refund / reverse approved payment) =====
  ELSIF _new_status = 'revoked' THEN
    IF pr.payment_type = 'subscription' THEN
      UPDATE public.subscriptions
        SET status = 'revoked'
        WHERE user_id = pr.user_id
          AND plan_type = COALESCE(pr.reference_id, 'premium')
          AND status = 'active';

      -- Recompute is_premium from remaining active subscriptions
      UPDATE public.profiles SET is_premium = EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = pr.user_id
          AND status = 'active'
          AND current_period_end > v_now
      )
      WHERE id = pr.user_id;

    ELSIF pr.payment_type = 'employer_subscription' THEN
      UPDATE public.subscriptions
        SET status = 'revoked'
        WHERE user_id = pr.user_id
          AND plan_type = 'employer_' || COALESCE(pr.reference_id, 'basic')
          AND status = 'active';
      UPDATE public.employer_profiles
        SET subscription_tier = NULL, subscription_expires_at = NULL
        WHERE id = pr.user_id;

    ELSIF pr.payment_type = 'mentor_session' AND pr.booking_id IS NOT NULL THEN
      UPDATE public.mentor_bookings
        SET payment_status = 'refunded', updated_at = v_now
        WHERE id = pr.booking_id;
      UPDATE public.mentor_earnings
        SET status = 'refunded'
        WHERE booking_id = pr.booking_id;
    END IF;

    INSERT INTO public.notifications (
      user_id, notification_type, title, title_my, description, description_my, link_path
    ) VALUES (
      pr.user_id, 'payment_revoked',
      'Payment Revoked', 'ငွေပေးချေမှု ပြန်လည်ရုပ်သိမ်းခဲ့သည်',
      COALESCE(_admin_note, 'A previously approved payment has been revoked. Please contact support.'),
      COALESCE(_admin_note, 'အရင်က အတည်ပြုထားသော ငွေပေးချေမှုကို ပြန်လည်ရုပ်သိမ်းလိုက်ပါသည်။'),
      v_link_path
    );
  END IF;

  -- Update payment request itself
  UPDATE public.payment_requests
    SET status = _new_status,
        admin_note = COALESCE(_admin_note, admin_note),
        reviewed_at = v_now,
        reviewed_by = v_caller,
        updated_at = v_now
    WHERE id = pr.id;

  RETURN jsonb_build_object('ok', true, 'status', _new_status, 'payment_id', pr.id);
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_request(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, text, text) TO authenticated;