DROP TRIGGER IF EXISTS trg_propagate_employer_type ON public.employer_profiles;
ALTER TABLE public.employer_profiles DROP COLUMN IF EXISTS employer_type CASCADE;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS employer_type CASCADE;