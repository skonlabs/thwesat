SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"f2215b3d-f440-481a-8626-c5c1042c3d08","role":"authenticated"}';

SELECT public.review_payment_request(
  _payment_id := 'b2a3e19f-7f18-451f-ab8e-4fe4eb3847a4'::uuid,
  _new_status := 'approved',
  _admin_note := 'E2E test approval'
);

RESET role;

INSERT INTO public.mentor_availability_slots (mentor_id, day_of_week, start_time, end_time, is_booked)
SELECT '58b8e6b6-23c8-433b-b050-deea888a35af'::uuid, dow, '09:00', '12:00', false
FROM unnest(ARRAY['monday','tuesday','wednesday','thursday','friday']) AS dow
WHERE NOT EXISTS (
  SELECT 1 FROM public.mentor_availability_slots
  WHERE mentor_id = '58b8e6b6-23c8-433b-b050-deea888a35af'::uuid
);

WITH new_booking AS (
  INSERT INTO public.mentor_bookings (
    mentor_id, mentee_id, scheduled_date, scheduled_time, topic, status, payment_status, booked_by
  )
  SELECT
    '58b8e6b6-23c8-433b-b050-deea888a35af'::uuid,
    '112e4a7d-905e-40c4-8916-3a0a8a85f293'::uuid,
    to_char(now() + interval '1 day', 'YYYY-MM-DD'),
    '10:00', 'E2E test session', 'confirmed', 'paid', 'mentee'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mentor_bookings
    WHERE mentor_id = '58b8e6b6-23c8-433b-b050-deea888a35af'::uuid
      AND mentee_id = '112e4a7d-905e-40c4-8916-3a0a8a85f293'::uuid
      AND topic = 'E2E test session'
  )
  RETURNING id, mentor_id
)
INSERT INTO public.mentor_earnings (mentor_id, booking_id, amount, currency, status)
SELECT mentor_id, id, 2.50, 'USD', 'pending' FROM new_booking;