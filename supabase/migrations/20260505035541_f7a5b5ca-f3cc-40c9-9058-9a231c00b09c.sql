
-- Restrict payment_type to currently supported values across all roles.
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_type_valid;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_type_valid
  CHECK (payment_type IN ('mentor_session','placement_fee'));

ALTER TABLE public.payment_requests
  ALTER COLUMN payment_type DROP DEFAULT;
