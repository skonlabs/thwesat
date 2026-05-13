// Partner revenue-share calculation engine — implements the ThweSat–Partner SOP.
// All amounts are MMK NPR (Net Platform Revenue per txn). Pure functions; no I/O.

export const PLATFORM_MENTOR_CUT = 0.15; // platform keeps 15% of mentor session
export const DEFAULT_PAYOUT_CAP = 0.35;

export interface AttributedPayment {
  user_id: string;
  payment_type: "placement_fee" | "mentor_session" | string;
  amount: number;
  third_party_payout?: number | null;
  npr_amount_override?: number | null;
  approved_at: string;
  classification: "new" | "expansion" | "reactivation";
  account_age_months: number; // at end of period
}

export interface ReversalEntry {
  amount_npr: number;
  occurred_at: string;
  /** Age bucket of the ORIGINAL payment, computed by caller. */
  bucket: AgeBucket;
}

export function nprForPayment(p: AttributedPayment): number {
  if (p.npr_amount_override != null) return Number(p.npr_amount_override);
  const gross = Number(p.amount || 0);
  const thirdParty = Number(p.third_party_payout || 0);
  if (p.payment_type === "mentor_session") {
    return Math.max(0, gross * PLATFORM_MENTOR_CUT);
  }
  return Math.max(0, gross - thirdParty);
}

export type AgeBucket = "growth" | "maintenance_y2" | "maintenance_y3";

export function ageBucket(months: number): AgeBucket {
  if (months <= 12) return "growth";
  if (months <= 24) return "maintenance_y2";
  return "maintenance_y3";
}

export function growthTierPct(growthNpr: number, approvedTierPct?: number | null): number {
  if (growthNpr >= 80_000_000) {
    return approvedTierPct != null ? approvedTierPct : 0.25;
  }
  if (growthNpr >= 30_000_000) return 0.25;
  if (growthNpr >= 10_000_000) return 0.20;
  return 0.15;
}

export function growthBonusPct(momGrowthRatio: number): number {
  if (momGrowthRatio >= 0.40) return 0.05;
  if (momGrowthRatio >= 0.25) return 0.03;
  if (momGrowthRatio >= 0.15) return 0.02;
  return 0;
}

export interface QualityGateInput {
  l1_sla_pct?: number | null;
  csat_score?: number | null;
  dispute_rate_pct?: number | null;
  fraud_rate_pct?: number | null;
}

// NOTE: Thresholds below are placeholders pending verbatim confirmation from the SOP.
// Adjust here once the contract values are confirmed.
export function qualityGatePassed(q: QualityGateInput | null | undefined): boolean {
  if (!q) return false;
  const l1 = q.l1_sla_pct ?? 0;
  const csat = q.csat_score ?? 0;
  const disp = q.dispute_rate_pct ?? 100;
  const fraud = q.fraud_rate_pct ?? 100;
  return l1 >= 90 && csat >= 4.0 && disp <= 1 && fraud <= 0.5;
}

export interface MonthlyComputation {
  // gross by bucket
  growth_npr_gross: number;
  maintenance_y2_npr_gross: number;
  maintenance_y3_npr_gross: number;
  // net by bucket (after reversals)
  growth_npr: number;
  maintenance_y2_npr: number;
  maintenance_y3_npr: number;
  gross_attributed_npr: number;
  reversals_npr: number;
  net_collected_attributed_npr: number;
  active_growth_ratio: number;
  active_growth_requirement_met: boolean;
  growth_tier_pct: number;
  growth_bonus_pct: number;
  mom_growth_pct: number;
  quality_gate_passed: boolean;
  growth_payout: number;
  maintenance_payout: number;
  bonus_payout: number;
  total_payout_uncapped: number;
  total_payout: number;
  cap_applied: boolean;
}

export interface ComputeArgs {
  payments: AttributedPayment[];
  reversals: ReversalEntry[];
  prior_growth_npr: number;
  quality?: QualityGateInput | null;
  approved_tier_pct?: number | null;
  maintenance_y2_pct?: number;
  maintenance_y3_pct?: number;
  payout_cap_pct?: number;
}

