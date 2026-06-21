
-- =========================================================
-- 1. APPLICATIONS — replace fragile self-subquery WITH CHECKs
-- =========================================================
DROP POLICY IF EXISTS "Applicants can update own applications" ON public.applications;
CREATE POLICY "Applicants can update own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Employers can update application status" ON public.applications;
CREATE POLICY "Employers can update application status"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs
  WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs
  WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.applications_lock_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.applicant_id IS DISTINCT FROM OLD.applicant_id THEN
    RAISE EXCEPTION 'applicant_id cannot be changed';
  END IF;
  IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'job_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_lock_ownership ON public.applications;
CREATE TRIGGER trg_applications_lock_ownership
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_lock_ownership();

-- =========================================================
-- 2. MENTOR_BOOKINGS — same fix
-- =========================================================
DROP POLICY IF EXISTS "Mentors can update booking status" ON public.mentor_bookings;
CREATE POLICY "Mentors can update booking status"
ON public.mentor_bookings
FOR UPDATE
TO authenticated
USING ((auth.uid() = mentor_id) OR (auth.uid() = mentee_id))
WITH CHECK ((auth.uid() = mentor_id) OR (auth.uid() = mentee_id));

CREATE OR REPLACE FUNCTION public.mentor_bookings_lock_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mentor_id IS DISTINCT FROM OLD.mentor_id THEN
    RAISE EXCEPTION 'mentor_id cannot be changed';
  END IF;
  IF NEW.mentee_id IS DISTINCT FROM OLD.mentee_id THEN
    RAISE EXCEPTION 'mentee_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_bookings_lock_ownership ON public.mentor_bookings;
CREATE TRIGGER trg_mentor_bookings_lock_ownership
BEFORE UPDATE ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.mentor_bookings_lock_ownership();

-- =========================================================
-- 3. JOBS — same fix
-- =========================================================
DROP POLICY IF EXISTS "Employers can update own jobs" ON public.jobs;
CREATE POLICY "Employers can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = employer_id)
WITH CHECK (auth.uid() = employer_id);

CREATE OR REPLACE FUNCTION public.jobs_lock_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins/moderators to reassign if ever needed; block the regular employer path.
  IF NEW.employer_id IS DISTINCT FROM OLD.employer_id
     AND NOT (public.has_role(auth.uid(), 'admin'::app_role)
              OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'employer_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_lock_ownership ON public.jobs;
CREATE TRIGGER trg_jobs_lock_ownership
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.jobs_lock_ownership();
