-- Add an optional expiry date to job listings.
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_jobs_active_created
ON public.jobs (is_featured DESC, created_at DESC)
WHERE status = 'active';

-- Ensure the database accepts the Paused lifecycle state used by the app.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_valid;
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_status_valid
CHECK (status IN ('pending', 'active', 'paused', 'closed', 'rejected'));

-- Validate time-sensitive lifecycle rules with a trigger, not a time-based CHECK.
CREATE OR REPLACE FUNCTION public.validate_job_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'paused', 'closed', 'rejected') THEN
    RAISE EXCEPTION 'invalid_job_status';
  END IF;

  IF NEW.expires_at IS NOT NULL
     AND NEW.status IN ('pending', 'active', 'paused')
     AND NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'job_expiry_must_be_future';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_job_lifecycle ON public.jobs;
CREATE TRIGGER trg_validate_job_lifecycle
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.validate_job_lifecycle();

-- Public browsing should only expose active, unexpired jobs; owners still see their own rows.
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs"
ON public.jobs
FOR SELECT
TO anon, authenticated
USING (
  (
    status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  )
  OR employer_id = auth.uid()
);

-- Keep job posting RPC in sync with the new expiry field.
CREATE OR REPLACE FUNCTION public.post_job_with_credits(_payload jsonb, _featured boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_job_id uuid;
  v_spend jsonb;
  v_feat jsonb;
  v_is_verified boolean := false;
  v_is_agent boolean := false;
  v_status text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

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

  v_spend := public.wallet_spend(
    _action_key := 'job_post',
    _target_type := 'job',
    _target_id := v_job_id::text,
    _idempotency_key := 'job_post:' || v_job_id::text,
    _metadata := '{}'::jsonb
  );

  IF _featured THEN
    v_feat := public.wallet_spend(
      _action_key := 'featured_job',
      _target_type := 'job',
      _target_id := v_job_id::text,
      _idempotency_key := 'featured_job:' || v_job_id::text,
      _metadata := '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'job_id', v_job_id, 'spend', v_spend, 'featured', v_feat, 'auto_approved', v_status = 'active');
END;
$function$;

-- Do not approve a listing that has already expired.
CREATE OR REPLACE FUNCTION public.approve_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.jobs%ROWTYPE; v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller,'admin'::app_role) OR public.has_role(v_caller,'moderator'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF v_job.expires_at IS NOT NULL AND v_job.expires_at <= now() THEN
    RAISE EXCEPTION 'job_expired';
  END IF;
  UPDATE public.jobs SET status='active', is_verified=true, updated_at=now() WHERE id = _job_id;
  INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
  VALUES (v_job.employer_id,'job',
    'Your job listing is live','သင့်အလုပ်ကြော်ငြာ စတင်ပြသပြီးပါပြီ',
    format('"%s" has been approved and is now visible to candidates.', v_job.title),
    format('"%s" အတည်ပြုပြီး လူကြည့်နိုင်ပါပြီ။', COALESCE(v_job.title_my, v_job.title)),
    '/employer/dashboard');
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (v_caller, 'job_approved', 'job', _job_id::text, jsonb_build_object('title', v_job.title));
  RETURN jsonb_build_object('ok', true);
END $$;

-- Expired jobs cannot receive new applications.
CREATE OR REPLACE FUNCTION public.applications_require_active_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_expires_at timestamptz;
BEGIN
  SELECT status, expires_at INTO v_status, v_expires_at FROM public.jobs WHERE id = NEW.job_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF v_status <> 'active' OR (v_expires_at IS NOT NULL AND v_expires_at <= now()) THEN
    RAISE EXCEPTION 'job_not_active' USING HINT='This job is no longer accepting applications.';
  END IF;
  RETURN NEW;
END $$;