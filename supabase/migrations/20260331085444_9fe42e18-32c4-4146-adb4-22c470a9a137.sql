
-- ============================================================
-- 1. PROFILES: add missing fields from EditProfile UI
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_work_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_payoneer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_wise BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_upwork BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_laptop BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS internet_stable BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. JOBS: rename reserved word "type" → "job_type", add missing cols
-- ============================================================
ALTER TABLE public.jobs RENAME COLUMN type TO job_type;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS requirements_my TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS requires_embassy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_work_permit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_method TEXT DEFAULT 'platform' CHECK (application_method IN ('platform', 'external', 'email')),
  ADD COLUMN IF NOT EXISTS external_url TEXT DEFAULT '';

-- Drop old CHECK and re-add with correct column name
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check
  CHECK (job_type IN ('full-time', 'part-time', 'contract', 'remote', 'hybrid'));

-- ============================================================
-- 3. COMMUNITY_POSTS: rename content → content_my for clarity, keep content_en
-- ============================================================
ALTER TABLE public.community_posts RENAME COLUMN content TO content_my;

-- ============================================================
-- 4. CONVERSATIONS: add last_message_at for sort ordering
-- ============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 5. MESSAGES: add is_read for unread tracking
-- ============================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 6. AUTO-UPDATE conversations.last_message_at on new message
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================================
-- 7. AUTO-UPDATE updated_at on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
