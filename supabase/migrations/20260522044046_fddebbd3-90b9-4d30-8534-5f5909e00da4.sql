
-- 1. Link partners to user accounts
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

-- 2. Partner referral codes (immutable, one-time use)
CREATE TABLE IF NOT EXISTS public.partner_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used')),
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_referral_codes_partner ON public.partner_referral_codes(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_codes_code ON public.partner_referral_codes(code);

ALTER TABLE public.partner_referral_codes ENABLE ROW LEVEL SECURITY;

-- Partners can read their own codes; admins read all
CREATE POLICY "Partners read own codes"
ON public.partner_referral_codes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_referral_codes.partner_id AND p.user_id = auth.uid())
);

-- NO INSERT/UPDATE/DELETE policies — all mutation flows through SECURITY DEFINER RPCs.

-- 3. Helper: get partner_id for current user
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- 4. Mint partner referral codes (batches of 10 by default)
CREATE OR REPLACE FUNCTION public.mint_partner_referral_codes(_count int DEFAULT 10)
RETURNS SETOF public.partner_referral_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner_id uuid;
  _new_code text;
  _i int;
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
      _new_code := 'P-' || upper(substr(encode(gen_random_bytes(5), 'base32'), 1, 8));
      _new_code := regexp_replace(_new_code, '[^A-Z0-9-]', '', 'g');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.partner_referral_codes WHERE code = _new_code)
        AND NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _new_code);
    END LOOP;
    RETURN QUERY INSERT INTO public.partner_referral_codes (partner_id, code)
      VALUES (_partner_id, _new_code) RETURNING *;
  END LOOP;
END;
$$;

-- 5. Lookup partner referral code (returns partner_id if valid + unused)
CREATE OR REPLACE FUNCTION public.lookup_partner_referral_code(_code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT partner_id FROM public.partner_referral_codes
  WHERE code = _code AND status = 'unused' LIMIT 1;
$$;

-- 6. Redeem partner referral code at signup: mark used + write partner_attributions
CREATE OR REPLACE FUNCTION public.redeem_partner_referral_code(_code text, _user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner_id uuid;
BEGIN
  IF _user_id IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  UPDATE public.partner_referral_codes
  SET status = 'used', used_by = _user_id, used_at = now()
  WHERE code = _code AND status = 'unused'
  RETURNING partner_id INTO _partner_id;

  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already-used referral code';
  END IF;

  -- Attribute the user to the partner (idempotent on user_id)
  INSERT INTO public.partner_attributions (partner_id, user_id, channel, attribution_source, created_by)
  VALUES (_partner_id, _user_id, 'referral_code', _code, _user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN _partner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mint_partner_referral_codes(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_partner_referral_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_partner_referral_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated;
