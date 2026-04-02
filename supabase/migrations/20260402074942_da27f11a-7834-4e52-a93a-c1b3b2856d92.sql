
CREATE TABLE public.mentor_availability_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability slots"
  ON public.mentor_availability_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert own slots"
  ON public.mentor_availability_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update own slots"
  ON public.mentor_availability_slots FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can delete own slots"
  ON public.mentor_availability_slots FOR DELETE
  TO authenticated
  USING (auth.uid() = mentor_id);

CREATE INDEX idx_mentor_availability_mentor_id ON public.mentor_availability_slots(mentor_id);
CREATE INDEX idx_mentor_availability_day ON public.mentor_availability_slots(day_of_week);
