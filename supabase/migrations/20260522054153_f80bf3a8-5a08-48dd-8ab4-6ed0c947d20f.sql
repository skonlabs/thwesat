UPDATE public.employer_profiles SET payment_methods = '{}'::text[] WHERE NOT (payment_methods <@ ARRAY['kbzpay','cbpay','wavepay','ayapay']::text[]);
ALTER TABLE public.employer_profiles DROP CONSTRAINT IF EXISTS employer_profiles_payment_methods_supported;
ALTER TABLE public.employer_profiles ADD CONSTRAINT employer_profiles_payment_methods_supported
  CHECK (payment_methods IS NULL OR payment_methods <@ ARRAY['kbzpay','cbpay','wavepay','ayapay']::text[]);