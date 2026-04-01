
-- 1. Fix community_posts SELECT: unapproved posts should only be visible to author + admin/moderator
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
CREATE POLICY "Anyone can view approved posts"
ON public.community_posts FOR SELECT
TO authenticated
USING (
  is_approved = true
  OR auth.uid() = author_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. Allow admins to INSERT user_roles (for role management)
CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create a SECURITY DEFINER function to set user role on signup
-- This bypasses RLS so the signup flow can assign the correct role
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
