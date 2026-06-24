-- ============================================================
-- Employer hardening: critical + high audit fixes
-- ============================================================

-- C1: Restrict columns an employer can change on applications.
-- Block any UPDATE that modifies applicant identity, CV, cover letter, or job_id.
CREATE OR REPLACE FUNCTION public.applications_employer_column_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  -- Only enforce when caller is the employer (not the applicant themselves).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.applicant_id = auth.uid() THEN
    RETURN NEW; -- applicant editing own row (e.g. withdraw) handled by its own policy
  END IF;

  IF NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.cv_document_id IS DISTINCT FROM OLD.cv_document_id
     OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'forbidden_column_update' USING HINT='Employers cannot change applicant/job/CV/cover letter on an application.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_employer_column_whitelist ON public.applications;
CREATE TRIGGER trg_applications_employer_column_whitelist
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_employer_column_whitelist();

-- C3: agent_clients should not be publicly readable. Restrict to authenticated users.
DROP POLICY IF EXISTS "Active agent clients readable by anon" ON public.agent_clients;
CREATE POLICY "Active agent clients readable by authenticated"
  ON public.agent_clients FOR SELECT
  TO authenticated
  USING (is_active = true);
REVOKE SELECT ON public.agent_clients FROM anon;

-- H6: Auto-record job status changes into job_status_history.
CREATE OR REPLACE FUNCTION public.jobs_record_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(auth.uid(), NEW.employer_id), now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_record_status_history ON public.jobs;
CREATE TRIGGER trg_jobs_record_status_history
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_record_status_history();
