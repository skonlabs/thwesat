UPDATE public.profiles
SET has_payoneer = false
WHERE has_payoneer IS TRUE;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_no_payoneer_supported;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_payoneer_supported
  CHECK (has_payoneer IS NOT TRUE);