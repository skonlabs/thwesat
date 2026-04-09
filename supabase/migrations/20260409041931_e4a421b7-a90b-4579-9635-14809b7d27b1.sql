
-- 1. Fix notifications RLS
DROP POLICY IF EXISTS "Insert notifications for own user or admin" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Allow admins to manage subscriptions
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Safely create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

DROP TRIGGER IF EXISTS on_application_created ON public.applications;
CREATE TRIGGER on_application_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.increment_applicant_count();

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

DROP TRIGGER IF EXISTS on_referral_status_change ON public.referrals;
CREATE TRIGGER on_referral_status_change
  AFTER UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.on_referral_completed();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_mentor_bookings_updated_at ON public.mentor_bookings;
CREATE TRIGGER update_mentor_bookings_updated_at
  BEFORE UPDATE ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
