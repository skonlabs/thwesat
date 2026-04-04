-- Allow moderators to view all payment requests (read-only)
CREATE POLICY "Moderators can view all payment requests"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all mentor bookings
CREATE POLICY "Moderators can view all bookings"
ON public.mentor_bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));