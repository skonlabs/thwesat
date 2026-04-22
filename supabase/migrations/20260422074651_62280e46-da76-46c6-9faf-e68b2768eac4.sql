
-- Allow the full set of application statuses used by the UI
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status = ANY (ARRAY[
    'applied'::text,
    'submitted'::text,
    'reviewing'::text,
    'viewed'::text,
    'shortlisted'::text,
    'interview'::text,
    'interviewed'::text,
    'offered'::text,
    'placed'::text,
    'rejected'::text,
    'withdrawn'::text
  ]));
