
-- 1) Block duplicate pending addon requests (e.g., a second Profile Boost) for the same addon per user.
CREATE OR REPLACE FUNCTION public.create_subscription_payment_request(
  _request_type text,
  _plan_id uuid,
  _addon_id uuid,
  _quantity int,
  _mmk_amount numeric,
  _payment_method text,
  _proof_url text,
  _sender_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_expected numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _request_type NOT IN ('subscription','addon') THEN RAISE EXCEPTION 'invalid_request_type'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN _quantity := 1; END IF;

  IF _request_type = 'subscription' THEN
    IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_required'; END IF;
    SELECT price_mmk INTO v_expected FROM public.subscription_plans WHERE id = _plan_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

    IF _mmk_amount <> v_expected THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    IF _payment_method = 'free_trial' AND v_expected <> 0 THEN
      RAISE EXCEPTION 'free_trial_not_allowed';
    END IF;
    IF v_expected = 0 AND _payment_method <> 'free_trial' THEN
      RAISE EXCEPTION 'invalid_method_for_free_plan';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND plan_id = _plan_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  ELSE
    IF _addon_id IS NULL THEN RAISE EXCEPTION 'addon_required'; END IF;
    SELECT mmk INTO v_expected FROM public.addon_products WHERE id = _addon_id AND is_active = true;
    IF v_expected IS NULL THEN RAISE EXCEPTION 'addon_not_found'; END IF;
    IF _mmk_amount <> (v_expected * _quantity) THEN RAISE EXCEPTION 'amount_mismatch'; END IF;

    -- Block duplicate pending requests for the same addon per user
    IF EXISTS (
      SELECT 1 FROM public.subscription_payment_requests
      WHERE user_id = v_user AND addon_id = _addon_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'duplicate_pending_request';
    END IF;
  END IF;

  INSERT INTO public.subscription_payment_requests(
    user_id, request_type, plan_id, addon_id, quantity, mmk_amount,
    payment_method, proof_url, sender_reference, status
  ) VALUES (
    v_user, _request_type, _plan_id, _addon_id, _quantity, _mmk_amount,
    _payment_method, _proof_url, _sender_reference, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_subscription_payment_request(text,uuid,uuid,int,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_payment_request(text,uuid,uuid,int,numeric,text,text,text) TO authenticated;

-- 2) Approval RPC: extend (stack) boost expiry instead of resetting
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
  v_expires timestamptz;
  v_base timestamptz;
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
    ELSIF addon.kind = 'profile_boost' THEN
      -- Stack: extend from the latest existing active expiry, never shorten
      SELECT MAX(expires_at) INTO v_base
        FROM public.feature_unlocks
        WHERE user_id = req.user_id
          AND feature_key = 'profile_boost'
          AND is_active = true
          AND expires_at IS NOT NULL
          AND expires_at > now();
      v_base := COALESCE(v_base, now());
      v_expires := CASE
        WHEN addon.duration_days IS NOT NULL
          THEN v_base + (addon.duration_days || ' days')::interval
        ELSE NULL
      END;
      INSERT INTO public.addon_purchases(user_id, addon_id, mmk_paid, starts_at, expires_at, units_total, units_used, status)
        VALUES (req.user_id, addon.id, req.mmk_amount, now(), v_expires, 1, 0, 'active');
      UPDATE public.feature_unlocks
        SET is_active = false
        WHERE user_id = req.user_id AND feature_key = 'profile_boost' AND is_active = true;
      INSERT INTO public.feature_unlocks(user_id, feature_key, target_type, target_id, credits_spent, is_active, expires_at, metadata)
        VALUES (req.user_id, 'profile_boost', 'profile', req.user_id::text, 0, true, v_expires,
                jsonb_build_object('source','addon','addon_id',addon.id));
      INSERT INTO public.notifications(user_id, notification_type, title, title_my, description, description_my, link_path)
        VALUES (
          req.user_id, 'system',
          'Profile Boost activated', 'ပရိုဖိုင် Boost အသက်ဝင်ပါပြီ',
          'Your profile will appear at the top of employer searches until ' || to_char(v_expires AT TIME ZONE 'UTC', 'YYYY-MM-DD') || '.',
          'အလုပ်ရှင်များ ရှာဖွေမှုများတွင် ' || to_char(v_expires AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ' အထိ ထိပ်တွင် ပေါ်လာပါမည်။',
          '/profile'
        );
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
