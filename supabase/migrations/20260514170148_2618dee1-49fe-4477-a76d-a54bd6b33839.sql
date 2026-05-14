CREATE OR REPLACE FUNCTION public.validate_job_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'paused', 'closed', 'rejected') THEN
    RAISE EXCEPTION 'invalid_job_status';
  END IF;

  IF NEW.expires_at IS NOT NULL
     AND NEW.status IN ('pending', 'active')
     AND NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'job_expiry_must_be_future';
  END IF;

  RETURN NEW;
END;
$$;