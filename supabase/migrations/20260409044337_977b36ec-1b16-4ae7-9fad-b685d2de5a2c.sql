-- =============================================
-- 1. Allow conversations to be updated (needed by update_conversation_last_message trigger)
-- =============================================
DROP POLICY IF EXISTS "System can update conversations" ON public.conversations;
CREATE POLICY "System can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- =============================================
-- 2. Allow referrals to be updated (needed for referral reward flow)
-- =============================================
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;
CREATE POLICY "Users can update own referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. Create triggers on PUBLIC schema tables
-- =============================================

-- Applicant count trigger
DROP TRIGGER IF EXISTS on_application_created ON public.applications;
CREATE TRIGGER on_application_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.increment_applicant_count();

-- Conversation last_message_at trigger
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Referral reward trigger
DROP TRIGGER IF EXISTS on_referral_status_change ON public.referrals;
CREATE TRIGGER on_referral_status_change
  AFTER UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.on_referral_completed();

-- Referral code generation trigger
DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- updated_at triggers
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