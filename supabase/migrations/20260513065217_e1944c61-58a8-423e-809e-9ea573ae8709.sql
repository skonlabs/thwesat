
-- Shared updated_at trigger (project doesn't have one yet)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. PARTNERS
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  contact_email text,
  contract_start_date date NOT NULL,
  contract_end_date date,
  maintenance_rate_y2 numeric NOT NULL DEFAULT 0.075,
  maintenance_rate_y3plus numeric NOT NULL DEFAULT 0.05,
  payout_cap_pct numeric NOT NULL DEFAULT 0.35,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. PARTNER ATTRIBUTIONS
CREATE TABLE public.partner_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'manual',
  attribution_source text,
  attributed_at timestamptz NOT NULL DEFAULT now(),
  first_paid_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_partner_attributions_partner ON public.partner_attributions(partner_id);
CREATE INDEX idx_partner_attributions_first_paid ON public.partner_attributions(first_paid_at);
ALTER TABLE public.partner_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attributions" ON public.partner_attributions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "User can view own attribution" ON public.partner_attributions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. PAYMENT REQUESTS NPR fields
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS npr_amount numeric,
  ADD COLUMN IF NOT EXISTS third_party_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_classification text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS revenue_classification_override_by uuid,
  ADD COLUMN IF NOT EXISTS revenue_classification_override_at timestamptz;

-- 4. PAYMENT REVERSALS
CREATE TABLE public.payment_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  reversal_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MMK',
  npr_amount numeric,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_reversals_payment ON public.payment_reversals(payment_request_id);
CREATE INDEX idx_payment_reversals_occurred ON public.payment_reversals(occurred_at);
ALTER TABLE public.payment_reversals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reversals" ON public.payment_reversals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. PARTNER QUALITY METRICS
CREATE TABLE public.partner_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  l1_sla_pct numeric,
  csat_score numeric,
  dispute_rate_pct numeric,
  fraud_rate_pct numeric,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, period_year, period_month)
);
ALTER TABLE public.partner_quality_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quality metrics" ON public.partner_quality_metrics FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. PARTNER MONTHLY STATEMENTS
CREATE TABLE public.partner_monthly_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  currency text NOT NULL DEFAULT 'MMK',
  gross_attributed_npr numeric NOT NULL DEFAULT 0,
  reversals_npr numeric NOT NULL DEFAULT 0,
  net_collected_attributed_npr numeric NOT NULL DEFAULT 0,
  growth_npr numeric NOT NULL DEFAULT 0,
  maintenance_y2_npr numeric NOT NULL DEFAULT 0,
  maintenance_y3_npr numeric NOT NULL DEFAULT 0,
  growth_tier_pct numeric NOT NULL DEFAULT 0,
  growth_bonus_pct numeric NOT NULL DEFAULT 0,
  maintenance_y2_pct numeric NOT NULL DEFAULT 0.075,
  maintenance_y3_pct numeric NOT NULL DEFAULT 0.05,
  mom_growth_pct numeric,
  active_growth_ratio numeric,
  quality_gate_passed boolean NOT NULL DEFAULT false,
  active_growth_requirement_met boolean NOT NULL DEFAULT false,
  growth_payout numeric NOT NULL DEFAULT 0,
  maintenance_payout numeric NOT NULL DEFAULT 0,
  bonus_payout numeric NOT NULL DEFAULT 0,
  total_payout_uncapped numeric NOT NULL DEFAULT 0,
  total_payout numeric NOT NULL DEFAULT 0,
  cap_applied boolean NOT NULL DEFAULT false,
  computation_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  finalized_at timestamptz,
  finalized_by uuid,
  paid_at timestamptz,
  paid_by uuid,
  payout_reference text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, period_year, period_month)
);
CREATE INDEX idx_partner_statements_partner_period
  ON public.partner_monthly_statements(partner_id, period_year, period_month);
ALTER TABLE public.partner_monthly_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read statements" ON public.partner_monthly_statements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert statements" ON public.partner_monthly_statements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update statement lifecycle" ON public.partner_monthly_statements FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. PARTNER TIER APPROVALS
CREATE TABLE public.partner_tier_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  approved_tier_pct numeric NOT NULL,
  reason text NOT NULL,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, period_year, period_month)
);
ALTER TABLE public.partner_tier_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tier approvals" ON public.partner_tier_approvals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. updated_at triggers
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER partner_attributions_updated_at BEFORE UPDATE ON public.partner_attributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER partner_quality_metrics_updated_at BEFORE UPDATE ON public.partner_quality_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Materialise first_paid_at on attribution when payment approved
CREATE OR REPLACE FUNCTION public.partner_mark_first_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.partner_attributions
       SET first_paid_at = COALESCE(first_paid_at, NEW.updated_at, now())
     WHERE user_id = NEW.user_id
       AND first_paid_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payment_requests_partner_first_paid ON public.payment_requests;
CREATE TRIGGER payment_requests_partner_first_paid
  AFTER UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.partner_mark_first_paid();
