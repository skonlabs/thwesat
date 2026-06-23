
-- 1) Expand kind check to include job_post
ALTER TABLE public.addon_products DROP CONSTRAINT IF EXISTS addon_products_kind_check;
ALTER TABLE public.addon_products
  ADD CONSTRAINT addon_products_kind_check
  CHECK (kind IN ('unlock_pack','featured_job','matching','branding','job_post'));

-- 2) Seed the new add-on (idempotent)
INSERT INTO public.addon_products
  (key, label_en, label_my, kind, role_scope, mmk, unlock_amount, duration_days, is_recurring, is_per_unit, sort_order, is_active)
VALUES
  ('job_post_unit', 'Job Posting', 'အလုပ်ခေါ်စာ', 'job_post', 'both', 75000, 1, NULL, false, true, 3, true)
ON CONFLICT (key) DO UPDATE
  SET label_en = EXCLUDED.label_en,
      label_my = EXCLUDED.label_my,
      kind = EXCLUDED.kind,
      role_scope = EXCLUDED.role_scope,
      mmk = EXCLUDED.mmk,
      is_per_unit = EXCLUDED.is_per_unit,
      is_active = true,
      updated_at = now();

-- 3) Update approval RPC to grant active_jobs_quota for job_post addon
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.subscription_payment_requests;
  plan public.subscription_plans;
  addon public.addon_products;
  v_qty int;
  v_already_trial int;
  v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_caller, 'admin'::public.app_role) OR public.has_role(v_caller, 'partner'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins or partners can approve payments';
  END IF;

  SELECT * INTO req FROM public.subscription_payment_requests
    WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    IF plan IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;

    IF plan.tier = 'free_trial' THEN
      SELECT count(*) INTO v_already_trial
        FROM public.subscriptions s
        JOIN public.subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = req.user_id AND p.tier = 'free_trial';
      IF v_already_trial > 0 THEN
        RAISE EXCEPTION 'Free Trial can only be claimed once per user';
      END IF;
    END IF;

    INSERT INTO public.subscriptions(user_id, plan_id, status, started_at, mmk_paid)
      VALUES (req.user_id, req.plan_id, 'active', now(), req.mmk_amount);

    INSERT INTO public.subscription_quotas(
      user_id, active_jobs_quota, is_unlimited_jobs, active_jobs_used,
      unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used, is_unlimited_unlocks
    ) VALUES (
      req.user_id,
      plan.active_jobs_quota, plan.is_unlimited_jobs, 0,
      plan.unlock_quota, 0, plan.featured_jobs_quota, 0, plan.is_unlimited_unlocks
    )
    ON CONFLICT (user_id) DO UPDATE SET
      active_jobs_quota    = public.subscription_quotas.active_jobs_quota + EXCLUDED.active_jobs_quota,
      is_unlimited_jobs    = public.subscription_quotas.is_unlimited_jobs OR EXCLUDED.is_unlimited_jobs,
      unlocks_total        = public.subscription_quotas.unlocks_total + EXCLUDED.unlocks_total,
      is_unlimited_unlocks = public.subscription_quotas.is_unlimited_unlocks OR EXCLUDED.is_unlimited_unlocks,
      featured_jobs_total  = public.subscription_quotas.featured_jobs_total + EXCLUDED.featured_jobs_total,
      updated_at           = now();

  ELSE
    SELECT * INTO addon FROM public.addon_products WHERE id = req.addon_id;
    IF addon IS NULL THEN RAISE EXCEPTION 'Add-on not found'; END IF;

    v_qty := GREATEST(1, COALESCE(req.quantity, 1));

    INSERT INTO public.subscription_quotas(user_id) VALUES (req.user_id) ON CONFLICT DO NOTHING;

    IF addon.is_per_unit AND addon.kind = 'unlock_pack' THEN
      UPDATE public.subscription_quotas
        SET unlocks_total = unlocks_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.is_per_unit AND addon.kind = 'featured_job' THEN
      UPDATE public.subscription_quotas
        SET featured_jobs_total = featured_jobs_total + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSIF addon.is_per_unit AND addon.kind = 'job_post' THEN
      UPDATE public.subscription_quotas
        SET active_jobs_quota = active_jobs_quota + v_qty, updated_at = now()
        WHERE user_id = req.user_id;
    ELSE
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
    SET status='approved', reviewed_by = v_caller, reviewed_at = now(),
        admin_note = COALESCE(p_admin_note, admin_note), updated_at = now()
    WHERE id = p_request_id;
END;
$$;
