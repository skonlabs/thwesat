
-- Remove redundant trigger: sync_applicant_count_trigger already handles INSERT
DROP TRIGGER IF EXISTS on_application_increment_count ON public.applications;

-- Drop the duplicate UNIQUE constraint on guide_feedback (keep guide_feedback_guide_user_unique)
ALTER TABLE public.guide_feedback DROP CONSTRAINT IF EXISTS guide_feedback_guide_id_user_id_key;
