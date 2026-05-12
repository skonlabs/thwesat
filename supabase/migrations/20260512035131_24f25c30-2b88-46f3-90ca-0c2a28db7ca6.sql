DROP TRIGGER IF EXISTS trg_set_job_employer_type ON public.jobs;
DROP FUNCTION IF EXISTS public.set_job_employer_type();
DROP FUNCTION IF EXISTS public.propagate_employer_type_to_jobs();