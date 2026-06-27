-- Drop unused legacy snapshot and unused columns identified in audit

-- 1. Drop legacy profiles snapshot (replaced by view + role tables)
DROP TABLE IF EXISTS public._profiles_legacy CASCADE;

-- 2. Drop unused columns
ALTER TABLE public.feature_unlocks
  DROP COLUMN IF EXISTS credits_spent,
  DROP COLUMN IF EXISTS transaction_id;

ALTER TABLE public.job_candidate_matches
  DROP COLUMN IF EXISTS computed_at;

ALTER TABLE public.mentor_earnings
  DROP COLUMN IF EXISTS payout_note;

ALTER TABLE public.mentor_profiles
  DROP COLUMN IF EXISTS mentoring_since;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS created_by_user_id;

ALTER TABLE public.partner_attributions
  DROP COLUMN IF EXISTS attribution_source,
  DROP COLUMN IF EXISTS onboarding_completed_at,
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.partner_monthly_statements
  DROP COLUMN IF EXISTS computation_inputs,
  DROP COLUMN IF EXISTS finalized_at,
  DROP COLUMN IF EXISTS finalized_by,
  DROP COLUMN IF EXISTS paid_by,
  DROP COLUMN IF EXISTS payout_reference,
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.partner_profiles
  DROP COLUMN IF EXISTS organization_name;

ALTER TABLE public.payment_requests
  DROP COLUMN IF EXISTS revenue_classification_override_by,
  DROP COLUMN IF EXISTS revenue_classification_override_at;

ALTER TABLE public.payment_reversals
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS plan_for_role;

ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS telegram_linked_at;

ALTER TABLE public.wallet_transactions
  DROP COLUMN IF EXISTS created_by;
