-- Fix placement confirmation to use the current jobs schema and avoid legacy missing columns.
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
  v_invoice_id uuid;
  v_is_admin boolean;
  v_is_applicant boolean;
  v_salary numeric;
  v_fee numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;

  v_is_admin := public.has_role(v_user, 'admin'::app_role) OR public.has_role(v_user, 'moderator'::app_role);
  v_is_applicant := (v_app.applicant_id = v_user);

  SELECT j.employer_id, j.salary_max, j.salary_min, COALESCE(j.currency, 'MMK') AS currency
    INTO v_job_row
    FROM public.jobs j
   WHERE j.id = v_app.job_id;
  IF v_job_row IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;

  IF NOT v_is_admin AND NOT v_is_applicant AND v_job_row.employer_id <> v_user THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_is_applicant AND NOT v_is_admin THEN
    v_salary := COALESCE(NULLIF(v_app.placement_salary, 0), _placement_salary, v_job_row.salary_max, v_job_row.salary_min, 0);
    v_fee := COALESCE(NULLIF(v_app.placement_fee, 0), _placement_fee, ROUND(v_salary * 0.08 / 100) * 100, 0);
  ELSE
    v_salary := _placement_salary;
    v_fee := _placement_fee;
  END IF;

  IF v_salary IS NULL OR v_salary <= 0 THEN RAISE EXCEPTION 'invalid_salary'; END IF;
  IF v_fee IS NULL OR v_fee < 0 THEN RAISE EXCEPTION 'invalid_fee'; END IF;

  UPDATE public.applications
     SET status = 'placed',
         placement_salary = v_salary,
         placement_fee = v_fee,
         updated_at = now()
   WHERE id = _application_id;

  IF v_fee > 0 THEN
    SELECT id INTO v_invoice_id
      FROM public.payment_requests
     WHERE payment_type = 'placement_fee'
       AND reference_id = _application_id::text
     LIMIT 1;

    IF v_invoice_id IS NULL THEN
      INSERT INTO public.payment_requests(
        user_id, payment_type, amount, currency, status,
        payment_method, reference_id, admin_note
      ) VALUES (
        v_job_row.employer_id, 'placement_fee', v_fee, v_job_row.currency, 'pending',
        'kbzpay', _application_id::text,
        'Auto-generated on placement confirmation'
      )
      RETURNING id INTO v_invoice_id;

      INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
      VALUES (
        v_job_row.employer_id, 'payment',
        'Placement fee invoice', 'ခန့်အပ်ခ ပြေစာ',
        'A placement fee invoice has been created for this placement.',
        'ဤခန့်အပ်မှုအတွက် ခန့်အပ်ခ ပြေစာ ဖန်တီးပြီးပါပြီ။',
        '/employer/finance'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'application_id', _application_id, 'invoice_id', v_invoice_id);
END;
$$;

-- Keep the legacy trigger aligned with the same invoice recipient and valid payment method.
CREATE OR REPLACE FUNCTION public.create_placement_fee_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid;
  v_currency text;
  v_existing uuid;
BEGIN
  IF NEW.status = 'placed'
     AND NEW.placement_fee IS NOT NULL
     AND NEW.placement_fee > 0
     AND (OLD.status IS DISTINCT FROM 'placed' OR OLD.placement_fee IS DISTINCT FROM NEW.placement_fee)
  THEN
    SELECT employer_id, COALESCE(currency, 'MMK') INTO v_employer_id, v_currency
      FROM public.jobs WHERE id = NEW.job_id;

    IF v_employer_id IS NULL THEN RETURN NEW; END IF;

    SELECT id INTO v_existing
      FROM public.payment_requests
      WHERE payment_type = 'placement_fee'
        AND reference_id = NEW.id::text
      LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

    INSERT INTO public.payment_requests (
      user_id, payment_type, payment_method, amount, currency,
      reference_id, status
    ) VALUES (
      v_employer_id, 'placement_fee', 'kbzpay', NEW.placement_fee, v_currency,
      NEW.id::text, 'pending'
    );

    INSERT INTO public.notifications (user_id, notification_type, title, title_my, description, description_my, link_path)
    VALUES (
      v_employer_id, 'payment',
      'Placement Fee Invoice', 'ခန့်အပ်ခ ငွေတောင်းခံလွှာ',
      'A placement fee of ' || NEW.placement_fee || ' ' || v_currency || ' is due. Please submit payment proof.',
      'ခန့်အပ်ခ ' || NEW.placement_fee || ' ' || v_currency || ' ပေးချေရန် ရှိပါသည်။',
      '/employer/finance'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix contact unlock id comparison and unlimited subscription quotas.
CREATE OR REPLACE FUNCTION public.unlock_contact_with_quota(_target_type text, _target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_quota public.subscription_quotas%ROWTYPE;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _target_id IS NULL OR _target_type IS NULL THEN
    RAISE EXCEPTION 'invalid_target';
  END IF;

  SELECT id INTO v_existing
  FROM public.feature_unlocks
  WHERE user_id = v_user
    AND feature_key = 'unlock_contact'
    AND target_id = _target_id::text
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('unlock', v_existing, 'already_unlocked', true);
  END IF;

  SELECT * INTO v_quota FROM public.subscription_quotas WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_subscription';
  END IF;

  IF NOT COALESCE(v_quota.is_unlimited_unlocks, false)
     AND (COALESCE(v_quota.unlocks_total, 0) - COALESCE(v_quota.unlocks_used, 0)) <= 0 THEN
    RAISE EXCEPTION 'no_unlocks_remaining';
  END IF;

  IF NOT COALESCE(v_quota.is_unlimited_unlocks, false) THEN
    UPDATE public.subscription_quotas
       SET unlocks_used = unlocks_used + 1,
           updated_at = now()
     WHERE user_id = v_user;
  END IF;

  INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, credits_spent, is_active, metadata)
  VALUES (v_user, 'unlock_contact', _target_type, _target_id::text, 0, true,
          jsonb_build_object('source','subscription_quota'))
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('unlock', v_new_id, 'already_unlocked', false);
END;
$$;

-- Fix booking notification auto-message conversation creation under RLS by accepting caller-generated ids safely.
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Limit sensitive RPC execution to signed-in users; internal role checks still enforce permissions.
REVOKE EXECUTE ON FUNCTION public.unlock_contact_with_quota(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_contact_with_quota(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.feature_job_with_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feature_job_with_quota(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mentor_session_refund(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_session_refund(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_counter_proposal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_counter_proposal(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_session_complete(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_session_complete(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_job(uuid) TO authenticated;