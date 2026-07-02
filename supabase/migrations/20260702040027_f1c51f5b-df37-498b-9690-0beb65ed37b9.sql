
CREATE OR REPLACE FUNCTION public.mentor_bookings_reconcile_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric;
  v_expected integer;
BEGIN
  SELECT COALESCE(hourly_rate, 0) INTO v_rate
  FROM public.mentor_profiles WHERE id = NEW.mentor_id;

  IF v_rate > 0 AND NEW.duration_minutes IS NOT NULL THEN
    v_expected := ROUND(v_rate * NEW.duration_minutes / 60.0);
  ELSE
    v_expected := 5000;
  END IF;

  NEW.credits_charged := v_expected;
  RETURN NEW;
END;
$function$;
