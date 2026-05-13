
-- Fix trigger to use reviewed_at (the actual approval timestamp)
CREATE OR REPLACE FUNCTION public.partner_mark_first_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.partner_attributions
       SET first_paid_at = COALESCE(first_paid_at, NEW.reviewed_at, NEW.updated_at, now())
     WHERE user_id = NEW.user_id
       AND first_paid_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.partner_mark_first_paid() FROM PUBLIC, anon, authenticated;

-- Backfill first_paid_at for existing attributions from earliest approved MMK payment
UPDATE public.partner_attributions a
   SET first_paid_at = sub.first_paid
  FROM (
    SELECT user_id, MIN(COALESCE(reviewed_at, updated_at, created_at)) AS first_paid
      FROM public.payment_requests
     WHERE status = 'approved'
       AND COALESCE(currency, 'MMK') = 'MMK'
     GROUP BY user_id
  ) sub
 WHERE a.user_id = sub.user_id
   AND a.first_paid_at IS NULL;
