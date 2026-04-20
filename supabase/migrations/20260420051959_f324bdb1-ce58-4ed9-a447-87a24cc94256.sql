-- Employer subscription tier tracking
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;

-- Per-booking payment status
ALTER TABLE public.mentor_bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Link a payment request to a specific mentor booking
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS booking_id uuid;

CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id
  ON public.payment_requests(booking_id)
  WHERE booking_id IS NOT NULL;