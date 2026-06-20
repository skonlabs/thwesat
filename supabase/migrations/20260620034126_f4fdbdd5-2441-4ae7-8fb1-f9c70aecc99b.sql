
-- ============================================================
-- 1) Wipe existing subscription / quota / package data
-- ============================================================
DELETE FROM public.subscription_payment_requests;
DELETE FROM public.addon_purchases;
DELETE FROM public.subscriptions;
DELETE FROM public.subscription_quotas;
DELETE FROM public.subscription_plans;
DELETE FROM public.addon_products;

-- ============================================================
-- 2) Drop launch promo + unique pending request index
-- ============================================================
DROP TABLE IF EXISTS public.launch_promo_config CASCADE;
DROP INDEX IF EXISTS public.uniq_pending_subscription_request_per_user;

-- ============================================================
-- 3) Reshape subscription_plans
-- ============================================================
ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS monthly_mmk,
  DROP COLUMN IF EXISTS launch_mmk;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_mmk bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unlimited_unlocks boolean NOT NULL DEFAULT false;

-- Allow role='both' and tier='free_trial' (replace any prior check constraints)
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.subscription_plans'::regclass AND contype='c'
  LOOP EXECUTE format('ALTER TABLE public.subscription_plans DROP CONSTRAINT %I', c); END LOOP;
END$$;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_role_check CHECK (role IN ('employer','recruiting_agent','both')),
  ADD CONSTRAINT subscription_plans_tier_check CHECK (tier IN ('free_trial','starter','growth','business','enterprise'));

-- ============================================================
-- 4) Reshape subscriptions  (packages become permanent one-time grants)
-- ============================================================
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS cycle,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS launch_price_applied,
  DROP COLUMN IF EXISTS launch_ends_at,
  DROP COLUMN IF EXISTS auto_renew,
  DROP COLUMN IF EXISTS cancelled_at;

DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.subscriptions'::regclass AND contype='c'
  LOOP EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', c); END LOOP;
END$$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active'));

-- ============================================================
-- 5) Reshape subscription_quotas - add unlimited unlocks flag
-- ============================================================
ALTER TABLE public.subscription_quotas
  ADD COLUMN IF NOT EXISTS is_unlimited_unlocks boolean NOT NULL DEFAULT false;

-- ============================================================
-- 6) Reshape subscription_payment_requests
-- ============================================================
ALTER TABLE public.subscription_payment_requests
  DROP COLUMN IF EXISTS cycle,
  DROP COLUMN IF EXISTS launch_price_applied;

ALTER TABLE public.subscription_payment_requests
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- ============================================================
-- 7) Reshape addon_products - flag per-unit add-ons
-- ============================================================
ALTER TABLE public.addon_products
  ADD COLUMN IF NOT EXISTS is_per_unit boolean NOT NULL DEFAULT false;

-- ============================================================
-- 8) Reseed subscription_plans  (one row per package; role='both')
-- ============================================================
INSERT INTO public.subscription_plans
  (role, tier, price_mmk, active_jobs_quota, is_unlimited_jobs, unlock_quota, is_unlimited_unlocks, sort_order, is_active)
VALUES
  ('both','free_trial',         0,  10, false,    500, false, 1, true),
  ('both','starter',      350000,   5, false,    500, false, 2, true),
  ('both','growth',      1750000,  25, false,   1500, false, 3, true),
  ('both','business',    5000000, 100, false,  10000, false, 4, true),
  ('both','enterprise', 10000000,   0, true,       0,  true, 5, true);

-- ============================================================
-- 9) Reseed addon_products
-- ============================================================
INSERT INTO public.addon_products
  (key, label_en, label_my, kind, role_scope, mmk, unlock_amount, duration_days, is_recurring, is_per_unit, sort_order, is_active)
