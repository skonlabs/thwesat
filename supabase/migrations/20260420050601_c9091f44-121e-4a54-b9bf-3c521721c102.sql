-- Cleanup: remove duplicate triggers across public + auth schemas.
-- Each table keeps exactly one trigger per intent. All retained triggers reference
-- existing columns (audited 2026-04-20).

-- applications: 4 updated_at triggers, 2 applicant-count triggers
DROP TRIGGER IF EXISTS applications_updated_at ON public.applications;
DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
DROP TRIGGER IF EXISTS set_updated_at_applications ON public.applications;
DROP TRIGGER IF EXISTS on_application_created ON public.applications;
CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- keeps: on_application_increment_count

-- community_posts
DROP TRIGGER IF EXISTS community_posts_updated_at ON public.community_posts;
-- keeps: set_updated_at_community_posts

-- employer_profiles
DROP TRIGGER IF EXISTS employer_profiles_updated_at ON public.employer_profiles;
-- keeps: set_updated_at_employer_profiles

-- jobs
DROP TRIGGER IF EXISTS jobs_updated_at ON public.jobs;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
-- keeps: set_updated_at_jobs

-- mentor_bookings
DROP TRIGGER IF EXISTS mentor_bookings_updated_at ON public.mentor_bookings;
DROP TRIGGER IF EXISTS update_mentor_bookings_updated_at ON public.mentor_bookings;
-- keeps: set_updated_at_mentor_bookings

-- mentor_profiles
DROP TRIGGER IF EXISTS mentor_profiles_updated_at ON public.mentor_profiles;
-- keeps: set_updated_at_mentor_profiles

-- messages: 2 last-message triggers
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
-- keeps: on_new_message_update_conversation

-- profiles: 3 updated_at, 2 referral-code, redundant settings (settings also fires from auth.users)
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS profiles_generate_referral ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_create_settings ON public.profiles;
-- keeps: set_updated_at_profiles, on_profile_created_referral

-- referrals
DROP TRIGGER IF EXISTS on_referral_status_change ON public.referrals;
-- keeps: trigger_referral_completed

-- scam_reports
DROP TRIGGER IF EXISTS scam_reports_updated_at ON public.scam_reports;
-- keeps: set_updated_at_scam_reports

-- subscriptions
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
-- keeps: set_updated_at_subscriptions

-- auth.users: handle_new_user_role exists twice
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
-- keeps: on_auth_user_created (profile), on_auth_user_created_assign_role, on_auth_user_created_settings