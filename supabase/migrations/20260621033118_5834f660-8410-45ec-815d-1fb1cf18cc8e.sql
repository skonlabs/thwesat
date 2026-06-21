
-- 1. Drop unused service-role key helper
DROP FUNCTION IF EXISTS public._get_service_role_key();

-- 2. Remove over-permissive partner UPDATE policies (partners stay read-only on these tables)
DROP POLICY IF EXISTS "Partners update employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Partners update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Partners update mentor profiles" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Partners update posts" ON public.community_posts;
DROP POLICY IF EXISTS "Partners update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Partners can update jobs" ON public.jobs;

-- 3. Lock ownership columns on mentor_bookings updates
DROP POLICY IF EXISTS "Mentors can update booking status" ON public.mentor_bookings;
CREATE POLICY "Mentors can update booking status"
ON public.mentor_bookings
FOR UPDATE
TO authenticated
USING ((auth.uid() = mentor_id) OR (auth.uid() = mentee_id))
WITH CHECK (
  (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  AND mentor_id = (SELECT mentor_id FROM public.mentor_bookings b WHERE b.id = mentor_bookings.id)
  AND mentee_id = (SELECT mentee_id FROM public.mentor_bookings b WHERE b.id = mentor_bookings.id)
);

-- 4. Lock ownership columns on applications updates by employers
DROP POLICY IF EXISTS "Employers can update application status" ON public.applications;
CREATE POLICY "Employers can update application status"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs
  WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid()
))
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = applications.job_id AND jobs.employer_id = auth.uid()
  )
  AND applicant_id = (SELECT applicant_id FROM public.applications a WHERE a.id = applications.id)
  AND job_id = (SELECT job_id FROM public.applications a WHERE a.id = applications.id)
);

-- 5. Lock ownership on applicant-side updates as well
DROP POLICY IF EXISTS "Applicants can update own applications" ON public.applications;
CREATE POLICY "Applicants can update own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = applicant_id)
WITH CHECK (
  auth.uid() = applicant_id
  AND job_id = (SELECT job_id FROM public.applications a WHERE a.id = applications.id)
);

-- 6. Lock employer_id on employer-side job updates
DROP POLICY IF EXISTS "Employers can update own jobs" ON public.jobs;
CREATE POLICY "Employers can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = employer_id)
WITH CHECK (
  auth.uid() = employer_id
  AND employer_id = (SELECT employer_id FROM public.jobs j WHERE j.id = jobs.id)
);
