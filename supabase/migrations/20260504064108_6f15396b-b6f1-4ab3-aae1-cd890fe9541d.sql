ALTER TABLE public.employer_profiles
ADD COLUMN IF NOT EXISTS employer_type text NOT NULL DEFAULT 'direct';

ALTER TABLE public.employer_profiles
ADD CONSTRAINT employer_profiles_employer_type_check
CHECK (employer_type IN ('direct', 'agent'));