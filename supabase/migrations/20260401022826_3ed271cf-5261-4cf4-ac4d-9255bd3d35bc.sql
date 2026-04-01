-- 1. Fix delegate_tokens: restrict public SELECT to only non-revoked, non-expired tokens (hide owner_id)
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.delegate_tokens;
CREATE POLICY "Anyone can validate tokens"
ON public.delegate_tokens FOR SELECT
TO authenticated
USING (is_revoked = false AND expires_at > now());

-- 2. Moderators can DELETE community_posts
CREATE POLICY "Admins can delete any post"
ON public.community_posts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 3. Admin SELECT on applications (for dashboard counts and employer-applications)
CREATE POLICY "Admins can view all applications"
ON public.applications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Admin SELECT on mentor_bookings (for analytics counts)
CREATE POLICY "Admins can view all bookings"
ON public.mentor_bookings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Admin SELECT on subscriptions (for analytics)
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Admin SELECT on mentor_earnings (for analytics)
CREATE POLICY "Admins can view all earnings"
ON public.mentor_earnings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Admin SELECT on employer_profiles for verification management
CREATE POLICY "Admins can update employer profiles"
ON public.employer_profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));