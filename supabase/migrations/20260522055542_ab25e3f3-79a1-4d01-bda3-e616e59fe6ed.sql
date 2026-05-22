
-- Restrict topup_requests payment methods to the 4 supported providers
ALTER TABLE public.topup_requests DROP CONSTRAINT IF EXISTS topup_requests_payment_method_check;
UPDATE public.topup_requests SET payment_method = 'kbzpay' WHERE payment_method NOT IN ('kbzpay','cbpay','wavepay','ayapay');
ALTER TABLE public.topup_requests ADD CONSTRAINT topup_requests_payment_method_check
  CHECK (payment_method IN ('kbzpay','cbpay','wavepay','ayapay'));

-- Fix jobs.payment_methods allowed set (was stuck on legacy 'Wise')
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_payment_methods_supported;
UPDATE public.jobs
  SET payment_methods = ARRAY(
    SELECT m FROM unnest(payment_methods) AS m
    WHERE m IN ('kbzpay','cbpay','wavepay','ayapay')
  )
  WHERE payment_methods IS NOT NULL;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_payment_methods_supported
  CHECK (payment_methods IS NULL OR payment_methods <@ ARRAY['kbzpay','cbpay','wavepay','ayapay']);
