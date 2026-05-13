-- Canonical server-side partner finance calculation and finalize RPCs.
-- This moves the revenue-share source of truth out of browser code.

CREATE OR REPLACE FUNCTION public.partner_period_bounds_yangon(_year int, _month int)
RETURNS TABLE(start_at timestamptz, end_at timestamptz)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    make_timestamptz(_year, _month, 1, 0, 0, 0, 'Asia/Yangon') AS start_at,
    (make_timestamptz(_year, _month, 1, 0, 0, 0, 'Asia/Yangon') + INTERVAL '1 month') AS end_at
$$;

CREATE OR REPLACE FUNCTION public.partner_months_between(_from timestamptz, _to timestamptz)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    (
      (EXTRACT(YEAR FROM timezone('UTC', _to))::int - EXTRACT(YEAR FROM timezone('UTC', _from))::int) * 12
      + (EXTRACT(MONTH FROM timezone('UTC', _to))::int - EXTRACT(MONTH FROM timezone('UTC', _from))::int)
      - CASE WHEN EXTRACT(DAY FROM timezone('UTC', _to))::int < EXTRACT(DAY FROM timezone('UTC', _from))::int THEN 1 ELSE 0 END
    )::int
  )
$$;

CREATE OR REPLACE FUNCTION public.partner_age_bucket(_months int)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_months, 0) <= 12 THEN 'growth'
    WHEN COALESCE(_months, 0) <= 24 THEN 'maintenance_y2'
    ELSE 'maintenance_y3'
  END
$$;

