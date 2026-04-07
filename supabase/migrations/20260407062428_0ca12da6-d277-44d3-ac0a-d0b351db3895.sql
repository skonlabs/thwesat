
-- Allow admins to delete profiles (for user removal)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow employers to delete their own jobs
CREATE POLICY "Employers can delete own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = employer_id);

-- Allow admins to delete any job
CREATE POLICY "Admins can delete any job"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
