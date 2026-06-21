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

  v_is_admin := public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'moderator'::app_role);
  v_is_applicant := (v_app.applicant_id = v_user);

  SELECT j.employer_id, j.posted_by_role, j.posted_by_user_id, j.salary_max, j.salary_min
    INTO v_job_row
    FROM public.jobs j WHERE j.id = v_app.job_id;
  IF v_job_row IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;

  IF NOT v_is_admin AND NOT v_is_applicant THEN
    IF NOT (
      EXISTS (SELECT 1 FROM public.employer_profiles ep WHERE ep.id = v_job_row.employer_id AND ep.user_id = v_user)
      OR (v_job_row.posted_by_role = 'agent' AND v_job_row.posted_by_user_id = v_user)
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  -- Determine salary & fee.
  -- Applicant accepts: trust existing app values (employer-set) over client-supplied;
  -- fall back to job listing if nothing was previously recorded.
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

  IF v_fee > 0 AND v_app.applicant_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_type = 'placement_fee'
        AND reference_id = _application_id::text
    ) THEN
      INSERT INTO public.payment_requests(
        user_id, payment_type, amount, currency, status,
        payment_method, reference_id, admin_note
      ) VALUES (
        v_app.applicant_id, 'placement_fee', v_fee, 'MMK', 'pending',
        NULL, _application_id::text,
        'Auto-generated on placement confirmation'
      )
      RETURNING id INTO v_invoice_id;

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