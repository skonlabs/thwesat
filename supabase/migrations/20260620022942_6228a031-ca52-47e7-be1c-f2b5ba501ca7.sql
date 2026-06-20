
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_subscription_request_per_user
  ON public.subscription_payment_requests(user_id)
  WHERE status = 'pending' AND request_type = 'subscription';

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
  v_period_end timestamptz;
  v_started timestamptz;
  v_promo public.launch_promo_config;
  v_launch_ends timestamptz;
  v_slots int;
  v_active public.subscriptions;
  v_cycle_interval interval;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;
  SELECT * INTO req FROM public.subscription_payment_requests WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    SELECT * INTO v_promo FROM public.launch_promo_config WHERE id=1;
    v_cycle_interval := CASE WHEN req.cycle='yearly' THEN interval '365 days' ELSE interval '30 days' END;

    DELETE FROM public.subscriptions WHERE user_id = req.user_id AND status='scheduled';

    SELECT * INTO v_active FROM public.subscriptions
      WHERE user_id = req.user_id AND status='active'
      ORDER BY started_at DESC LIMIT 1;

    IF v_active IS NOT NULL THEN
      v_started := v_active.current_period_end;
      v_period_end := v_started + v_cycle_interval;
      INSERT INTO public.subscriptions(user_id, plan_id, cycle, status, started_at, current_period_end, launch_price_applied, launch_ends_at, mmk_paid)
        VALUES (req.user_id, req.plan_id, req.cycle, 'scheduled', v_started, v_period_end, false, NULL, req.mmk_amount);
    ELSE
      IF req.launch_price_applied AND v_promo.ends_at > now() THEN
        v_launch_ends := v_promo.ends_at;
        v_period_end := v_promo.ends_at + v_cycle_interval;
      ELSE
        v_launch_ends := NULL;
        v_period_end := now() + v_cycle_interval;
      END IF;

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
    END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.tick_expire_subscriptions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.subscriptions;
  p public.subscription_plans;
BEGIN
  UPDATE public.subscriptions SET status='expired', updated_at=now()
    WHERE status='active' AND current_period_end < now();
  UPDATE public.addon_purchases SET status='expired', updated_at=now()
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now();

  FOR s IN
    SELECT DISTINCT ON (user_id) *
    FROM public.subscriptions
    WHERE status='scheduled' AND started_at <= now()
    ORDER BY user_id, started_at ASC
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = s.user_id AND status='active') THEN
      UPDATE public.subscriptions SET status='active', updated_at=now() WHERE id = s.id;
      SELECT * INTO p FROM public.subscription_plans WHERE id = s.plan_id;
      INSERT INTO public.subscription_quotas(user_id, active_jobs_quota, is_unlimited_jobs, active_jobs_used, unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used)
        VALUES (s.user_id, p.active_jobs_quota, p.is_unlimited_jobs, 0, p.unlock_quota, 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE SET
          active_jobs_quota = EXCLUDED.active_jobs_quota,
          is_unlimited_jobs = EXCLUDED.is_unlimited_jobs,
          active_jobs_used = 0,
          unlocks_total = EXCLUDED.unlocks_total,
          unlocks_used = 0,
          featured_jobs_total = 0,
          featured_jobs_used = 0,
          updated_at = now();
    END IF;
  END LOOP;
END;
$function$;
