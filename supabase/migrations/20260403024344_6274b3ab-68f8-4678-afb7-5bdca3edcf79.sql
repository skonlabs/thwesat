ALTER TABLE public.mentor_bookings
  ADD COLUMN mentor_completed_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN mentee_completed_at timestamp with time zone DEFAULT NULL;