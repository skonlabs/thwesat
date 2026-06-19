-- ============================================
-- post_job_with_quota: subscription-aware job creation
-- ============================================
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
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Ensure quota row exists
  INSERT INTO public.subscription_quotas(user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_q FROM public.subscription_quotas WHERE user_id = v_user FOR UPDATE;

  -- Recompute active_jobs_used from truth to avoid drift
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
    NULLIF(_payload->>'agent_client_id','')::uuid,
    _payload->>'client_company_name',
    _payload->>'client_logo_url',
    COALESCE(_payload->>'posted_by_label','self'),
    v_status,
    (v_status = 'active'),
    NULLIF(_payload->>'expires_at','')::timestamptz
  RETURNING id INTO v_job_id;

  -- Triggers will sync active_jobs_used and featured_jobs_used.
  RETURN jsonb_build_object('ok', true, 'job_id', v_job_id, 'auto_approved', v_status = 'active');
END;
$function$;

REVOKE ALL ON FUNCTION public.post_job_with_quota(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_job_with_quota(jsonb, boolean) TO authenticated;

-- ============================================
-- Quota sync triggers on jobs
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_job_quotas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := COALESCE(NEW.employer_id, OLD.employer_id);
  v_count int;
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  INSERT INTO public.subscription_quotas(user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT COUNT(*) INTO v_count FROM public.jobs
    WHERE employer_id = v_user AND status IN ('pending','active','paused');
  UPDATE public.subscription_quotas SET active_jobs_used = v_count, updated_at = now()
    WHERE user_id = v_user;

  -- Featured used count: distinct featured jobs ever created in current period (simple count of jobs.is_featured=true)
  SELECT COUNT(*) INTO v_count FROM public.jobs
    WHERE employer_id = v_user AND is_featured = true;
  UPDATE public.subscription_quotas SET featured_jobs_used = v_count, updated_at = now()
    WHERE user_id = v_user;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_sync_job_quotas ON public.jobs;
CREATE TRIGGER trg_sync_job_quotas
AFTER INSERT OR UPDATE OF status, is_featured OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_job_quotas();