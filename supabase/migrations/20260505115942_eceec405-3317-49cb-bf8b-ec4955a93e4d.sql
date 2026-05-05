-- 1) Revoke direct column-level SELECT on sensitive contact fields from public roles
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated;

-- 2) Secure RPC for admins/moderators to fetch contact info in bulk
CREATE OR REPLACE FUNCTION public.get_user_contacts_admin(_ids uuid[])
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.phone
    FROM public.profiles p
    WHERE p.id = ANY(_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_contacts_admin(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_contacts_admin(uuid[]) TO authenticated;