
-- Fix overly permissive notifications INSERT policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Notifications are inserted by triggers/edge functions, not directly by users
-- Allow insert only if user_id matches the target (for self-notifications) or has admin role
CREATE POLICY "Insert notifications for own user or admin" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  );
