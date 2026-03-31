
-- ============================================================
-- 1. MENTOR PROFILES (from MentorDetail, MentorDashboard)
-- ============================================================
CREATE TABLE public.mentor_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  company TEXT DEFAULT '',
  location TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  bio_my TEXT DEFAULT '',
  expertise TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_available BOOLEAN DEFAULT TRUE,
  available_days TEXT[] DEFAULT '{}',
  rating_avg NUMERIC(3,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_mentees INTEGER DEFAULT 0,
  mentoring_since TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentor profiles" ON public.mentor_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Mentors can update own profile" ON public.mentor_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Mentors can insert own profile" ON public.mentor_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER mentor_profiles_updated_at
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. MENTOR BOOKINGS (from MentorBooking, MentorBookings)
-- ============================================================
CREATE TABLE public.mentor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  topic TEXT DEFAULT '',
  topic_my TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'declined')),
  booked_by TEXT DEFAULT 'mentee' CHECK (booked_by IN ('mentee', 'mentor')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can view own bookings" ON public.mentor_bookings
  FOR SELECT TO authenticated USING (auth.uid() = mentor_id);

CREATE POLICY "Mentees can view own bookings" ON public.mentor_bookings
  FOR SELECT TO authenticated USING (auth.uid() = mentee_id);

CREATE POLICY "Users can create bookings" ON public.mentor_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentee_id OR auth.uid() = mentor_id);

CREATE POLICY "Mentors can update booking status" ON public.mentor_bookings
  FOR UPDATE TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE TRIGGER mentor_bookings_updated_at
  BEFORE UPDATE ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. MENTOR REVIEWS (from MentorDetail, MentorBooking rating)
-- ============================================================
CREATE TABLE public.mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.mentor_bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  review_text_my TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);

ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.mentor_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reviews" ON public.mentor_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- 4. NOTIFICATIONS (from Notifications page)
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_my TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_my TEXT DEFAULT '',
  notification_type TEXT NOT NULL CHECK (notification_type IN ('job', 'application', 'mentor', 'message', 'guide', 'premium', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  link_path TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 5. SUBSCRIPTIONS (from Premium, EmployerSubscription)
-- ============================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium', 'employer_basic', 'employer_standard', 'employer_premium')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  price_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. REFERRALS (from Profile referral code, Signup referral)
-- ============================================================
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);

-- ============================================================
-- 7. GUIDES (from Guides, GuideDetail)
-- ============================================================
CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_my TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_my TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('visa', 'finance', 'legal', 'safety', 'employment', 'general')),
  country TEXT DEFAULT '',
  country_flag TEXT DEFAULT '',
  read_time_minutes INTEGER DEFAULT 5,
  is_new BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT DEFAULT '',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guides" ON public.guides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage guides" ON public.guides
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 8. GUIDE FEEDBACK (from GuideDetail thumbs up/down)
-- ============================================================
CREATE TABLE public.guide_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guide_id, user_id)
);

ALTER TABLE public.guide_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own guide feedback" ON public.guide_feedback
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. EMPLOYER PROFILES (from EmployerOnboarding)
-- ============================================================
CREATE TABLE public.employer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT DEFAULT '',
  company_website TEXT DEFAULT '',
  company_linkedin TEXT DEFAULT '',
  company_description TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  hq_country TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  payment_methods TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view employer profiles" ON public.employer_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Employers can update own profile" ON public.employer_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Employers can insert own profile" ON public.employer_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER employer_profiles_updated_at
  BEFORE UPDATE ON public.employer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 10. DELEGATE TOKENS (from Settings, DelegateAccess)
-- ============================================================
CREATE TABLE public.delegate_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT '{profile_edit}',
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delegate_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own tokens" ON public.delegate_tokens
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Allow anon to read tokens for delegate access validation
CREATE POLICY "Anyone can validate tokens" ON public.delegate_tokens
  FOR SELECT USING (true);

-- ============================================================
-- 11. SCAM REPORTS (from AdminDashboard, Community report)
-- ============================================================
CREATE TABLE public.scam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_entity_type TEXT NOT NULL CHECK (reported_entity_type IN ('job', 'post', 'user', 'message')),
  reported_entity_id UUID NOT NULL,
  reason TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.scam_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.scam_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER scam_reports_updated_at
  BEFORE UPDATE ON public.scam_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 12. POST SAVES / BOOKMARKS (from Community save action)
-- ============================================================
CREATE TABLE public.post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saves" ON public.post_saves
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 13. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Jobs: add skills tags and applicant_count
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicant_count INTEGER DEFAULT 0;

-- Applications: add rejection_reason, interview_date
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_reason_my TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ;

-- Community posts: add moderation fields
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT DEFAULT '';

-- Profiles: add referral_code
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT '';

-- Generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'TS-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_generate_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();
