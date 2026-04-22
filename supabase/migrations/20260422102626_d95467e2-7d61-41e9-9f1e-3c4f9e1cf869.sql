
-- =========================================================================
-- Status history audit tables for applications and jobs
-- =========================================================================
-- Goal: keep an immutable record of every status transition so support /
-- moderators can investigate complaints ("my application was rejected
-- without reason", "the job was hidden", etc).
--
-- Triggers fire AFTER INSERT (capture initial status) and AFTER UPDATE OF
-- status (capture transitions). Records are insert-only; admins can view
-- everything, the involved parties can view their own history.
-- =========================================================================

-- ---------- application_status_history ----------------------------------
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  job_id        uuid NOT NULL,
  applicant_id  uuid NOT NULL,
  employer_id   uuid,
  old_status    text,
  new_status    text NOT NULL,
  changed_by    uuid,
  reason        text,
  reason_my     text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application
  ON public.application_status_history(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_status_history_job
  ON public.application_status_history(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_status_history_applicant
  ON public.application_status_history(applicant_id, created_at DESC);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and moderators can view all application history"
  ON public.application_status_history;
CREATE POLICY "Admins and moderators can view all application history"
  ON public.application_status_history
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Applicants can view own application history"
  ON public.application_status_history;
CREATE POLICY "Applicants can view own application history"
  ON public.application_status_history
  FOR SELECT TO authenticated
  USING (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Employers can view application history for their jobs"
  ON public.application_status_history;
CREATE POLICY "Employers can view application history for their jobs"
  ON public.application_status_history
  FOR SELECT TO authenticated
  USING (auth.uid() = employer_id);

-- No insert/update/delete policies → only the SECURITY DEFINER trigger writes.

-- ---------- job_status_history ------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL,
  employer_id uuid NOT NULL,
  old_status  text,
  new_status  text NOT NULL,
  changed_by  uuid,
  reason      text,
  reason_my   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job
  ON public.job_status_history(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_status_history_employer
  ON public.job_status_history(employer_id, created_at DESC);

ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and moderators can view all job history"
  ON public.job_status_history;
CREATE POLICY "Admins and moderators can view all job history"
  ON public.job_status_history
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Employers can view own job history"
  ON public.job_status_history;
CREATE POLICY "Employers can view own job history"
  ON public.job_status_history
  FOR SELECT TO authenticated
  USING (auth.uid() = employer_id);

-- ---------- Trigger functions -------------------------------------------
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_employer uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT employer_id INTO v_employer FROM public.jobs WHERE id = NEW.job_id;
    INSERT INTO public.application_status_history
      (application_id, job_id, applicant_id, employer_id, old_status, new_status, changed_by, reason, reason_my)
    VALUES
      (NEW.id, NEW.job_id, NEW.applicant_id, v_employer, NULL, COALESCE(NEW.status, 'applied'),
       auth.uid(), NULLIF(NEW.rejection_reason, ''), NULLIF(NEW.rejection_reason_my, ''));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') IS DISTINCT FROM COALESCE(NEW.status, '') THEN
    SELECT employer_id INTO v_employer FROM public.jobs WHERE id = NEW.job_id;
    INSERT INTO public.application_status_history
      (application_id, job_id, applicant_id, employer_id, old_status, new_status, changed_by, reason, reason_my)
    VALUES
      (NEW.id, NEW.job_id, NEW.applicant_id, v_employer, OLD.status, NEW.status,
       auth.uid(), NULLIF(NEW.rejection_reason, ''), NULLIF(NEW.rejection_reason_my, ''));
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_log_application_status_insert ON public.applications;
CREATE TRIGGER trg_log_application_status_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();

DROP TRIGGER IF EXISTS trg_log_application_status_update ON public.applications;
CREATE TRIGGER trg_log_application_status_update
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_status_history
      (job_id, employer_id, old_status, new_status, changed_by, reason)
    VALUES
      (NEW.id, NEW.employer_id, NULL, COALESCE(NEW.status, 'pending'),
       auth.uid(), NULLIF(NEW.rejection_reason, ''));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') IS DISTINCT FROM COALESCE(NEW.status, '') THEN
    INSERT INTO public.job_status_history
      (job_id, employer_id, old_status, new_status, changed_by, reason)
    VALUES
      (NEW.id, NEW.employer_id, OLD.status, NEW.status,
       auth.uid(), NULLIF(NEW.rejection_reason, ''));
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_log_job_status_insert ON public.jobs;
CREATE TRIGGER trg_log_job_status_insert
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

DROP TRIGGER IF EXISTS trg_log_job_status_update ON public.jobs;
CREATE TRIGGER trg_log_job_status_update
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

-- ---------- Backfill current state as the first history entry -----------
-- (so existing rows have at least one anchor record for support tooling)
INSERT INTO public.application_status_history
  (application_id, job_id, applicant_id, employer_id, old_status, new_status, changed_by, reason, reason_my, metadata, created_at)
SELECT a.id, a.job_id, a.applicant_id, j.employer_id, NULL,
       COALESCE(a.status, 'applied'), NULL,
       NULLIF(a.rejection_reason, ''), NULLIF(a.rejection_reason_my, ''),
       jsonb_build_object('backfill', true), COALESCE(a.created_at, now())
FROM public.applications a
LEFT JOIN public.jobs j ON j.id = a.job_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.application_status_history h WHERE h.application_id = a.id
);

INSERT INTO public.job_status_history
  (job_id, employer_id, old_status, new_status, changed_by, reason, metadata, created_at)
SELECT j.id, j.employer_id, NULL, COALESCE(j.status, 'pending'), NULL,
       NULLIF(j.rejection_reason, ''), jsonb_build_object('backfill', true),
       COALESCE(j.created_at, now())
FROM public.jobs j
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_status_history h WHERE h.job_id = j.id
);
