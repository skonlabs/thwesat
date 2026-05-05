ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_method_valid;

UPDATE public.payment_requests
SET payment_method = CASE
  WHEN payment_method = 'wave' THEN 'wavepay'
  ELSE 'kbzpay'
END
WHERE payment_method IS NULL
   OR payment_method NOT IN ('kbzpay','cbpay','wavepay','ayapay');

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_method_valid
  CHECK (payment_method IN ('kbzpay','cbpay','wavepay','ayapay'));