
-- 1. Admin/Moderator can UPDATE jobs (approve/reject)
CREATE POLICY "Admins can update any job"
ON public.jobs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- 2. Admin/Moderator can UPDATE community_posts (moderate)
CREATE POLICY "Admins can update any post"
ON public.community_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- 3. Admin/Moderator can SELECT all jobs (including pending)
CREATE POLICY "Admins can view all jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- 4. Auto-assign 'user' role on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Create CV storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-documents', 'cv-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS: users can upload their own CVs
CREATE POLICY "Users can upload own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cv-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 7. Employers can view applicant CVs (via applications join)
CREATE POLICY "Employers can view applicant CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv-documents'
  AND EXISTS (
    SELECT 1 FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE j.employer_id = auth.uid()
    AND a.applicant_id::text = (storage.foldername(name))[1]
  )
);
