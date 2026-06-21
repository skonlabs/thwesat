CREATE OR REPLACE FUNCTION public.lookup_employer_verification_status(_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid;
  _role text;
  _status text;
BEGIN
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT primary_role INTO _role FROM public.profiles WHERE id = _uid;
  IF _role NOT IN ('employer','agent') THEN RETURN NULL; END IF;
  SELECT verification_status INTO _status FROM public.employer_profiles WHERE id = _uid;
  RETURN _status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_employer_verification_status(text) TO anon, authenticated;