-- 1. Append-only revisions table
CREATE TABLE public.partner_statement_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL,
  revision_no int NOT NULL,
  action text NOT NULL, -- 'finalize' | 'refinalize' | 'mark_paid'
  actor_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  payment_ids uuid[] NOT NULL DEFAULT '{}',
  reversal_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_psr_partner_period ON public.partner_statement_revisions(partner_id, period_year, period_month, revision_no);
ALTER TABLE public.partner_statement_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read revisions" ON public.partner_statement_revisions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Partners read revisions" ON public.partner_statement_revisions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'partner'::app_role));
-- No INSERT/UPDATE/DELETE policies → writes only via SECURITY DEFINER RPCs

-- 2. Gross NPR per bucket on monthly statements
ALTER TABLE public.partner_monthly_statements
  ADD COLUMN IF NOT EXISTS growth_npr_gross numeric,
  ADD COLUMN IF NOT EXISTS maintenance_y2_npr_gross numeric,
  ADD COLUMN IF NOT EXISTS maintenance_y3_npr_gross numeric;

-- 3. Period-locked guard helper
CREATE OR REPLACE FUNCTION public.is_partner_period_finalized(_partner_id uuid, _ts timestamptz)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_monthly_statements s
    WHERE s.partner_id = _partner_id
      AND s.status = 'finalized'
      AND make_timestamptz(s.period_year, s.period_month, 1, 0, 0, 0, 'Asia/Yangon')
          <= _ts
      AND _ts < make_timestamptz(s.period_year, s.period_month, 1, 0, 0, 0, 'Asia/Yangon') + interval '1 month'
  );
$$;

-- 4. Block payment-override edits inside a finalized period (any partner attribution)
CREATE OR REPLACE FUNCTION public.guard_payment_overrides_finalized()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_locked boolean;
BEGIN
  -- Only guard when override-affecting cols change
  IF NEW.third_party_payout IS NOT DISTINCT FROM OLD.third_party_payout
     AND NEW.npr_amount IS NOT DISTINCT FROM OLD.npr_amount
     AND NEW.revenue_classification IS NOT DISTINCT FROM OLD.revenue_classification THEN
    RETURN NEW;
  END IF;
  IF NEW.reviewed_at IS NULL THEN RETURN NEW; END IF;
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_attributions pa
    WHERE pa.user_id = NEW.user_id
      AND public.is_partner_period_finalized(pa.partner_id, NEW.reviewed_at)
  ) INTO v_locked;
  IF v_locked THEN
    RAISE EXCEPTION 'period_locked: payment % is inside a finalized partner statement', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_payment_overrides_finalized ON public.payment_requests;
CREATE TRIGGER trg_guard_payment_overrides_finalized
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_overrides_finalized();

-- 5. Block quality-metric writes inside a finalized period
CREATE OR REPLACE FUNCTION public.guard_quality_metrics_finalized()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_locked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.partner_monthly_statements s
    WHERE s.partner_id = NEW.partner_id
      AND s.status = 'finalized'
      AND s.period_year = NEW.period_year
      AND s.period_month = NEW.period_month
  ) INTO v_locked;
  IF v_locked THEN
    RAISE EXCEPTION 'period_locked: quality metrics for %/% are finalized', NEW.period_year, NEW.period_month
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_quality_metrics_finalized ON public.partner_quality_metrics;
CREATE TRIGGER trg_guard_quality_metrics_finalized
  BEFORE INSERT OR UPDATE ON public.partner_quality_metrics
  FOR EACH ROW EXECUTE FUNCTION public.guard_quality_metrics_finalized();

-- 6. Cap cumulative reversals to original payment amount
CREATE OR REPLACE FUNCTION public.guard_reversal_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_orig numeric;
  v_sum numeric;
BEGIN
  SELECT amount INTO v_orig FROM public.payment_requests WHERE id = NEW.payment_request_id;
  IF v_orig IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_sum
    FROM public.payment_reversals
    WHERE payment_request_id = NEW.payment_request_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF v_sum + COALESCE(NEW.amount,0) > v_orig + 0.001 THEN
    RAISE EXCEPTION 'reversal_cap_exceeded: cumulative reversals (%) exceed original payment amount (%)',
      v_sum + NEW.amount, v_orig USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_reversal_cap ON public.payment_reversals;
