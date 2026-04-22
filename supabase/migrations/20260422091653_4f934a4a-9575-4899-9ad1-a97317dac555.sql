ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS contract_duration_type text,
  ADD COLUMN IF NOT EXISTS contract_duration_months integer,
  ADD COLUMN IF NOT EXISTS contract_duration_note text DEFAULT ''::text;