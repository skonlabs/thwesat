ALTER TABLE public.mentor_bookings
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS credits_charged bigint;

-- Backfill historical rows with the legacy flat price so reports stay consistent
UPDATE public.mentor_bookings
SET credits_charged = 5000
WHERE credits_charged IS NULL;

-- Sanity guard on duration values
ALTER TABLE public.mentor_bookings
  DROP CONSTRAINT IF EXISTS mentor_bookings_duration_minutes_check;
ALTER TABLE public.mentor_bookings
  ADD CONSTRAINT mentor_bookings_duration_minutes_check
  CHECK (duration_minutes IN (15, 30, 60, 90, 120));