CREATE TRIGGER trg_guard_reversal_cap
  BEFORE INSERT OR UPDATE ON public.payment_reversals
  FOR EACH ROW EXECUTE FUNCTION public.guard_reversal_cap();

-- 7. Patch admin_finalize_partner_statement: revision history + audit log + gross buckets + payment_ids snapshot
CREATE OR REPLACE FUNCTION public.admin_finalize_partner_statement(_partner_id uuid, _year int, _month int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_preview jsonb;
  v_actor uuid := auth.uid();
  v_existing public.partner_monthly_statements%ROWTYPE;
  v_revision int;
  v_action text;
  v_payment_ids uuid[];
  v_reversal_ids uuid[];
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  IF NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_preview := public.admin_compute_partner_statement(_partner_id, _year, _month);
  v_period_start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'Asia/Yangon');
  v_period_end := v_period_start + interval '1 month';

  SELECT ARRAY(
    SELECT pr.id FROM public.payment_requests pr
    JOIN public.partner_attributions pa ON pa.user_id = pr.user_id AND pa.partner_id = _partner_id
    WHERE pr.status = 'approved' AND pr.currency = 'MMK'
      AND pr.reviewed_at >= v_period_start AND pr.reviewed_at < v_period_end
      AND pr.reviewed_at >= pa.attributed_at
  ) INTO v_payment_ids;

  SELECT ARRAY(
    SELECT rv.id FROM public.payment_reversals rv
    JOIN public.payment_requests pr ON pr.id = rv.payment_request_id
    JOIN public.partner_attributions pa ON pa.user_id = pr.user_id AND pa.partner_id = _partner_id
    WHERE rv.occurred_at >= v_period_start AND rv.occurred_at < v_period_end
  ) INTO v_reversal_ids;

  SELECT * INTO v_existing FROM public.partner_monthly_statements
    WHERE partner_id = _partner_id AND period_year = _year AND period_month = _month;

  v_action := CASE WHEN v_existing.id IS NULL THEN 'finalize'
                   WHEN v_existing.status = 'finalized' THEN 'refinalize'
                   ELSE 'finalize' END;

  INSERT INTO public.partner_monthly_statements (
    partner_id, period_year, period_month, status,
    growth_npr, maintenance_y2_npr, maintenance_y3_npr,
    growth_npr_gross, maintenance_y2_npr_gross, maintenance_y3_npr_gross,
    gross_attributed_npr, reversals_npr, net_collected_attributed_npr,
    growth_tier_pct, growth_bonus_pct, mom_growth_pct,
    growth_payout, maintenance_payout, bonus_payout,
    total_payout_uncapped, total_payout, cap_applied,
    quality_gate_passed, active_growth_requirement_met,
    finalized_by, finalized_at,
    computation_inputs
  ) VALUES (
    _partner_id, _year, _month, 'finalized',
    (v_preview->>'growth_npr')::numeric,
    (v_preview->>'maintenance_y2_npr')::numeric,
    (v_preview->>'maintenance_y3_npr')::numeric,
    (v_preview->>'growth_npr_gross')::numeric,
    (v_preview->>'maintenance_y2_npr_gross')::numeric,
    (v_preview->>'maintenance_y3_npr_gross')::numeric,
    (v_preview->>'gross_attributed_npr')::numeric,
    (v_preview->>'reversals_npr')::numeric,
    (v_preview->>'net_collected_attributed_npr')::numeric,
    (v_preview->>'growth_tier_pct')::numeric,
    (v_preview->>'growth_bonus_pct')::numeric,
    (v_preview->>'mom_growth_pct')::numeric,
    (v_preview->>'growth_payout')::numeric,
    (v_preview->>'maintenance_payout')::numeric,
    (v_preview->>'bonus_payout')::numeric,
    (v_preview->>'total_payout_uncapped')::numeric,
    (v_preview->>'total_payout')::numeric,
    (v_preview->>'cap_applied')::boolean,
    (v_preview->>'quality_gate_passed')::boolean,
    (v_preview->>'active_growth_requirement_met')::boolean,
    v_actor, now(),
    v_preview || jsonb_build_object(
      'payment_ids', to_jsonb(v_payment_ids),
      'reversal_ids', to_jsonb(v_reversal_ids),
      'finalized_at', now()
    )
  )
  ON CONFLICT (partner_id, period_year, period_month) DO UPDATE SET
    status = 'finalized',
    growth_npr = EXCLUDED.growth_npr,
    maintenance_y2_npr = EXCLUDED.maintenance_y2_npr,
    maintenance_y3_npr = EXCLUDED.maintenance_y3_npr,
    growth_npr_gross = EXCLUDED.growth_npr_gross,
    maintenance_y2_npr_gross = EXCLUDED.maintenance_y2_npr_gross,
    maintenance_y3_npr_gross = EXCLUDED.maintenance_y3_npr_gross,
    gross_attributed_npr = EXCLUDED.gross_attributed_npr,
    reversals_npr = EXCLUDED.reversals_npr,
    net_collected_attributed_npr = EXCLUDED.net_collected_attributed_npr,
    growth_tier_pct = EXCLUDED.growth_tier_pct,
    growth_bonus_pct = EXCLUDED.growth_bonus_pct,
    mom_growth_pct = EXCLUDED.mom_growth_pct,
    growth_payout = EXCLUDED.growth_payout,
    maintenance_payout = EXCLUDED.maintenance_payout,
    bonus_payout = EXCLUDED.bonus_payout,
    total_payout_uncapped = EXCLUDED.total_payout_uncapped,
    total_payout = EXCLUDED.total_payout,
    cap_applied = EXCLUDED.cap_applied,
    quality_gate_passed = EXCLUDED.quality_gate_passed,
    active_growth_requirement_met = EXCLUDED.active_growth_requirement_met,
    finalized_by = EXCLUDED.finalized_by,
    finalized_at = EXCLUDED.finalized_at,
    computation_inputs = EXCLUDED.computation_inputs;

  SELECT COALESCE(MAX(revision_no),0)+1 INTO v_revision
    FROM public.partner_statement_revisions
    WHERE partner_id = _partner_id AND period_year = _year AND period_month = _month;

  INSERT INTO public.partner_statement_revisions
    (partner_id, period_year, period_month, revision_no, action, actor_id, snapshot, payment_ids, reversal_ids)
  VALUES
    (_partner_id, _year, _month, v_revision, v_action, v_actor, v_preview, v_payment_ids, v_reversal_ids);

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_statement_' || v_action, 'partner_monthly_statements',
          _partner_id::text,
          jsonb_build_object('year', _year, 'month', _month, 'revision', v_revision,
                             'total_payout', v_preview->>'total_payout'));

  RETURN v_preview || jsonb_build_object('revision_no', v_revision, 'action', v_action);
