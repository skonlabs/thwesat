CREATE POLICY "Partners read own partner row"
ON public.partners
FOR SELECT
TO authenticated
USING (user_id = auth.uid());