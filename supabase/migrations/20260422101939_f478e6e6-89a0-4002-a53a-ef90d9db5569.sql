
-- Drop the overly restrictive plan_type check (employer tiers like 'pro' aren't in the allowed list)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Replace with a more permissive non-empty check; plan_type is free-form (matches subscription_plans.plan_id and employer tier names)
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IS NOT NULL AND length(plan_type) > 0);

-- Consolidate the two conflicting status checks into one that includes 'revoked' and 'trialing'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_valid;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY['active','cancelled','expired','trialing','revoked']));
