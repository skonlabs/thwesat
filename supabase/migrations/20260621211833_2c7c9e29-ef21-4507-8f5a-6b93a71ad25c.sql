-- Backfill: every employer/agent without an employer_profiles row gets one (pending).
INSERT INTO public.employer_profiles (id, verification_status, is_verified)
SELECT p.id, 'pending', false
FROM public.profiles p
LEFT JOIN public.employer_profiles ep ON ep.id = p.id
WHERE p.primary_role IN ('employer', 'agent')
  AND ep.id IS NULL;

-- Trigger: auto-create an employer_profiles row whenever a profile becomes an employer/agent
CREATE OR REPLACE FUNCTION public.ensure_employer_profile_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.primary_role IN ('employer', 'agent') THEN
    INSERT INTO public.employer_profiles (id, verification_status, is_verified)
    VALUES (NEW.id, 'pending', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_employer_profile_on_role ON public.profiles;
CREATE TRIGGER trg_ensure_employer_profile_on_role
AFTER INSERT OR UPDATE OF primary_role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_employer_profile_on_role();