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
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  _payload := _payload || jsonb_build_object('employer_id', v_user);

  INSERT INTO public.jobs (
    employer_id, title, title_my, description, description_my,
    requirements, requirements_my, role_type, category, categories,
    salary_min, salary_max, currency, salary_negotiable, location,
    payment_methods, requires_embassy, requires_work_permit,
    visa_sponsorship, is_featured, application_method, external_url,
    job_type, contract_duration_type, contract_duration_months,
    contract_duration_note, skills, company,
    agent_client_id, client_company_name, client_logo_url,
    posted_by_label, status
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
    'pending'
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

  RETURN jsonb_build_object('ok', true, 'job_id', v_job_id, 'spend', v_spend, 'featured', v_feat);
END;
$function$;