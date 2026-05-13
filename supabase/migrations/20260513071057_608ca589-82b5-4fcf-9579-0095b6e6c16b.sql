-- Onboarding completion rule: employer/agent attributed user is "onboarded" when
--   1) employer_profiles row exists with company_name, industry, contact_email filled
--   2) at least 1 job (any status) was created within 7 days of employer_profiles.created_at
-- Stamped onto partner_attributions.onboarding_completed_at.

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
  first_job AS (
    SELECT MIN(created_at) AS first_job_at
    FROM public.jobs
    WHERE employer_id = _user_id
  )
  SELECT first_job.first_job_at
  FROM ep, first_job
  WHERE COALESCE(NULLIF(TRIM(ep.company_name), ''), '') <> ''
    AND COALESCE(NULLIF(TRIM(ep.industry), ''), '')     <> ''
    AND COALESCE(NULLIF(TRIM(ep.contact_email), ''), '')<> ''
    AND first_job.first_job_at IS NOT NULL
    AND first_job.first_job_at <= ep.created_at + INTERVAL '7 days';
$$;

-- Trigger: when a job is inserted, stamp onboarding_completed_at on any
-- partner_attributions row for the employer if the rule now passes.
CREATE OR REPLACE FUNCTION public.partner_mark_onboarded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_when timestamptz;
BEGIN
  v_when := public.is_user_onboarded(NEW.employer_id);
  IF v_when IS NOT NULL THEN
    UPDATE public.partner_attributions
       SET onboarding_completed_at = v_when
     WHERE user_id = NEW.employer_id
       AND onboarding_completed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_mark_onboarded ON public.jobs;
CREATE TRIGGER trg_partner_mark_onboarded
AFTER INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.partner_mark_onboarded();

-- Backfill existing attributions
UPDATE public.partner_attributions pa
   SET onboarding_completed_at = public.is_user_onboarded(pa.user_id)
 WHERE onboarding_completed_at IS NULL
   AND public.is_user_onboarded(pa.user_id) IS NOT NULL;