export function computeMonthlyStatement(args: ComputeArgs): MonthlyComputation {
  const m_y2 = args.maintenance_y2_pct ?? 0.075;
  const m_y3 = args.maintenance_y3_pct ?? 0.05;
  const cap = args.payout_cap_pct ?? DEFAULT_PAYOUT_CAP;

  let g_gross = 0, y2_gross = 0, y3_gross = 0;
  for (const p of args.payments) {
    const npr = nprForPayment(p);
    const bucket = ageBucket(p.account_age_months);
    if (bucket === "growth") g_gross += npr;
    else if (bucket === "maintenance_y2") y2_gross += npr;
    else y3_gross += npr;
  }

  // Subtract reversals from the bucket of the original payment
  let g_rev = 0, y2_rev = 0, y3_rev = 0;
  for (const r of args.reversals) {
    const v = Number(r.amount_npr || 0);
    if (r.bucket === "growth") g_rev += v;
    else if (r.bucket === "maintenance_y2") y2_rev += v;
    else y3_rev += v;
  }
  const growth = Math.max(0, g_gross - g_rev);
  const y2 = Math.max(0, y2_gross - y2_rev);
  const y3 = Math.max(0, y3_gross - y3_rev);

  const gross = g_gross + y2_gross + y3_gross;
  const reversals = g_rev + y2_rev + y3_rev;
  const net = Math.max(0, gross - reversals);

  const ratio = net > 0 ? growth / net : 0;
  const requirementMet = ratio >= 0.25;

  const baseTier = growthTierPct(growth, args.approved_tier_pct);
  const mom = args.prior_growth_npr > 0 ? (growth - args.prior_growth_npr) / args.prior_growth_npr : 0;
  const bonus = requirementMet ? growthBonusPct(mom) : 0;
  const gate = qualityGatePassed(args.quality);

  // Quality-gate failure zeros growth + bonus only — maintenance is preserved
  // (a partner shouldn't lose protected legacy revenue for a one-month SLA dip).
  // Active-Growth-Requirement failure zeros bonus only (already enforced above).
  const growthPayout = gate && requirementMet ? growth * baseTier : 0;
  const maintenancePayout = y2 * m_y2 + y3 * m_y3;
  const bonusPayout = gate && requirementMet ? growth * bonus : 0;

  const uncapped = growthPayout + maintenancePayout + bonusPayout;
  const capValue = net * cap;
  const total = Math.min(uncapped, capValue);
  const capApplied = uncapped > capValue;

  return {
    growth_npr_gross: g_gross,
    maintenance_y2_npr_gross: y2_gross,
    maintenance_y3_npr_gross: y3_gross,
    growth_npr: growth,
    maintenance_y2_npr: y2,
    maintenance_y3_npr: y3,
    gross_attributed_npr: gross,
    reversals_npr: reversals,
    net_collected_attributed_npr: net,
    active_growth_ratio: ratio,
    active_growth_requirement_met: requirementMet,
    growth_tier_pct: baseTier,
    growth_bonus_pct: bonus,
    mom_growth_pct: mom,
    quality_gate_passed: gate,
    growth_payout: growthPayout,
    maintenance_payout: maintenancePayout,
    bonus_payout: bonusPayout,
    total_payout_uncapped: uncapped,
    total_payout: total,
    cap_applied: capApplied,
  };
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Period bounds on the Asia/Yangon (UTC+6:30) calendar, returned as ISO UTC.
 * A month [year, month] starts at 00:00 Yangon on day 1, ends at start of next month.
 */
const YGN_OFFSET_MIN = 6 * 60 + 30;
export function periodBoundsYangon(year: number, month: number): { start: string; endExclusive: string } {
  const startUtcMs = Date.UTC(year, month - 1, 1) - YGN_OFFSET_MIN * 60_000;
  const endUtcMs = Date.UTC(year, month, 1) - YGN_OFFSET_MIN * 60_000;
  return { start: new Date(startUtcMs).toISOString(), endExclusive: new Date(endUtcMs).toISOString() };
}

// Backwards-compat alias (UTC bounds — kept for callers that explicitly want UTC).
export function periodBoundsUtc(year: number, month: number): { start: string; endExclusive: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), endExclusive: end.toISOString() };
}
