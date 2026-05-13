ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'job_seeker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mentor';