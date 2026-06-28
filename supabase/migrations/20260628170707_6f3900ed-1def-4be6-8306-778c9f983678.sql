-- FULL wipe: every user (including admins) + all transactional data.
-- App will have zero login accounts after this; user must sign up fresh.

-- Disable triggers/constraints implicitly handled by CASCADE.
DELETE FROM auth.users;

-- Truncate everything not user-keyed but transactional / cache.
TRUNCATE TABLE
  public.wallet_transactions,
  public.wallets,
  public.subscription_quotas,
  public.subscription_payment_requests,
  public.topup_requests,
  public.feature_unlocks,
  public.subscriptions,
  public.mentor_availability_slots,
  public.mentor_bookings,
  public.mentor_earnings,
  public.mentor_mentees,
  public.mentor_reviews,
  public.partner_attributions,
  public.partner_monthly_statements,
  public.partner_referral_codes,
  public.referral_codes,
  public.referrals,
  public.messages,
  public.conversation_participants,
  public.conversations,
  public.user_documents,
  public.community_posts,
  public.post_comments,
  public.post_likes,
  public.post_saves,
  public.notifications,
  public.applications,
  public.application_status_history,
  public.job_status_history,
  public.jobs,
  public.saved_jobs,
  public.job_candidate_matches,
  public.job_candidate_rejections,
  public.generated_documents,
  public.contact_messages,
  public.guide_feedback,
  public.admin_audit_log,
  public.user_account_state,
  public.user_settings,
  public.user_roles
RESTART IDENTITY CASCADE;

-- Preserved: subscription_plans, addon_products, app_config, guides, action_prices, credit_packages.