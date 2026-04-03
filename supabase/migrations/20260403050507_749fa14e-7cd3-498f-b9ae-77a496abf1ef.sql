ALTER TABLE public.mentor_bookings
ADD COLUMN proposed_date text DEFAULT NULL,
ADD COLUMN proposed_time text DEFAULT NULL,
ADD COLUMN decline_reason text DEFAULT NULL;