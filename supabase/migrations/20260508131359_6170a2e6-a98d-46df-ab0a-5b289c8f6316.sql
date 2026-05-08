CREATE POLICY "Authenticated can view employer profiles"
ON public.employer_profiles
FOR SELECT
TO authenticated
USING (true);