END;
$$;

-- 8. Mark-paid RPC with audit + revision row
CREATE OR REPLACE FUNCTION public.admin_mark_partner_statement_paid(
  _partner_id uuid, _year int, _month int, _payout_reference text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row public.partner_monthly_statements%ROWTYPE;
  v_revision int;
BEGIN
  IF NOT has_role(v_actor,'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='insufficient_privilege';
  END IF;
  UPDATE public.partner_monthly_statements
     SET status = 'paid', paid_at = now(), paid_by = v_actor, payout_reference = _payout_reference
   WHERE partner_id = _partner_id AND period_year = _year AND period_month = _month
     AND status = 'finalized'
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'statement_not_finalized';
  END IF;

  SELECT COALESCE(MAX(revision_no),0)+1 INTO v_revision
    FROM public.partner_statement_revisions
    WHERE partner_id = _partner_id AND period_year = _year AND period_month = _month;

  INSERT INTO public.partner_statement_revisions
    (partner_id, period_year, period_month, revision_no, action, actor_id, snapshot)
  VALUES (_partner_id, _year, _month, v_revision, 'mark_paid', v_actor,
          jsonb_build_object('payout_reference', _payout_reference,
                             'total_payout', v_row.total_payout,
                             'paid_at', v_row.paid_at));

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (v_actor, 'partner_statement_mark_paid', 'partner_monthly_statements',
          _partner_id::text,
          jsonb_build_object('year',_year,'month',_month,'reference',_payout_reference,
                             'total_payout', v_row.total_payout));

  RETURN to_jsonb(v_row);
END;
$$;