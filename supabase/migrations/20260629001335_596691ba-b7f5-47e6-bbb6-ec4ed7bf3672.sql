
CREATE OR REPLACE FUNCTION public.get_my_contact_info()
RETURNS TABLE(email text, phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.email::text, u.phone::text
  FROM auth.users u
  WHERE u.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_contact_info() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
