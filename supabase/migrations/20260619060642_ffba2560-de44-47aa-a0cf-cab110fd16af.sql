
-- 1. subscription_plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('employer','recruiting_agent')),
  tier text NOT NULL CHECK (tier IN ('starter','growth','business','enterprise')),
  monthly_mmk bigint NOT NULL,
  launch_mmk bigint NOT NULL DEFAULT 0,
  active_jobs_quota integer NOT NULL DEFAULT 0,
  is_unlimited_jobs boolean NOT NULL DEFAULT false,
  unlock_quota integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, tier)
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. addon_products
CREATE TABLE public.addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_my text,
  kind text NOT NULL CHECK (kind IN ('unlock_pack','featured_job','matching','branding')),
  role_scope text NOT NULL CHECK (role_scope IN ('both','employer','recruiting_agent')) DEFAULT 'both',
  mmk bigint NOT NULL,
  unlock_amount integer NOT NULL DEFAULT 0,
  duration_days integer,
  is_recurring boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.addon_products TO anon, authenticated;
GRANT ALL ON public.addon_products TO service_role;
ALTER TABLE public.addon_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read addons" ON public.addon_products FOR SELECT USING (true);
CREATE POLICY "Admins manage addons" ON public.addon_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  cycle text NOT NULL CHECK (cycle IN ('monthly','yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  launch_price_applied boolean NOT NULL DEFAULT false,
  launch_ends_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  mmk_paid bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subs" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage subs" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. subscription_quotas
CREATE TABLE public.subscription_quotas (
  user_id uuid PRIMARY KEY,
  active_jobs_quota integer NOT NULL DEFAULT 0,
  is_unlimited_jobs boolean NOT NULL DEFAULT false,
  active_jobs_used integer NOT NULL DEFAULT 0,
  unlocks_total integer NOT NULL DEFAULT 0,
  unlocks_used integer NOT NULL DEFAULT 0,
  featured_jobs_total integer NOT NULL DEFAULT 0,
  featured_jobs_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_quotas TO authenticated;
GRANT ALL ON public.subscription_quotas TO service_role;
ALTER TABLE public.subscription_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quotas" ON public.subscription_quotas FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage quotas" ON public.subscription_quotas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. addon_purchases
CREATE TABLE public.addon_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  addon_id uuid NOT NULL REFERENCES public.addon_products(id),
  mmk_paid bigint NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  units_total integer NOT NULL DEFAULT 0,
  units_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','consumed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addon_purchases_user ON public.addon_purchases(user_id, status);
GRANT SELECT ON public.addon_purchases TO authenticated;
GRANT ALL ON public.addon_purchases TO service_role;
ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own addons" ON public.addon_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage addons purchases" ON public.addon_purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. subscription_payment_requests
CREATE TABLE public.subscription_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('subscription','addon')),
  plan_id uuid REFERENCES public.subscription_plans(id),
  cycle text CHECK (cycle IN ('monthly','yearly')),
  addon_id uuid REFERENCES public.addon_products(id),
  mmk_amount bigint NOT NULL,
  launch_price_applied boolean NOT NULL DEFAULT false,
  payment_method text,
  proof_url text,
  sender_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_spr_user_status ON public.subscription_payment_requests(user_id, status);
GRANT SELECT, INSERT ON public.subscription_payment_requests TO authenticated;
GRANT ALL ON public.subscription_payment_requests TO service_role;
ALTER TABLE public.subscription_payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payment reqs" ON public.subscription_payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own payment reqs" ON public.subscription_payment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage payment reqs" ON public.subscription_payment_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 7. launch_promo_config (single row)
CREATE TABLE public.launch_promo_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launch_promo_config TO anon, authenticated;
GRANT ALL ON public.launch_promo_config TO service_role;
ALTER TABLE public.launch_promo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read promo" ON public.launch_promo_config FOR SELECT USING (true);
CREATE POLICY "Admins manage promo" ON public.launch_promo_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.launch_promo_config (id, starts_at, ends_at, is_active)
  VALUES (1, now(), now() + interval '180 days', true);

-- updated_at triggers reuse update_updated_at_column if exists
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sp_updated BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ap_updated BEFORE UPDATE ON public.addon_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sq_updated BEFORE UPDATE ON public.subscription_quotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ap2_updated BEFORE UPDATE ON public.addon_purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_spr_updated BEFORE UPDATE ON public.subscription_payment_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lpc_updated BEFORE UPDATE ON public.launch_promo_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed plans
INSERT INTO public.subscription_plans (role, tier, monthly_mmk, launch_mmk, active_jobs_quota, is_unlimited_jobs, unlock_quota, sort_order) VALUES
  ('recruiting_agent','starter',     30000,      0,  10, false,   300, 1),
  ('recruiting_agent','growth',     100000,  50000,  50, false,  1500, 2),
  ('recruiting_agent','business',   300000, 150000, 200, false,  5000, 3),
  ('recruiting_agent','enterprise', 750000, 500000,   0, true,  20000, 4),
  ('employer','starter',             15000,      0,   5, false,   100, 1),
  ('employer','growth',              50000,  25000,  20, false,   500, 2),
  ('employer','business',           150000,  75000, 100, false,  2500, 3),
  ('employer','enterprise',         500000, 250000,   0, true,  10000, 4);

-- Seed addons
INSERT INTO public.addon_products (key, label_en, kind, role_scope, mmk, unlock_amount, duration_days, is_recurring, sort_order) VALUES
  ('unlocks_100',   '100 Candidate Unlocks',    'unlock_pack', 'both',     10000, 100,  NULL, false, 1),
  ('unlocks_500',   '500 Candidate Unlocks',    'unlock_pack', 'both',     40000, 500,  NULL, false, 2),
  ('unlocks_1000',  '1,000 Candidate Unlocks',  'unlock_pack', 'both',     75000, 1000, NULL, false, 3),
  ('featured_job',  'Featured Job (30 Days)',   'featured_job','both',     15000, 0,    30,   false, 4),
  ('matching',      'Candidate Matching Pack',  'matching',    'both',     25000, 0,    30,   true,  5),
  ('branding',      'Employer Branding Page',   'branding',    'employer', 25000, 0,    30,   true,  6);

-- Helper: get effective plan price for a user picking a plan/cycle right now
CREATE OR REPLACE FUNCTION public.compute_subscription_price(p_plan_id uuid, p_cycle text)
RETURNS TABLE (mmk bigint, launch_applied boolean, launch_ends_at timestamptz) AS $$
DECLARE
  v_plan public.subscription_plans;
  v_promo public.launch_promo_config;
  v_unit bigint;
  v_launch_active boolean;
BEGIN
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
  SELECT * INTO v_promo FROM public.launch_promo_config WHERE id = 1;
  v_launch_active := COALESCE(v_promo.is_active AND now() BETWEEN v_promo.starts_at AND v_promo.ends_at, false);
  IF p_cycle = 'monthly' THEN
    IF v_launch_active THEN
      v_unit := v_plan.launch_mmk;
      RETURN QUERY SELECT v_unit, true, (now() + interval '3 months')::timestamptz;
    ELSE
      RETURN QUERY SELECT v_plan.monthly_mmk, false, NULL::timestamptz;
    END IF;
  ELSE -- yearly = monthly * 11; launch promo gives 3 months at launch + 9 months at standard
    IF v_launch_active THEN
      v_unit := v_plan.launch_mmk * 3 + v_plan.monthly_mmk * 8; -- 11 months total (1 free)
      RETURN QUERY SELECT v_unit, true, (now() + interval '3 months')::timestamptz;
    ELSE
      RETURN QUERY SELECT v_plan.monthly_mmk * 11, false, NULL::timestamptz;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Approval RPC: admin approves a subscription_payment_request → creates sub + quotas, or applies addon
CREATE OR REPLACE FUNCTION public.approve_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  req public.subscription_payment_requests;
  plan public.subscription_plans;
  addon public.addon_products;
  v_period_end timestamptz;
  v_promo public.launch_promo_config;
  v_launch_ends timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;
  SELECT * INTO req FROM public.subscription_payment_requests WHERE id = p_request_id AND status='pending' FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  IF req.request_type = 'subscription' THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = req.plan_id;
    v_period_end := CASE WHEN req.cycle='yearly' THEN now() + interval '365 days' ELSE now() + interval '30 days' END;
    SELECT * INTO v_promo FROM public.launch_promo_config WHERE id=1;
    v_launch_ends := CASE WHEN req.launch_price_applied THEN now() + interval '3 months' ELSE NULL END;

    -- expire any active subs
    UPDATE public.subscriptions SET status='expired', updated_at=now()
      WHERE user_id = req.user_id AND status='active';

    INSERT INTO public.subscriptions(user_id, plan_id, cycle, status, started_at, current_period_end, launch_price_applied, launch_ends_at, mmk_paid)
      VALUES (req.user_id, req.plan_id, req.cycle, 'active', now(), v_period_end, req.launch_price_applied, v_launch_ends, req.mmk_amount);

    -- reset quotas to plan values (carry over unused active_jobs_used reset; keep unlocks_used reset to 0 each new period)
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

  ELSE -- addon
    SELECT * INTO addon FROM public.addon_products WHERE id = req.addon_id;
    INSERT INTO public.addon_purchases(user_id, addon_id, mmk_paid, starts_at, expires_at, units_total, units_used, status)
      VALUES (req.user_id, addon.id, req.mmk_amount, now(),
        CASE WHEN addon.duration_days IS NOT NULL THEN now() + (addon.duration_days || ' days')::interval ELSE NULL END,
        CASE WHEN addon.kind='unlock_pack' THEN addon.unlock_amount WHEN addon.kind='featured_job' THEN 1 ELSE 0 END,
        0, 'active');

    -- Bump quotas for unlock packs and featured jobs
    INSERT INTO public.subscription_quotas(user_id) VALUES (req.user_id) ON CONFLICT DO NOTHING;
    IF addon.kind = 'unlock_pack' THEN
      UPDATE public.subscription_quotas SET unlocks_total = unlocks_total + addon.unlock_amount, updated_at = now() WHERE user_id = req.user_id;
    ELSIF addon.kind = 'featured_job' THEN
      UPDATE public.subscription_quotas SET featured_jobs_total = featured_jobs_total + 1, updated_at = now() WHERE user_id = req.user_id;
    END IF;
  END IF;

  UPDATE public.subscription_payment_requests
    SET status='approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_note = COALESCE(p_admin_note, admin_note), updated_at=now()
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_subscription_payment(p_request_id uuid, p_admin_note text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can reject payments';
  END IF;
  UPDATE public.subscription_payment_requests
    SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=COALESCE(p_admin_note, admin_note), updated_at=now()
    WHERE id=p_request_id AND status='pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-expire on read helper
CREATE OR REPLACE FUNCTION public.tick_expire_subscriptions() RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions SET status='expired', updated_at=now()
    WHERE status='active' AND current_period_end < now();
  UPDATE public.addon_purchases SET status='expired', updated_at=now()
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
