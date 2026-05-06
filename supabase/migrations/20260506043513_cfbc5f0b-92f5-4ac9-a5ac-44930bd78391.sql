CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE referral_code IS NOT NULL
    AND lower(referral_code) = lower(trim(_code))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.lookup_referrer_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_referrer_by_code(text) TO anon, authenticated;