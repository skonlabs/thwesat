ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_search_status text NOT NULL DEFAULT 'open';

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_job_search_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_job_search_status_check
CHECK (job_search_status IN ('open', 'casual', 'not_looking'));