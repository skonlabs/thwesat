CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_input text := upper(coalesce(_code, ''));
  v_match text[];
  v_normalized text;
  v_referrer uuid;
BEGIN
  -- Extract a ThweSat referral code from either a bare code or a copied signup URL.
  v_match := regexp_match(v_input, '(^|[^A-Z0-9])(TS[^A-Z0-9]*[A-F0-9]{6})([^A-Z0-9]|$)');
  v_normalized := regexp_replace(coalesce(v_match[2], v_input), '[^A-Z0-9]', '', 'g');

  -- Also accept the short six-character suffix for users who omit the TS prefix.
  IF length(v_normalized) = 6 THEN
    v_normalized := 'TS' || v_normalized;
  END IF;

  SELECT p.id INTO v_referrer
  FROM public.profiles p
  WHERE p.referral_code IS NOT NULL
    AND regexp_replace(upper(p.referral_code), '[^A-Z0-9]', '', 'g') = v_normalized
  LIMIT 1;

  RETURN v_referrer;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_referrer_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_referrer_by_code(text) TO anon, authenticated;