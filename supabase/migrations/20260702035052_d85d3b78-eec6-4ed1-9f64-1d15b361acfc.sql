
CREATE OR REPLACE FUNCTION public.current_partner()
RETURNS SETOF public.partner_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.partner_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_partner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_partner() TO authenticated;