CREATE OR REPLACE FUNCTION public.partner_payment_npr(
  _payment_type text,
  _amount numeric,
  _third_party_payout numeric,
  _npr_amount numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _npr_amount IS NOT NULL THEN GREATEST(0, _npr_amount)
    WHEN _payment_type = 'mentor_session' THEN GREATEST(0, COALESCE(_amount, 0) * 0.15)
    ELSE GREATEST(0, COALESCE(_amount, 0) - COALESCE(_third_party_payout, 0))
  END
$$;

CREATE OR REPLACE FUNCTION public.admin_compute_partner_statement(
  _partner_id uuid,
  _year int,
  _month int
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner public.partners%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
  v_period_end timestamptz;
  v_l1 numeric;
  v_csat numeric;
  v_dispute numeric;
  v_fraud numeric;
  v_onboarding_pct numeric;
  v_onboarded_count int;
  v_eligible_attributions_count int;
  v_attributed_users_count int;
  v_payments_count int;
  v_growth_gross numeric;
  v_y2_gross numeric;
  v_y3_gross numeric;
  v_growth_rev numeric;
  v_y2_rev numeric;
  v_y3_rev numeric;
  v_growth numeric;
  v_y2 numeric;
  v_y3 numeric;
  v_gross numeric;
  v_reversals numeric;
  v_net numeric;
  v_prior_growth numeric;
  v_active_growth_ratio numeric;
  v_active_growth_requirement_met boolean;
  v_approved_tier_pct numeric;
  v_tier_approval_required boolean;
  v_growth_tier_pct numeric;
  v_mom_growth_pct numeric;
  v_growth_bonus_pct numeric;
  v_quality_gate_passed boolean;
  v_growth_payout numeric;
  v_maintenance_payout numeric;
  v_bonus_payout numeric;
  v_total_uncapped numeric;
  v_cap_value numeric;
  v_total_payout numeric;
  v_cap_applied boolean;
  v_quality_breakdown jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _month < 1 OR _month > 12 THEN
    RAISE EXCEPTION 'invalid_month: %', _month;
  END IF;

  SELECT * INTO v_partner
  FROM public.partners
  WHERE id = _partner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner_not_found';
  END IF;

  SELECT start_at, end_at INTO v_start, v_end
  FROM public.partner_period_bounds_yangon(_year, _month);
  v_period_end := v_end - INTERVAL '1 millisecond';

  SELECT COUNT(*)::int INTO v_attributed_users_count
  FROM public.partner_attributions pa
  WHERE pa.partner_id = _partner_id;

  SELECT COUNT(*)::int, COUNT(*) FILTER (WHERE pa.onboarding_completed_at IS NOT NULL)::int
  INTO v_eligible_attributions_count, v_onboarded_count
  FROM public.partner_attributions pa
  WHERE pa.partner_id = _partner_id
    AND pa.attributed_at <= (v_end - INTERVAL '7 days');

  v_onboarding_pct := CASE
    WHEN COALESCE(v_eligible_attributions_count, 0) = 0 THEN 100
    ELSE (v_onboarded_count::numeric / v_eligible_attributions_count::numeric) * 100
  END;

  WITH eligible_payments AS (
    SELECT
      pr.id,
      pr.user_id,
      pr.payment_type,
      pr.amount,
      pr.third_party_payout,
      pr.npr_amount,
      pr.reviewed_at,
      pa.attributed_at,
      public.partner_payment_npr(pr.payment_type, pr.amount, pr.third_party_payout, pr.npr_amount) AS npr,
      public.partner_age_bucket(public.partner_months_between(pa.attributed_at, v_period_end)) AS bucket
    FROM public.payment_requests pr
    JOIN public.partner_attributions pa ON pa.user_id = pr.user_id
    WHERE pa.partner_id = _partner_id
      AND pr.status = 'approved'
      AND pr.currency = 'MMK'
      AND pr.reviewed_at IS NOT NULL
      AND pr.reviewed_at >= v_start
      AND pr.reviewed_at < v_end
      AND pr.reviewed_at >= pa.attributed_at
  )
  SELECT
    COALESCE(COUNT(*), 0)::int,
    COALESCE(SUM(npr) FILTER (WHERE bucket = 'growth'), 0),
    COALESCE(SUM(npr) FILTER (WHERE bucket = 'maintenance_y2'), 0),
    COALESCE(SUM(npr) FILTER (WHERE bucket = 'maintenance_y3'), 0)
  INTO v_payments_count, v_growth_gross, v_y2_gross, v_y3_gross
  FROM eligible_payments;

  WITH reversal_source AS (
    SELECT
      r.amount AS reversal_gross,
      r.npr_amount AS reversal_npr_override,
      o.payment_type,
      o.amount AS original_gross,
      o.third_party_payout,
      o.npr_amount AS original_npr_override,
      o.reviewed_at AS original_reviewed_at,
      pa.attributed_at,
      public.partner_age_bucket(public.partner_months_between(pa.attributed_at, o.reviewed_at)) AS bucket
    FROM public.payment_reversals r
    JOIN public.payment_requests o ON o.id = r.payment_request_id
    JOIN public.partner_attributions pa ON pa.user_id = o.user_id
    WHERE pa.partner_id = _partner_id
      AND r.occurred_at >= v_start
      AND r.occurred_at < v_end
      AND COALESCE(o.currency, 'MMK') = 'MMK'
      AND o.status = 'approved'
      AND o.reviewed_at IS NOT NULL
      AND o.reviewed_at >= pa.attributed_at
  ), reversal_npr AS (
    SELECT
      bucket,
      CASE
        WHEN reversal_npr_override IS NOT NULL THEN GREATEST(0, reversal_npr_override)
        ELSE public.partner_payment_npr(payment_type, original_gross, third_party_payout, original_npr_override)
             * CASE WHEN COALESCE(original_gross, 0) > 0 THEN LEAST(1, GREATEST(0, COALESCE(reversal_gross, 0) / original_gross)) ELSE 1 END
      END AS amount_npr
    FROM reversal_source
  )
  SELECT
    COALESCE(SUM(amount_npr) FILTER (WHERE bucket = 'growth'), 0),
    COALESCE(SUM(amount_npr) FILTER (WHERE bucket = 'maintenance_y2'), 0),
    COALESCE(SUM(amount_npr) FILTER (WHERE bucket = 'maintenance_y3'), 0)
  INTO v_growth_rev, v_y2_rev, v_y3_rev
  FROM reversal_npr;

  v_growth := GREATEST(0, COALESCE(v_growth_gross, 0) - COALESCE(v_growth_rev, 0));
  v_y2 := GREATEST(0, COALESCE(v_y2_gross, 0) - COALESCE(v_y2_rev, 0));
  v_y3 := GREATEST(0, COALESCE(v_y3_gross, 0) - COALESCE(v_y3_rev, 0));
  v_gross := COALESCE(v_growth_gross, 0) + COALESCE(v_y2_gross, 0) + COALESCE(v_y3_gross, 0);
  v_reversals := COALESCE(v_growth_rev, 0) + COALESCE(v_y2_rev, 0) + COALESCE(v_y3_rev, 0);
  v_net := GREATEST(0, v_gross - v_reversals);

  SELECT
    q.l1_sla_pct,
    q.csat_score,
    q.dispute_rate_pct,
    q.fraud_rate_pct
  INTO v_l1, v_csat, v_dispute, v_fraud
  FROM public.partner_quality_metrics q
  WHERE q.partner_id = _partner_id
    AND q.period_year = _year
    AND q.period_month = _month;

  v_quality_breakdown := jsonb_build_object(
    'l1_sla_pct', jsonb_build_object('value', COALESCE(v_l1, 0), 'threshold', 90, 'pass', COALESCE(v_l1, 0) >= 90),
    'csat_score', jsonb_build_object('value', COALESCE(v_csat, 0), 'threshold', 4.0, 'pass', COALESCE(v_csat, 0) >= 4.0),
    'dispute_rate_pct', jsonb_build_object('value', COALESCE(v_dispute, 100), 'threshold', 1.0, 'pass', COALESCE(v_dispute, 100) <= 1.0),
    'fraud_rate_pct', jsonb_build_object('value', COALESCE(v_fraud, 100), 'threshold', 0.5, 'pass', COALESCE(v_fraud, 100) <= 0.5),
    'onboarding_pct', jsonb_build_object('value', COALESCE(v_onboarding_pct, 0), 'threshold', 80, 'pass', COALESCE(v_onboarding_pct, 0) >= 80)
  );

  v_quality_gate_passed :=
    COALESCE(v_l1, 0) >= 90
    AND COALESCE(v_csat, 0) >= 4.0
    AND COALESCE(v_dispute, 100) <= 1.0
    AND COALESCE(v_fraud, 100) <= 0.5
    AND COALESCE(v_onboarding_pct, 0) >= 80;

  SELECT COALESCE(s.growth_npr, 0) INTO v_prior_growth
  FROM public.partner_monthly_statements s
  WHERE s.partner_id = _partner_id
    AND s.period_year = CASE WHEN _month = 1 THEN _year - 1 ELSE _year END
    AND s.period_month = CASE WHEN _month = 1 THEN 12 ELSE _month - 1 END;
  v_prior_growth := COALESCE(v_prior_growth, 0);

  v_active_growth_ratio := CASE WHEN v_net > 0 THEN v_growth / v_net ELSE 0 END;
  v_active_growth_requirement_met := v_active_growth_ratio >= 0.25;

  SELECT t.approved_tier_pct INTO v_approved_tier_pct
  FROM public.partner_tier_approvals t
  WHERE t.partner_id = _partner_id
    AND t.period_year = _year
    AND t.period_month = _month;

  v_tier_approval_required := v_growth >= 80000000 AND v_approved_tier_pct IS NULL;
  v_growth_tier_pct := CASE
    WHEN v_growth >= 80000000 THEN COALESCE(v_approved_tier_pct, 0)
    WHEN v_growth >= 30000000 THEN 0.25
    WHEN v_growth >= 10000000 THEN 0.20
    ELSE 0.15
  END;
  v_mom_growth_pct := CASE WHEN v_prior_growth > 0 THEN (v_growth - v_prior_growth) / v_prior_growth ELSE 0 END;
  v_growth_bonus_pct := CASE
    WHEN NOT v_active_growth_requirement_met THEN 0
    WHEN v_mom_growth_pct >= 0.40 THEN 0.05
    WHEN v_mom_growth_pct >= 0.25 THEN 0.03
    WHEN v_mom_growth_pct >= 0.15 THEN 0.02
    ELSE 0
  END;

  v_growth_payout := CASE WHEN v_quality_gate_passed AND v_active_growth_requirement_met THEN v_growth * v_growth_tier_pct ELSE 0 END;
  v_maintenance_payout := v_y2 * COALESCE(v_partner.maintenance_rate_y2, 0.075) + v_y3 * COALESCE(v_partner.maintenance_rate_y3plus, 0.05);
  v_bonus_payout := CASE WHEN v_quality_gate_passed AND v_active_growth_requirement_met THEN v_growth * v_growth_bonus_pct ELSE 0 END;
  v_total_uncapped := v_growth_payout + v_maintenance_payout + v_bonus_payout;
  v_cap_value := v_net * COALESCE(v_partner.payout_cap_pct, 0.35);
  v_total_payout := LEAST(v_total_uncapped, v_cap_value);
  v_cap_applied := v_total_uncapped > v_cap_value;

  RETURN jsonb_build_object(
    'partner', to_jsonb(v_partner),
    'year', _year,
    'month', _month,
    'payments_count', COALESCE(v_payments_count, 0),
    'attributed_users_count', COALESCE(v_attributed_users_count, 0),
    'eligible_attributions_count', COALESCE(v_eligible_attributions_count, 0),
    'onboarded_count', COALESCE(v_onboarded_count, 0),
    'onboarding_pct', COALESCE(v_onboarding_pct, 100),
    'growth_npr_gross', COALESCE(v_growth_gross, 0),
    'maintenance_y2_npr_gross', COALESCE(v_y2_gross, 0),
    'maintenance_y3_npr_gross', COALESCE(v_y3_gross, 0),
    'growth_npr', COALESCE(v_growth, 0),
    'maintenance_y2_npr', COALESCE(v_y2, 0),
    'maintenance_y3_npr', COALESCE(v_y3, 0),
    'gross_attributed_npr', COALESCE(v_gross, 0),
    'reversals_npr', COALESCE(v_reversals, 0),
    'net_collected_attributed_npr', COALESCE(v_net, 0),
    'active_growth_ratio', COALESCE(v_active_growth_ratio, 0),
    'active_growth_requirement_met', COALESCE(v_active_growth_requirement_met, false),
    'growth_tier_pct', COALESCE(v_growth_tier_pct, 0),
    'growth_bonus_pct', COALESCE(v_growth_bonus_pct, 0),
    'mom_growth_pct', COALESCE(v_mom_growth_pct, 0),
    'quality_gate_passed', COALESCE(v_quality_gate_passed, false),
    'quality_gate_breakdown', v_quality_breakdown,
    'tier_approval_required', COALESCE(v_tier_approval_required, false),
    'growth_payout', COALESCE(v_growth_payout, 0),
    'maintenance_payout', COALESCE(v_maintenance_payout, 0),
    'bonus_payout', COALESCE(v_bonus_payout, 0),
    'total_payout_uncapped', COALESCE(v_total_uncapped, 0),
    'total_payout', COALESCE(v_total_payout, 0),
    'cap_applied', COALESCE(v_cap_applied, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finalize_partner_statement(
  _partner_id uuid,
  _year int,
  _month int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_preview jsonb;
  v_partner jsonb;
  v_inputs jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  v_preview := public.admin_compute_partner_statement(_partner_id, _year, _month);
  v_partner := v_preview -> 'partner';
  v_inputs := jsonb_build_object(
    'snapshot_at', now(),
    'computed_by', 'admin_finalize_partner_statement',
    'partner_terms', jsonb_build_object(
      'maintenance_rate_y2', COALESCE((v_partner ->> 'maintenance_rate_y2')::numeric, 0.075),
      'maintenance_rate_y3plus', COALESCE((v_partner ->> 'maintenance_rate_y3plus')::numeric, 0.05),
      'payout_cap_pct', COALESCE((v_partner ->> 'payout_cap_pct')::numeric, 0.35)
    ),
    'period_summary', jsonb_build_object(
      'payments_count', (v_preview ->> 'payments_count')::int,
      'attributed_users_count', (v_preview ->> 'attributed_users_count')::int,
      'eligible_attributions_count', (v_preview ->> 'eligible_attributions_count')::int,
      'onboarded_count', (v_preview ->> 'onboarded_count')::int,
      'onboarding_pct', (v_preview ->> 'onboarding_pct')::numeric,
      'quality_gate_breakdown', v_preview -> 'quality_gate_breakdown',
      'tier_approval_required', (v_preview ->> 'tier_approval_required')::boolean
    )
  );

  INSERT INTO public.partner_monthly_statements (
    partner_id,
    period_year,
    period_month,
    currency,
    gross_attributed_npr,
    reversals_npr,
    net_collected_attributed_npr,
    growth_npr,
    maintenance_y2_npr,
    maintenance_y3_npr,
    growth_tier_pct,
    growth_bonus_pct,
    maintenance_y2_pct,
    maintenance_y3_pct,
    mom_growth_pct,
    active_growth_ratio,
    quality_gate_passed,
    active_growth_requirement_met,
    growth_payout,
    maintenance_payout,
    bonus_payout,
    total_payout_uncapped,
    total_payout,
    cap_applied,
    computation_inputs,
    status,
    finalized_at,
    finalized_by,
    created_by
  ) VALUES (
    _partner_id,
    _year,
    _month,
    'MMK',
    (v_preview ->> 'gross_attributed_npr')::numeric,
    (v_preview ->> 'reversals_npr')::numeric,
    (v_preview ->> 'net_collected_attributed_npr')::numeric,
    (v_preview ->> 'growth_npr')::numeric,
    (v_preview ->> 'maintenance_y2_npr')::numeric,
    (v_preview ->> 'maintenance_y3_npr')::numeric,
    (v_preview ->> 'growth_tier_pct')::numeric,
    (v_preview ->> 'growth_bonus_pct')::numeric,
    COALESCE((v_partner ->> 'maintenance_rate_y2')::numeric, 0.075),
    COALESCE((v_partner ->> 'maintenance_rate_y3plus')::numeric, 0.05),
    (v_preview ->> 'mom_growth_pct')::numeric,
    (v_preview ->> 'active_growth_ratio')::numeric,
    (v_preview ->> 'quality_gate_passed')::boolean,
    (v_preview ->> 'active_growth_requirement_met')::boolean,
    (v_preview ->> 'growth_payout')::numeric,
    (v_preview ->> 'maintenance_payout')::numeric,
    (v_preview ->> 'bonus_payout')::numeric,
    (v_preview ->> 'total_payout_uncapped')::numeric,
    (v_preview ->> 'total_payout')::numeric,
    (v_preview ->> 'cap_applied')::boolean,
    v_inputs,
    'finalized',
    now(),
    v_caller,
    v_caller
  )
  ON CONFLICT (partner_id, period_year, period_month)
  DO UPDATE SET
    currency = EXCLUDED.currency,
    gross_attributed_npr = EXCLUDED.gross_attributed_npr,
    reversals_npr = EXCLUDED.reversals_npr,
    net_collected_attributed_npr = EXCLUDED.net_collected_attributed_npr,
    growth_npr = EXCLUDED.growth_npr,
    maintenance_y2_npr = EXCLUDED.maintenance_y2_npr,
    maintenance_y3_npr = EXCLUDED.maintenance_y3_npr,
    growth_tier_pct = EXCLUDED.growth_tier_pct,
    growth_bonus_pct = EXCLUDED.growth_bonus_pct,
    maintenance_y2_pct = EXCLUDED.maintenance_y2_pct,
    maintenance_y3_pct = EXCLUDED.maintenance_y3_pct,
    mom_growth_pct = EXCLUDED.mom_growth_pct,
    active_growth_ratio = EXCLUDED.active_growth_ratio,
    quality_gate_passed = EXCLUDED.quality_gate_passed,
    active_growth_requirement_met = EXCLUDED.active_growth_requirement_met,
    growth_payout = EXCLUDED.growth_payout,
    maintenance_payout = EXCLUDED.maintenance_payout,
    bonus_payout = EXCLUDED.bonus_payout,
    total_payout_uncapped = EXCLUDED.total_payout_uncapped,
    total_payout = EXCLUDED.total_payout,
    cap_applied = EXCLUDED.cap_applied,
    computation_inputs = EXCLUDED.computation_inputs,
    status = 'finalized',
    finalized_at = EXCLUDED.finalized_at,
    finalized_by = EXCLUDED.finalized_by;

  RETURN v_preview;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_period_bounds_yangon(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_months_between(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_age_bucket(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_payment_npr(text, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_compute_partner_statement(uuid, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_finalize_partner_statement(uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_compute_partner_statement(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finalize_partner_statement(uuid, int, int) TO authenticated;