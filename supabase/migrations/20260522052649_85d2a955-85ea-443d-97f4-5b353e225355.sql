CREATE OR REPLACE FUNCTION public.mint_partner_referral_codes(_count integer DEFAULT 10)
RETURNS SETOF public.partner_referral_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner_id uuid;
  _new_code text;
  _i int;
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _j int;
BEGIN
  IF NOT has_role(auth.uid(), 'partner'::app_role) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only partners can mint partner referral codes';
  END IF;

  SELECT id INTO _partner_id FROM public.partners WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'No active partner record linked to this account';
  END IF;

  IF _count < 1 OR _count > 100 THEN
    RAISE EXCEPTION 'Count must be between 1 and 100';
  END IF;

  FOR _i IN 1.._count LOOP
    LOOP
      _new_code := 'P-';
      FOR _j IN 1..8 LOOP
        _new_code := _new_code || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.partner_referral_codes WHERE code = _new_code)
        AND NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _new_code);
    END LOOP;
    RETURN QUERY INSERT INTO public.partner_referral_codes (partner_id, code)
      VALUES (_partner_id, _new_code) RETURNING *;
  END LOOP;
END;
$$;