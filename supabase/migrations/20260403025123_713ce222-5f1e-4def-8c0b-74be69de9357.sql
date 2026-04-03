-- Add specific date column to availability slots
ALTER TABLE public.mentor_availability_slots
  ADD COLUMN slot_date date DEFAULT NULL;

-- Add timezone to mentor profiles
ALTER TABLE public.mentor_profiles
  ADD COLUMN timezone text NOT NULL DEFAULT 'Asia/Yangon';

-- Index for date-based queries
CREATE INDEX idx_availability_slot_date ON public.mentor_availability_slots (mentor_id, slot_date) WHERE slot_date IS NOT NULL;