
-- Allow partners to moderate jobs and verify employers, same as admin/moderator.

-- Jobs: update + delete
DROP POLICY IF EXISTS "Partners can update any job" ON public.jobs;
CREATE POLICY "Partners can update any job"
ON public.jobs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'partner'::public.app_role));

-- Employer profiles: update
DROP POLICY IF EXISTS "Partners can update employer profiles" ON public.employer_profiles;
CREATE POLICY "Partners can update employer profiles"
ON public.employer_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'partner'::public.app_role));

-- Notifications: allow partners to send notifications (job/employer approvals)
CREATE OR REPLACE FUNCTION public.can_notify(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _target_user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    OR public.has_role(auth.uid(), 'partner'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = _target_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE (a.applicant_id = auth.uid() AND j.employer_id = _target_user_id)
         OR (a.applicant_id = _target_user_id AND j.employer_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.mentor_bookings b
      WHERE (b.mentor_id = auth.uid() AND b.mentee_id = _target_user_id)
         OR (b.mentor_id = _target_user_id AND b.mentee_id = auth.uid())
    );
$$;
