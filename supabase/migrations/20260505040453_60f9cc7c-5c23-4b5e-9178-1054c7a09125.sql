UPDATE public.jobs
SET payment_methods = COALESCE((
  SELECT array_agg(DISTINCT method ORDER BY method)
  FROM unnest(payment_methods) AS method
  WHERE method = 'Wise'
), ARRAY[]::text[])
WHERE payment_methods IS NOT NULL
  AND NOT (payment_methods <@ ARRAY['Wise']::text[]);

UPDATE public.employer_profiles
SET payment_methods = COALESCE((
  SELECT array_agg(DISTINCT method ORDER BY method)
  FROM unnest(payment_methods) AS method
  WHERE method = 'Wise'
), ARRAY[]::text[])
WHERE payment_methods IS NOT NULL
  AND NOT (payment_methods <@ ARRAY['Wise']::text[]);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_payment_methods_supported;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_payment_methods_supported
  CHECK (payment_methods IS NULL OR payment_methods <@ ARRAY['Wise']::text[]);

ALTER TABLE public.employer_profiles
  DROP CONSTRAINT IF EXISTS employer_profiles_payment_methods_supported;

ALTER TABLE public.employer_profiles
  ADD CONSTRAINT employer_profiles_payment_methods_supported
  CHECK (payment_methods IS NULL OR payment_methods <@ ARRAY['Wise']::text[]);