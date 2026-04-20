-- Backfill orphan mentor_session payment_requests:
-- Both reference mentor_id 4ed9eadb-211b-4566-bbdc-c894d3bf2b13.
-- The rejected $5 payment matches the 12:45:01 booking (created just before).
-- The approved $2.50 payment matches the 12:49:13 booking (created just before).

UPDATE public.payment_requests
SET booking_id = '0373a1bd-e12b-4aef-a09b-e8cb6393c536'::uuid
WHERE id = '639fad6b-2f33-4814-a14a-86f8c57f50d5'::uuid
  AND booking_id IS NULL;

UPDATE public.payment_requests
SET booking_id = '33f78d94-f273-47dd-aa64-d445b78b8481'::uuid
WHERE id = 'ff3c30dc-d2e3-4a90-9349-3efd25ac82ba'::uuid
  AND booking_id IS NULL;

-- Mark the linked booking as paid (since payment ff3c30dc... is approved).
UPDATE public.mentor_bookings
SET payment_status = 'paid'
WHERE id = '33f78d94-f273-47dd-aa64-d445b78b8481'::uuid
  AND payment_status <> 'paid';

-- Create the missing mentor_earnings row for the approved payment.
-- Mentor takes 100% of the $2.50 (matches existing payment system flow; adjust if a fee schedule exists).
INSERT INTO public.mentor_earnings (mentor_id, booking_id, amount, currency, status)
SELECT '4ed9eadb-211b-4566-bbdc-c894d3bf2b13'::uuid,
       '33f78d94-f273-47dd-aa64-d445b78b8481'::uuid,
       2.50,
       'USD',
       'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.mentor_earnings
  WHERE booking_id = '33f78d94-f273-47dd-aa64-d445b78b8481'::uuid
);