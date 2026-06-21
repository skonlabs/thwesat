CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'partner')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_confirm_user_email(uuid) TO authenticated;

UPDATE auth.users u
SET email_confirmed_at = now()
FROM public.employer_profiles ep
WHERE ep.id = u.id
  AND ep.verification_status IN ('verified','approved')
  AND u.email_confirmed_at IS NULL;