VALUES
  ('unlock_unit',  'Candidate Unlock',      'Candidate Unlock',       'unlock_pack',  'both',             1000, 1,    NULL, false, true,  1, true),
  ('featured_unit','Featured Job',          'Featured Job',           'featured_job', 'both',            10000, 1,    NULL, false, true,  2, true),
  ('matching',     'Candidate Matching Pack','Candidate Matching Pack','matching',     'both',           200000, 0,    365, false, false, 3, true),
  ('branding_agent','Agent Branding Page',   'Agent Branding Page',    'branding',     'recruiting_agent',250000, 0,   365, false, false, 4, true),
  ('branding_emp', 'Employer Branding Page','Employer Branding Page', 'branding',     'employer',       250000, 0,    365, false, false, 5, true);

-- ============================================================
-- 10) Rewrite approve_subscription_payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  req public.subscription_payment_requests;
  plan public.subscription_plans;
  addon public.addon_products;
  v_qty int;
  v_already_trial int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  SELECT * INTO req FROM public.subscription_payment_requests
    WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    IF plan IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

    -- Free Trial: enforce one per user lifetime
    IF plan.tier = 'free_trial' THEN
      SELECT count(*) INTO v_already_trial
        FROM public.subscriptions s
        JOIN public.subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = req.user_id AND p.tier = 'free_trial';
      IF v_already_trial > 0 THEN
        RAISE EXCEPTION 'Free Trial can only be claimed once per user';
      END IF;
    END IF;

    -- Insert a permanent active package grant (no expiry, no cycle)
    INSERT INTO public.subscriptions(user_id, plan_id, status, started_at, mmk_paid)
      VALUES (req.user_id, req.plan_id, 'active', now(), req.mmk_amount);

    -- Add quotas to pooled balance (sum)
    INSERT INTO public.subscription_quotas(
      user_id, active_jobs_quota, is_unlimited_jobs, active_jobs_used,
      unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used, is_unlimited_unlocks
    ) VALUES (
      req.user_id,
      plan.active_jobs_quota, plan.is_unlimited_jobs, 0,
      plan.unlock_quota, 0, 0, 0, plan.is_unlimited_unlocks
    )
    ON CONFLICT (user_id) DO UPDATE SET
      active_jobs_quota   = public.subscription_quotas.active_jobs_quota + EXCLUDED.active_jobs_quota,
      is_unlimited_jobs   = public.subscription_quotas.is_unlimited_jobs OR EXCLUDED.is_unlimited_jobs,
      unlocks_total       = public.subscription_quotas.unlocks_total + EXCLUDED.unlocks_total,
      is_unlimited_unlocks= public.subscription_quotas.is_unlimited_unlocks OR EXCLUDED.is_unlimited_unlocks,
      updated_at          = now();

  ELSE
    -- Add-on
    SELECT * INTO addon FROM public.addon_products WHERE id = req.addon_id;
    IF addon IS NULL THEN RAISE EXCEPTION 'Add-on not found'; END IF;

    v_qty := GREATEST(1, COALESCE(req.quantity, 1));

    -- Ensure quota row exists
    INSERT INTO public.subscription_quotas(user_id) VALUES (req.user_id) ON CONFLICT DO NOTHING;

    IF addon.is_per_unit AND addon.kind = 'unlock_pack' THEN
      UPDATE public.subscription_quotas
        SET unlocks_total = unlocks_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.is_per_unit AND addon.kind = 'featured_job' THEN
      UPDATE public.subscription_quotas
        SET featured_jobs_total = featured_jobs_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSE
      -- 1-year duration add-ons (matching, branding)
      INSERT INTO public.addon_purchases(user_id, addon_id, mmk_paid, starts_at, expires_at, units_total, units_used, status)
        VALUES (
          req.user_id, addon.id, req.mmk_amount, now(),
          CASE WHEN addon.duration_days IS NOT NULL
               THEN now() + (addon.duration_days || ' days')::interval
               ELSE NULL END,
          0, 0, 'active'
        );
    END IF;
  END IF;

  UPDATE public.subscription_payment_requests
    SET status='approved', reviewed_by = auth.uid(), reviewed_at = now(),
        admin_note = COALESCE(p_admin_note, admin_note), updated_at = now()
    WHERE id = p_request_id;
END;
$function$;

-- ============================================================
-- 11) Rewrite tick_expire_subscriptions  (only 1-year add-ons expire now)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tick_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.addon_purchases
    SET status='expired', updated_at=now()
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now();
END;
$function$;
