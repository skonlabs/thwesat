-- 1. Column on jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS employer_type text NOT NULL DEFAULT 'direct';

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_employer_type_check
CHECK (employer_type IN ('direct', 'agent'));

-- 2. Backfill from employer_profiles
UPDATE public.jobs j
SET employer_type = COALESCE(ep.employer_type, 'direct')
FROM public.employer_profiles ep
WHERE ep.id = j.employer_id;

-- 3. Trigger: on insert/update of a job, copy employer_type from the profile
CREATE OR REPLACE FUNCTION public.set_job_employer_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(employer_type, 'direct') INTO NEW.employer_type
  FROM public.employer_profiles
  WHERE id = NEW.employer_id;
  IF NEW.employer_type IS NULL THEN NEW.employer_type := 'direct'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_job_employer_type ON public.jobs;
CREATE TRIGGER trg_set_job_employer_type
BEFORE INSERT OR UPDATE OF employer_id ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_job_employer_type();

-- 4. Trigger: when an employer changes their type, propagate to all their jobs
CREATE OR REPLACE FUNCTION public.propagate_employer_type_to_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employer_type IS DISTINCT FROM OLD.employer_type THEN
    UPDATE public.jobs SET employer_type = NEW.employer_type WHERE employer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_employer_type ON public.employer_profiles;
CREATE TRIGGER trg_propagate_employer_type
AFTER UPDATE OF employer_type ON public.employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.propagate_employer_type_to_jobs();