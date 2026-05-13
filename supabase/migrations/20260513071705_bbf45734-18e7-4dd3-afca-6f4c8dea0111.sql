-- 1) Onboarding helper now uses LEAST(employer_profiles.created_at, auth.users.created_at)
--    so the 7-day clock starts at signup if profile row was created later.
CREATE OR REPLACE FUNCTION public.is_user_onboarded(_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ep AS (
    SELECT created_at, company_name, industry, contact_email
    FROM public.employer_profiles
    WHERE id = _user_id
  ),
  au AS (
    SELECT created_at FROM auth.users WHERE id = _user_id
  ),
  first_job AS (
    SELECT MIN(created_at) AS first_job_at
    FROM public.jobs
    WHERE employer_id = _user_id
  )
  SELECT first_job.first_job_at
  FROM ep, first_job
  LEFT JOIN au ON TRUE
  WHERE COALESCE(NULLIF(TRIM(ep.company_name), ''), '') <> ''
    AND COALESCE(NULLIF(TRIM(ep.industry), ''), '')     <> ''
    AND COALESCE(NULLIF(TRIM(ep.contact_email), ''), '')<> ''
    AND first_job.first_job_at IS NOT NULL
    AND first_job.first_job_at <= LEAST(ep.created_at, COALESCE(au.created_at, ep.created_at)) + INTERVAL '7 days';
$$;

-- 2) Re-check trigger when employer profile is created or its onboarding-relevant fields change
CREATE OR REPLACE FUNCTION public.partner_mark_onboarded_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_when timestamptz;
BEGIN
  v_when := public.is_user_onboarded(NEW.id);
  IF v_when IS NOT NULL THEN
    UPDATE public.partner_attributions
       SET onboarding_completed_at = v_when
     WHERE user_id = NEW.id
       AND onboarding_completed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_mark_onboarded_profile ON public.employer_profiles;
CREATE TRIGGER trg_partner_mark_onboarded_profile
AFTER INSERT OR UPDATE OF company_name, industry, contact_email
ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.partner_mark_onboarded_from_profile();

-- Backfill again after rule change
UPDATE public.partner_attributions pa
   SET onboarding_completed_at = public.is_user_onboarded(pa.user_id)
 WHERE onboarding_completed_at IS NULL
   AND public.is_user_onboarded(pa.user_id) IS NOT NULL;

-- 3) Admin-only RPC for revenue-overrides on payment_requests
CREATE OR REPLACE FUNCTION public.admin_set_payment_revenue_overrides(
  _payment_id uuid,
  _third_party_payout numeric,
  _npr_amount numeric,
  _revenue_classification text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _revenue_classification IS NOT NULL
     AND _revenue_classification NOT IN ('new','expansion','reactivation') THEN
    RAISE EXCEPTION 'invalid revenue_classification: %', _revenue_classification;
  END IF;
  UPDATE public.payment_requests
     SET third_party_payout = COALESCE(_third_party_payout, third_party_payout),
         npr_amount = _npr_amount,
         revenue_classification = COALESCE(_revenue_classification, revenue_classification)
   WHERE id = _payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_payment_revenue_overrides(uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_revenue_overrides(uuid, numeric, numeric, text) TO authenticated;