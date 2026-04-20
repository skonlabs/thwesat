INSERT INTO public.payment_requests (
  user_id, payment_method, payment_type, amount, currency, reference_id, proof_url, status
)
SELECT
  '112e4a7d-905e-40c4-8916-3a0a8a85f293'::uuid,
  'kbzpay',
  'subscription',
  25,
  'USD',
  'premium_6mo',
  'seed://e2e-test-proof.png',
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_requests
  WHERE user_id = '112e4a7d-905e-40c4-8916-3a0a8a85f293'::uuid
    AND status = 'pending'
    AND created_at > now() - interval '1 hour'
);