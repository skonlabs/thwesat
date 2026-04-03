-- Add is_featured column to jobs
ALTER TABLE public.jobs ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create index for featured jobs queries
CREATE INDEX idx_jobs_is_featured ON public.jobs (is_featured) WHERE is_featured = true;