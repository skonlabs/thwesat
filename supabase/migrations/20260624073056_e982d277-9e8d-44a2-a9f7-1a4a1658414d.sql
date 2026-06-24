-- ============================================================
-- Agent hardening: AA + AB5 fixes
-- ============================================================

-- AA1 + AB5: harden post_job_with_quota with agent_client_id ownership + label gate.
CREATE OR REPLACE FUNCTION public.post_job_with_quota(_payload jsonb, _featured boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_job_id uuid;
  v_is_verified boolean := false;
  v_is_agent boolean := false;
  v_status text;
  v_q public.subscription_quotas%ROWTYPE;
  v_active_count int;
  v_client_id uuid;
  v_posted_by text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  INSERT INTO public.subscription_quotas(user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_q FROM public.subscription_quotas WHERE user_id = v_user FOR UPDATE;

  SELECT COUNT(*) INTO v_active_count
  FROM public.jobs
  WHERE employer_id = v_user AND status IN ('pending','active','paused');

  IF NOT COALESCE(v_q.is_unlimited_jobs, false)
     AND v_active_count >= COALESCE(v_q.active_jobs_quota, 0) THEN
    RAISE EXCEPTION 'quota_exhausted_jobs' USING HINT='Upgrade your plan to post more jobs.';
  END IF;

  IF _featured AND v_q.featured_jobs_used >= COALESCE(v_q.featured_jobs_total, 0) THEN
    RAISE EXCEPTION 'quota_exhausted_featured' USING HINT='Purchase a Featured Job add-on to feature this listing.';
  END IF;

  _payload := _payload || jsonb_build_object('employer_id', v_user);

  SELECT COALESCE(is_verified, false) OR COALESCE(verification_status, '') = 'verified'
    INTO v_is_verified
  FROM public.employer_profiles
  WHERE id = v_user;

  SELECT public.has_role(v_user, 'agent'::app_role) INTO v_is_agent;

  -- AA1: verify agent_client_id ownership (only agents may attach a client).
  v_client_id := NULLIF(_payload->>'agent_client_id','')::uuid;
  v_posted_by := COALESCE(_payload->>'posted_by_label','self');

  IF v_client_id IS NOT NULL THEN
    IF NOT v_is_agent THEN
      RAISE EXCEPTION 'agent_client_not_allowed' USING HINT='Only agents can attach a client to a job.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.agent_clients
      WHERE id = v_client_id AND agent_id = v_user
    ) THEN
      RAISE EXCEPTION 'agent_client_not_owned' USING HINT='You do not own this client.';
    END IF;
  END IF;

  -- AB5: client-posted label requires a real client.
  IF v_is_agent AND v_posted_by = 'client' AND v_client_id IS NULL THEN
    RAISE EXCEPTION 'agent_client_required' USING HINT='Select a client when posting on a client''s behalf.';
  END IF;

  -- Non-agents are forced to 'self'.
  IF NOT v_is_agent THEN
    v_posted_by := 'self';
    v_client_id := NULL;
  END IF;

  v_status := CASE WHEN COALESCE(v_is_verified, false) OR COALESCE(v_is_agent, false)
                   THEN 'active' ELSE 'pending' END;

  INSERT INTO public.jobs (
    employer_id, title, title_my, description, description_my,
    requirements, requirements_my, role_type, category, categories,
    salary_min, salary_max, currency, salary_negotiable, location,
    payment_methods, requires_embassy, requires_work_permit,
    visa_sponsorship, is_featured, application_method, external_url,
    job_type, contract_duration_type, contract_duration_months,
    contract_duration_note, skills, company,
    agent_client_id, client_company_name, client_logo_url,
    posted_by_label, status, is_verified, expires_at
  )
  SELECT
    v_user,
    _payload->>'title', _payload->>'title_my',
    _payload->>'description', _payload->>'description_my',
    _payload->>'requirements', _payload->>'requirements_my',
    _payload->>'role_type', _payload->>'category',
    CASE WHEN jsonb_typeof(_payload->'categories') = 'array'
         THEN COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'categories')), '{}')
         ELSE '{}'::text[] END,
    NULLIF(_payload->>'salary_min','')::int,
    NULLIF(_payload->>'salary_max','')::int,
    COALESCE(_payload->>'currency','MMK'),
    COALESCE((_payload->>'salary_negotiable')::boolean, false),
    COALESCE(_payload->>'location','Remote'),
    CASE WHEN jsonb_typeof(_payload->'payment_methods') = 'array'
         THEN COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'payment_methods')), '{}')
         ELSE '{}'::text[] END,
    COALESCE((_payload->>'requires_embassy')::boolean, false),
    COALESCE((_payload->>'requires_work_permit')::boolean, false),
    COALESCE((_payload->>'visa_sponsorship')::boolean, false),
    COALESCE((_payload->>'is_featured')::boolean, false),
    COALESCE(_payload->>'application_method','platform'),
    _payload->>'external_url',
    COALESCE(_payload->>'job_type','full-time'),
    _payload->>'contract_duration_type',
    NULLIF(_payload->>'contract_duration_months','')::int,
    _payload->>'contract_duration_note',
    CASE WHEN jsonb_typeof(_payload->'skills') = 'array'
         THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'skills'))
         ELSE NULL END,
    COALESCE(_payload->>'company',''),
    v_client_id,
    _payload->>'client_company_name',
    _payload->>'client_logo_url',
    v_posted_by,
    v_status,
    (v_status = 'active'),
    NULLIF(_payload->>'expires_at','')::timestamptz
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object('ok', true, 'job_id', v_job_id, 'auto_approved', v_status = 'active');
END;
$function$;

