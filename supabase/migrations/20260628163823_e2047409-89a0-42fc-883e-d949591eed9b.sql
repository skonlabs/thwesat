
-- Build admin id set
WITH admins AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
-- 1) Truncate non-cascading transactional/cache tables
, _ AS (SELECT 1)
SELECT 1;

TRUNCATE TABLE
  public.wallet_transactions,
  public.wallets,
  public.subscription_quotas,
  public.subscription_payment_requests,
  public.topup_requests,
  public.feature_unlocks,
  public.subscriptions,
  public.mentor_availability_slots,
  public.mentor_mentees,
  public.mentor_earnings,
  public.mentor_reviews,
  public.mentor_bookings,
  public.application_status_history,
  public.job_status_history,
  public.applications,
  public.saved_jobs,
  public.partner_attributions,
  public.partner_monthly_statements,
  public.partner_referral_codes,
  public.referrals,
  public.referral_codes,
  public.messages,
  public.conversation_participants,
  public.conversations,
  public.generated_documents,
  public.user_documents,
  public.user_settings,
  public.user_account_state,
  public.contact_messages,
  public.post_comments,
  public.post_likes,
  public.post_saves,
  public.community_posts,
  public.guide_feedback,
  public.job_candidate_matches,
  public.job_candidate_rejections,
  public.admin_audit_log,
  public.notifications,
  public.jobs
RESTART IDENTITY;

-- 2) Delete role-specific profile tables for non-admins (admins keep their admin_profiles row)
DELETE FROM public.jobseeker_profiles WHERE user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');
DELETE FROM public.mentor_profiles    WHERE id      NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');
DELETE FROM public.employer_profiles  WHERE id      NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');
DELETE FROM public.agent_profiles     WHERE user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');
DELETE FROM public.partner_profiles   WHERE user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');

-- 3) Delete every non-admin auth user (cascades through remaining FKs)
DELETE FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

-- 4) Re-seed wallets for remaining admins (so they can use Admin Wallet page)
INSERT INTO public.wallets (user_id)
SELECT user_id FROM public.user_roles WHERE role='admin'
ON CONFLICT DO NOTHING;
