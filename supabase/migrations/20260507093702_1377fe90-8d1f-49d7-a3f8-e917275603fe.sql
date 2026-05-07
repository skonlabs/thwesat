
-- 1) Revoke column-level SELECT on sensitive profile contact fields
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated;

-- 2) Notifications: add created_by audit column and tighten INSERT policy
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

CREATE OR REPLACE FUNCTION public.set_notification_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.created_by_user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_notification_created_by ON public.notifications;
CREATE TRIGGER trg_set_notification_created_by
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_notification_created_by();

-- Helper: can the current user notify _target_user_id?
CREATE OR REPLACE FUNCTION public.can_notify(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- self-notifications always fine
    auth.uid() = _target_user_id
    -- admins / moderators
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    -- shared conversation
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = _target_user_id
    )
    -- employer/agent ↔ applicant via applications
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE (a.applicant_id = auth.uid() AND j.employer_id = _target_user_id)
         OR (a.applicant_id = _target_user_id AND j.employer_id = auth.uid())
    )
    -- mentor ↔ mentee via bookings
    OR EXISTS (
      SELECT 1 FROM public.mentor_bookings b
      WHERE (b.mentor_id = auth.uid() AND b.mentee_id = _target_user_id)
         OR (b.mentor_id = _target_user_id AND b.mentee_id = auth.uid())
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_notify(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_notify(uuid) TO authenticated;

-- Replace permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users can create allowed notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.can_notify(user_id));
