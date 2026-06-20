-- =====================================================================
-- FINANCE AUDIT FIXES (2026-06-20)
-- C-2: Tighten partner SELECT on payment_requests
-- H-1: Atomic mentor booking + escrow RPC
-- H-4: Server-validated subscription payment request creation
-- C-1: Placement confirm + invoice atomic RPC
-- =====================================================================

-- ---------------------------------------------------------------------
-- C-2: Partners can only read payment_requests for users they attributed
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Partners read payment requests" ON public.payment_requests;

CREATE POLICY "Partners read attributed payment requests"
  ON public.payment_requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'partner'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.partner_attributions pa
      JOIN public.partners p ON p.id = pa.partner_id
      WHERE pa.user_id = payment_requests.user_id
        AND p.user_id = auth.uid()
        AND p.is_active = true
    )
  );

-- ---------------------------------------------------------------------
-- H-1: Atomic mentor booking + escrow hold
-- Creates the mentor_bookings row and immediately holds credits in
-- escrow inside a single transaction so a failed hold cannot leave an
-- orphaned booking row blocking the slot.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mentor_create_booking_and_hold(
  _mentor_id uuid,
  _scheduled_date date,
  _scheduled_time text,
  _duration_minutes int,
  _topic text,
  _message text,
  _goals text,
  _credits bigint,
  _booked_by text DEFAULT 'mentee'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_booking_id uuid;
  v_tx uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _credits <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _mentor_id IS NULL THEN RAISE EXCEPTION 'mentor_required'; END IF;
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN RAISE EXCEPTION 'invalid_duration'; END IF;

  -- Slot collision check (cancelled/declined ignored)
  IF EXISTS (
    SELECT 1 FROM public.mentor_bookings
    WHERE mentor_id = _mentor_id
      AND scheduled_date = _scheduled_date
      AND scheduled_time = _scheduled_time
      AND status NOT IN ('cancelled','declined')
  ) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Funding check (early fail to give friendly error)
  IF (SELECT COALESCE(balance_credits,0) FROM public.wallets WHERE user_id = v_user) < _credits THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Create booking
  INSERT INTO public.mentor_bookings (
    mentor_id, mentee_id, scheduled_date, scheduled_time, duration_minutes,
    topic, message, goals, booked_by, credits_charged, status, payment_status
  ) VALUES (
    _mentor_id, v_user, _scheduled_date, _scheduled_time, _duration_minutes,
    _topic, _message, _goals, COALESCE(_booked_by,'mentee'), _credits, 'pending', 'unpaid'
  )
  RETURNING id INTO v_booking_id;

  -- Hold escrow
  INSERT INTO public.wallet_transactions(user_id, kind, credits, status, ref_type, ref_id, note, created_by)
  VALUES (v_user,'escrow_hold',-_credits,'completed','booking',v_booking_id::text,'Mentor session hold',v_user)
  RETURNING id INTO v_tx;
  PERFORM public._wallet_apply(v_user, -_credits, 0);

  INSERT INTO public.mentor_session_escrow(booking_id, mentee_id, mentor_id, credits_held, hold_tx_id)
  VALUES (v_booking_id, v_user, _mentor_id, _credits, v_tx);

  UPDATE public.mentor_bookings SET payment_status='paid' WHERE id = v_booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id, 'tx', v_tx);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mentor_create_booking_and_hold(uuid,date,text,int,text,text,text,bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_create_booking_and_hold(uuid,date,text,int,text,text,text,bigint,text) TO authenticated;

-- ---------------------------------------------------------------------
-- H-4: Validated subscription payment request creation
-- Verifies that mmk_amount matches plan / addon price, prevents
-- duplicate pending requests, and enforces free_trial only for 0-MMK
-- plans.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  _request_type text,
  _plan_id uuid,
  _addon_id uuid,
  _quantity int,
  _mmk_amount numeric,
  _payment_method text,
  _proof_url text,
  _sender_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_expected numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _request_type NOT IN ('subscription','addon') THEN RAISE EXCEPTION 'invalid_request_type'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN _quantity := 1; END IF;

  IF _request_type = 'subscription' THEN
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_required'; END IF;
    SELECT price_mmk INTO v_expected FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

    IF _mmk_amount <> v_expected THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    -- free_trial method only allowed for 0-MMK plans
    IF _payment_method = 'free_trial' AND v_expected <> 0 THEN
      RAISE EXCEPTION 'free_trial_not_allowed';
    END IF;
    IF v_expected = 0 AND _payment_method <> 'free_trial' THEN
      RAISE EXCEPTION 'invalid_method_for_free_plan';
    END IF;

    -- duplicate pending guard
    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND plan_id = _plan_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  ELSE
    IF _addon_id IS NULL THEN RAISE EXCEPTION 'addon_required'; END IF;
    SELECT mmk INTO v_expected FROM public.addon_products WHERE id = _addon_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'addon_not_found'; END IF;
    IF _mmk_amount <> (v_expected * _quantity) THEN RAISE EXCEPTION 'amount_mismatch'; END IF;
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
$$;

REVOKE EXECUTE ON FUNCTION public.create_subscription_payment_request(text,uuid,uuid,int,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_payment_request(text,uuid,uuid,int,numeric,text,text,text) TO authenticated;

-- ---------------------------------------------------------------------
-- C-1: Placement confirm + auto invoice
-- Updates the application AND creates a placement_fee payment_request
-- for the seeker so the finance ledger reflects the placement.
-- Caller must own the application via existing app permissions.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.placement_confirm_with_invoice(
  _application_id uuid,
  _placement_salary numeric,
  _placement_fee numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_app public.applications%ROWTYPE;
  v_job_row record;
  v_emp_owner uuid;
  v_invoice_id uuid;
  v_is_admin boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _placement_salary IS NULL OR _placement_salary <= 0 THEN RAISE EXCEPTION 'invalid_salary'; END IF;
  IF _placement_fee IS NULL OR _placement_fee < 0 THEN RAISE EXCEPTION 'invalid_fee'; END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;

  v_is_admin := public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'moderator'::app_role);

  -- Authorization: admin/mod, employer-owner, or agent on agent client jobs
  IF NOT v_is_admin THEN
    SELECT j.employer_id, j.posted_by_role, j.posted_by_user_id
      INTO v_job_row
      FROM public.jobs j WHERE j.id = v_app.job_id;

    IF v_job_row IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;

    SELECT id INTO v_emp_owner FROM public.employer_profiles WHERE id = v_job_row.employer_id;

    IF NOT (
      EXISTS (SELECT 1 FROM public.employer_profiles ep WHERE ep.id = v_job_row.employer_id AND ep.user_id = v_user)
      OR (v_job_row.posted_by_role = 'agent' AND v_job_row.posted_by_user_id = v_user)
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  -- Update application
  UPDATE public.applications
     SET status = 'placed',
         placement_salary = _placement_salary,
         placement_fee = _placement_fee,
         updated_at = now()
   WHERE id = _application_id;

  -- Insert placement fee invoice for the seeker (only when fee > 0)
  IF _placement_fee > 0 AND v_app.applicant_id IS NOT NULL THEN
    -- Avoid duplicate invoice for same application
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_type = 'placement_fee'
        AND reference_id = _application_id::text
    ) THEN
      INSERT INTO public.payment_requests(
        user_id, payment_type, amount, currency, status,
        payment_method, reference_id, admin_note
      ) VALUES (
        v_app.applicant_id, 'placement_fee', _placement_fee, 'MMK', 'pending',
        NULL, _application_id::text,
        'Auto-generated on placement confirmation'
      )
      RETURNING id INTO v_invoice_id;

      -- Notify seeker
      INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
      VALUES (
        v_app.applicant_id, 'payment',
        'Placement fee invoice', 'ခန့်အပ်ခ ပြေစာ',
        'A placement fee invoice has been created for your accepted offer.',
        'သင်လက်ခံထားသော ကမ်းလှမ်းချက်အတွက် ခန့်အပ်ခ ပြေစာ ဖန်တီးပြီးပါပြီ။',
        '/finance'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'application_id', _application_id, 'invoice_id', v_invoice_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.placement_confirm_with_invoice(uuid,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.placement_confirm_with_invoice(uuid,numeric,numeric) TO authenticated;
