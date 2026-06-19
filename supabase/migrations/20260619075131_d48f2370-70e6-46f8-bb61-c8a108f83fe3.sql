
-- Update featured_job approval to use unlock_amount as slot count, and delay subscription start during promo
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  req public.subscription_payment_requests;
  plan public.subscription_plans;
  addon public.addon_products;
  v_period_end timestamptz;
  v_promo public.launch_promo_config;
  v_launch_ends timestamptz;
  v_slots int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;
  SELECT * INTO req FROM public.subscription_payment_requests WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    SELECT * INTO v_promo FROM public.launch_promo_config WHERE id=1;

    -- If promo applies, paid period begins after promo ends (first 3 months free)
    IF req.launch_price_applied AND v_promo.ends_at > now() THEN
      v_launch_ends := v_promo.ends_at;
      v_period_end := v_promo.ends_at + CASE WHEN req.cycle='yearly' THEN interval '365 days' ELSE interval '30 days' END;
    ELSE
      v_launch_ends := NULL;
      v_period_end := CASE WHEN req.cycle='yearly' THEN now() + interval '365 days' ELSE now() + interval '30 days' END;
    END IF;

    UPDATE public.subscriptions SET status='expired', updated_at=now()
      WHERE user_id = req.user_id AND status='active';

    INSERT INTO public.subscriptions(user_id, plan_id, cycle, status, started_at, current_period_end, launch_price_applied, launch_ends_at, mmk_paid)
      VALUES (req.user_id, req.plan_id, req.cycle, 'active', now(), v_period_end, req.launch_price_applied, v_launch_ends, req.mmk_amount);

    INSERT INTO public.subscription_quotas(user_id, active_jobs_quota, is_unlimited_jobs, active_jobs_used, unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used)
      VALUES (req.user_id, plan.active_jobs_quota, plan.is_unlimited_jobs, 0, plan.unlock_quota, 0, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        active_jobs_quota = EXCLUDED.active_jobs_quota,
        is_unlimited_jobs = EXCLUDED.is_unlimited_jobs,
        active_jobs_used = 0,
        unlocks_total = EXCLUDED.unlocks_total,
        unlocks_used = 0,
        featured_jobs_total = 0,
        featured_jobs_used = 0,
        updated_at = now();

  ELSE
    SELECT * INTO addon FROM public.addon_products WHERE id = req.addon_id;
    v_slots := CASE
                 WHEN addon.kind = 'unlock_pack' THEN addon.unlock_amount
                 WHEN addon.kind = 'featured_job' THEN COALESCE(NULLIF(addon.unlock_amount,0), 1)
                 ELSE 0
               END;
    INSERT INTO public.addon_purchases(user_id, addon_id, mmk_paid, starts_at, expires_at, units_total, units_used, status)
      VALUES (req.user_id, addon.id, req.mmk_amount, now(),
        CASE WHEN addon.duration_days IS NOT NULL THEN now() + (addon.duration_days || ' days')::interval ELSE NULL END,
        v_slots, 0, 'active');

    INSERT INTO public.subscription_quotas(user_id) VALUES (req.user_id) ON CONFLICT DO NOTHING;
    IF addon.kind = 'unlock_pack' THEN
      UPDATE public.subscription_quotas SET unlocks_total = unlocks_total + addon.unlock_amount, updated_at = now() WHERE user_id = req.user_id;
    ELSIF addon.kind = 'featured_job' THEN
      UPDATE public.subscription_quotas SET featured_jobs_total = featured_jobs_total + v_slots, updated_at = now() WHERE user_id = req.user_id;
    END IF;
  END IF;

  UPDATE public.subscription_payment_requests
    SET status='approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_note = COALESCE(p_admin_note, admin_note), updated_at=now()
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace single Featured Job addon with 5/10/25 packs
UPDATE public.addon_products SET is_active = false WHERE key = 'featured_job';

INSERT INTO public.addon_products (key, label_en, label_my, kind, role_scope, mmk, unlock_amount, duration_days, is_recurring, sort_order, is_active)
VALUES
  ('featured_jobs_5',  'Featured Jobs · 5 Pack',  'Featured Jobs · ၅ ခု',  'featured_job', 'both', 50000,  5,  90, false, 4, true),
  ('featured_jobs_10', 'Featured Jobs · 10 Pack', 'Featured Jobs · ၁၀ ခု', 'featured_job', 'both', 100000, 10, 90, false, 5, true),
  ('featured_jobs_25', 'Featured Jobs · 25 Pack', 'Featured Jobs · ၂၅ ခု', 'featured_job', 'both', 250000, 25, 90, false, 6, true)
ON CONFLICT (key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_my = EXCLUDED.label_my,
  mmk = EXCLUDED.mmk,
  unlock_amount = EXCLUDED.unlock_amount,
  duration_days = EXCLUDED.duration_days,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Reorder remaining addons after featured packs
UPDATE public.addon_products SET sort_order = 7 WHERE key = 'matching';
UPDATE public.addon_products SET sort_order = 8 WHERE key = 'branding';
