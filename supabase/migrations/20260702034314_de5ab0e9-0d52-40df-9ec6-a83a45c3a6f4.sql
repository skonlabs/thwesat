-- Fix: post_job_with_quota references renamed column active_jobs_quota -> job_postings_quota
CREATE OR REPLACE FUNCTION public.post_job_with_quota(_payload jsonb, _featured boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
     AND v_active_count >= COALESCE(v_q.job_postings_quota, 0) THEN
    RAISE EXCEPTION 'quota_exhausted_jobs' USING HINT='Upgrade your plan to post more jobs.';
  END IF;

  IF _featured AND v_q.featured_jobs_used >= COALESCE(v_q.featured_jobs_total, 0) THEN
    RAISE EXCEPTION 'quota_exhausted_featured' USING HINT='Purchase a Featured Job add-on to feature this listing.';
  END IF;

  _payload := _payload || jsonb_build_object('employer_id', v_user);

  SELECT COALESCE(is_verified, false) OR COALESCE(verification_status, '') = 'verified'
    INTO v_is_verified FROM public.employer_profiles WHERE id = v_user;

  SELECT public.has_role(v_user, 'agent'::app_role) INTO v_is_agent;

  v_client_id := NULLIF(_payload->>'agent_client_id','')::uuid;
  v_posted_by := COALESCE(_payload->>'posted_by_label','self');

  IF v_client_id IS NOT NULL THEN
    IF NOT v_is_agent THEN RAISE EXCEPTION 'agent_client_not_allowed'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.agent_clients WHERE id = v_client_id AND agent_id = v_user) THEN
      RAISE EXCEPTION 'agent_client_not_owned';
    END IF;
  END IF;

  IF v_is_agent AND v_posted_by = 'client' AND v_client_id IS NULL THEN
    RAISE EXCEPTION 'agent_client_required';
  END IF;

  IF NOT v_is_agent THEN v_posted_by := 'self'; v_client_id := NULL; END IF;

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
    COALESCE(_featured, false),
    COALESCE(_payload->>'application_method','in_app'),
    NULLIF(_payload->>'external_url',''),
    COALESCE(_payload->>'job_type','full_time'),
    _payload->>'contract_duration_type',
    NULLIF(_payload->>'contract_duration_months','')::int,
    _payload->>'contract_duration_note',
    CASE WHEN jsonb_typeof(_payload->'skills') = 'array'
         THEN COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(_payload->'skills')), '{}')
         ELSE '{}'::text[] END,
    _payload->>'company',
    v_client_id,
    NULLIF(_payload->>'client_company_name',''),
    NULLIF(_payload->>'client_logo_url',''),
    v_posted_by,
    v_status,
    v_is_verified,
    NULL
  RETURNING id INTO v_job_id;

  IF _featured THEN
    UPDATE public.subscription_quotas SET featured_jobs_used = featured_jobs_used + 1 WHERE user_id = v_user;
  END IF;

  RETURN jsonb_build_object('id', v_job_id, 'status', v_status);
END;
$$;