REVOKE ALL ON FUNCTION public.post_job_with_quota(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_job_with_quota(jsonb, boolean) TO authenticated;

-- AA2: placement_confirm_with_invoice should bill in the job's currency.
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
  v_currency text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _placement_salary IS NULL OR _placement_salary <= 0 THEN RAISE EXCEPTION 'invalid_salary'; END IF;
  IF _placement_fee IS NULL OR _placement_fee < 0 THEN RAISE EXCEPTION 'invalid_fee'; END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'application_not_found'; END IF;

  v_is_admin := public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'moderator'::app_role);

  SELECT j.employer_id, j.posted_by_role, j.posted_by_user_id, j.currency
    INTO v_job_row
    FROM public.jobs j WHERE j.id = v_app.job_id;
  IF v_job_row IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  v_currency := COALESCE(v_job_row.currency, 'MMK');

  IF NOT v_is_admin THEN
    SELECT id INTO v_emp_owner FROM public.employer_profiles WHERE id = v_job_row.employer_id;
    IF NOT (
      EXISTS (SELECT 1 FROM public.employer_profiles ep WHERE ep.id = v_job_row.employer_id AND ep.user_id = v_user)
      OR (v_job_row.posted_by_role = 'agent' AND v_job_row.posted_by_user_id = v_user)
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  UPDATE public.applications
     SET status = 'placed',
         placement_salary = _placement_salary,
         placement_fee = _placement_fee,
         updated_at = now()
   WHERE id = _application_id;

  IF _placement_fee > 0 AND v_app.applicant_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_requests
      WHERE payment_type = 'placement_fee'
        AND reference_id = _application_id::text
    ) THEN
      INSERT INTO public.payment_requests(
        user_id, payment_type, amount, currency, status,
        payment_method, reference_id, admin_note
      ) VALUES (
        v_app.applicant_id, 'placement_fee', _placement_fee, v_currency, 'pending',
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

  RETURN jsonb_build_object('ok', true, 'application_id', _application_id, 'invoice_id', v_invoice_id, 'currency', v_currency);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.placement_confirm_with_invoice(uuid,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.placement_confirm_with_invoice(uuid,numeric,numeric) TO authenticated;
