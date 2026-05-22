
-- Enforce: every partner_attributions row must be backed by a redeemed
-- partner_referral_codes row (used_by = user_id, partner_id matches).
-- Applies to manual admin inserts as well; the redeem RPC writes the
-- referral_codes row first so it remains valid.

CREATE OR REPLACE FUNCTION public.enforce_partner_attribution_has_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_referral_codes prc
    WHERE prc.partner_id = NEW.partner_id
      AND prc.used_by = NEW.user_id
      AND prc.status = 'used'
  ) THEN
    RAISE EXCEPTION 'partner_attribution_requires_redeemed_code: user % must redeem a referral code issued by partner %', NEW.user_id, NEW.partner_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_partner_attribution_has_code ON public.partner_attributions;
CREATE TRIGGER trg_enforce_partner_attribution_has_code
  BEFORE INSERT ON public.partner_attributions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_attribution_has_code();
