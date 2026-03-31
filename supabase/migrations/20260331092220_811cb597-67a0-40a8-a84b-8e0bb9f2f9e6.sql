
-- ============================================
-- 1. NEW TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'my',
  push_notifications boolean NOT NULL DEFAULT true,
  remember_device boolean NOT NULL DEFAULT false,
  session_expiry text NOT NULL DEFAULT '24h',
  telegram_chat_id text DEFAULT '',
  telegram_username text DEFAULT '',
  telegram_linked boolean NOT NULL DEFAULT false,
  telegram_linked_at timestamptz DEFAULT NULL,
  font_encoding text NOT NULL DEFAULT 'unicode',
  profile_visibility text NOT NULL DEFAULT 'members',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.mentor_mentees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  goals text DEFAULT '',
  notes text DEFAULT '',
  sessions_completed integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (mentor_id, mentee_id)
);
ALTER TABLE public.mentor_mentees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentors can view own mentees" ON public.mentor_mentees FOR SELECT TO authenticated USING (auth.uid() = mentor_id);
CREATE POLICY "Mentees can view own mentors" ON public.mentor_mentees FOR SELECT TO authenticated USING (auth.uid() = mentee_id);
CREATE POLICY "Users can create mentor relationships" ON public.mentor_mentees FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Users can update mentor relationships" ON public.mentor_mentees FOR UPDATE TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE TABLE IF NOT EXISTS public.mentor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  booking_id uuid DEFAULT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mentor_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentors can view own earnings" ON public.mentor_earnings FOR SELECT TO authenticated USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors can insert own earnings" ON public.mentor_earnings FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id);

CREATE TABLE IF NOT EXISTS public.cv_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'cv',
  file_size_bytes integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own documents" ON public.cv_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. MISSING COLUMNS
-- ============================================

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz DEFAULT NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS placement_salary numeric DEFAULT NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS placement_fee numeric DEFAULT NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS forwarded_to_email text DEFAULT '';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS cv_document_id uuid DEFAULT NULL;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0;

-- ============================================
-- 3. MISSING RLS POLICIES
-- ============================================

CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid()));

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Applicants can update own applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = applicant_id);

CREATE POLICY "Admins can update reports" ON public.scam_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGERS (drop-if-exists then create)
-- ============================================

DROP TRIGGER IF EXISTS profiles_generate_referral ON public.profiles;
DROP TRIGGER IF EXISTS on_new_message_update_conversation ON public.messages;
DROP TRIGGER IF EXISTS on_profile_create_settings ON public.profiles;
DROP TRIGGER IF EXISTS on_application_increment_count ON public.applications;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_jobs ON public.jobs;
DROP TRIGGER IF EXISTS set_updated_at_applications ON public.applications;
DROP TRIGGER IF EXISTS set_updated_at_mentor_profiles ON public.mentor_profiles;
DROP TRIGGER IF EXISTS set_updated_at_mentor_bookings ON public.mentor_bookings;
DROP TRIGGER IF EXISTS set_updated_at_employer_profiles ON public.employer_profiles;
DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON public.subscriptions;
DROP TRIGGER IF EXISTS set_updated_at_notifications ON public.notifications;
DROP TRIGGER IF EXISTS set_updated_at_scam_reports ON public.scam_reports;
DROP TRIGGER IF EXISTS set_updated_at_conversations ON public.conversations;
DROP TRIGGER IF EXISTS set_updated_at_community_posts ON public.community_posts;

CREATE TRIGGER profiles_generate_referral BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();
CREATE TRIGGER on_new_message_update_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_jobs BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_applications BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_mentor_profiles BEFORE UPDATE ON public.mentor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_mentor_bookings BEFORE UPDATE ON public.mentor_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_employer_profiles BEFORE UPDATE ON public.employer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_user_settings BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_mentor_mentees BEFORE UPDATE ON public.mentor_mentees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_mentor_earnings BEFORE UPDATE ON public.mentor_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_cv_documents BEFORE UPDATE ON public.cv_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_scam_reports BEFORE UPDATE ON public.scam_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at_community_posts BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create user_settings on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_profile_create_settings AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Auto-increment applicant_count
CREATE OR REPLACE FUNCTION public.increment_applicant_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.jobs SET applicant_count = COALESCE(applicant_count, 0) + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_application_increment_count AFTER INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.increment_applicant_count();
