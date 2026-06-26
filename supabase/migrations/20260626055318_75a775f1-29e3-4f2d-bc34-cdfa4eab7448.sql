-- Fix signup failure: trigger-invoked mint_referral_codes was raising not_authenticated
-- because auth.uid() is NULL during the auth.users insert transaction.
CREATE OR REPLACE FUNCTION public._trg_mint_referral_codes_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt int;
  v_code text;
BEGIN
  -- Inline mint (no auth.uid() guard — safe because trigger only fires
  -- on INSERT of a new profile row, scoped to NEW.id).
  FOR v_attempt IN 1..10 LOOP
    LOOP
      v_code := 'TS-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
      BEGIN
        INSERT INTO public.referral_codes(code, owner_id) VALUES (v_code, NEW.id);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$function$;