// Partner revenue-share calculation engine — implements the ThweSat–Partner SOP.
// All amounts are MMK NPR (Net Platform Revenue per txn). Pure functions; no I/O.
import { roundMmk } from "./finance";

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
  if (p.npr_amount_override != null) return roundMmk(Number(p.npr_amount_override));
  const gross = Number(p.amount || 0);
  const thirdParty = Number(p.third_party_payout || 0);
  if (p.payment_type === "mentor_session") {
    return roundMmk(Math.max(0, gross * PLATFORM_MENTOR_CUT));
  }
  return roundMmk(Math.max(0, gross - thirdParty));
}

export type AgeBucket = "growth" | "maintenance_y2" | "maintenance_y3";

export function ageBucket(months: number): AgeBucket {
  if (months <= 12) return "growth";
  if (months <= 24) return "maintenance_y2";
  return "maintenance_y3";
}

/**
 * Returns the growth-tier % for a given monthly Growth NPR.
 * For ≥80M MMK the SOP requires manual `partner_tier_approvals`. If no
 * approval row exists, return 0 — caller should treat as a hard blocker
 * and zero the growth payout (cannot silently default to 25%).
 */
export function growthTierPct(growthNpr: number, approvedTierPct?: number | null): number {
  if (growthNpr >= 80_000_000) {
    return approvedTierPct != null ? Number(approvedTierPct) : 0;
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
  /** % of attributed users who completed onboarding within 7d (auto-computed). */
  onboarding_pct?: number | null;
}

// Quality Gate thresholds per ThweSat–Partner SOP.
//   L1 SLA              ≥ 90%
//   CSAT                ≥ 4.0
//   Disputes            ≤ 1.0%
//   Fraud write-offs    ≤ 0.5%
//   Onboarding within 7d≥ 80% (auto-computed: profile complete + ≥1 job in 7d)
export const QG_L1_MIN = 90;
export const QG_CSAT_MIN = 4.0;
export const QG_DISPUTE_MAX = 1.0;
export const QG_FRAUD_MAX = 0.5;
export const QG_ONBOARDING_MIN = 80;

export function qualityGatePassed(q: QualityGateInput | null | undefined): boolean {
  if (!q) return false;
  const l1 = q.l1_sla_pct ?? 0;
  const csat = q.csat_score ?? 0;
  const disp = q.dispute_rate_pct ?? 100;
  const fraud = q.fraud_rate_pct ?? 100;
  const onb = q.onboarding_pct ?? 0;
  return l1 >= QG_L1_MIN && csat >= QG_CSAT_MIN && disp <= QG_DISPUTE_MAX
      && fraud <= QG_FRAUD_MAX && onb >= QG_ONBOARDING_MIN;
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
  /** Per-metric pass/fail breakdown for clearer blocker reporting. */
  quality_gate_breakdown: Record<string, { value: number; threshold: number; pass: boolean }>;
  /** True when growth NPR ≥ 80M and no manual tier-approval row exists. */
  tier_approval_required: boolean;
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

  const tierApprovalRequired = growth >= 80_000_000 && (args.approved_tier_pct == null);
  const baseTier = growthTierPct(growth, args.approved_tier_pct);
  const mom = args.prior_growth_npr > 0 ? (growth - args.prior_growth_npr) / args.prior_growth_npr : 0;
  const bonus = requirementMet ? growthBonusPct(mom) : 0;
  const gate = qualityGatePassed(args.quality);

  // Per-metric breakdown so the UI can show which threshold failed.
  const q = args.quality || {};
  const breakdown = {
    l1_sla_pct:        { value: Number(q.l1_sla_pct ?? 0),        threshold: QG_L1_MIN,         pass: Number(q.l1_sla_pct ?? 0)        >= QG_L1_MIN },
    csat_score:        { value: Number(q.csat_score ?? 0),        threshold: QG_CSAT_MIN,       pass: Number(q.csat_score ?? 0)        >= QG_CSAT_MIN },
    dispute_rate_pct:  { value: Number(q.dispute_rate_pct ?? 100),threshold: QG_DISPUTE_MAX,    pass: Number(q.dispute_rate_pct ?? 100)<= QG_DISPUTE_MAX },
    fraud_rate_pct:    { value: Number(q.fraud_rate_pct ?? 100),  threshold: QG_FRAUD_MAX,      pass: Number(q.fraud_rate_pct ?? 100)  <= QG_FRAUD_MAX },
    onboarding_pct:    { value: Number(q.onboarding_pct ?? 0),    threshold: QG_ONBOARDING_MIN, pass: Number(q.onboarding_pct ?? 0)    >= QG_ONBOARDING_MIN },
  };

  // Per SOP: Quality-gate OR Active-Growth-Requirement failure zeros BOTH growth
  // payout and bonus. Maintenance payouts are preserved (legacy revenue protection).
  const growthPayout = gate && requirementMet ? roundMmk(growth * baseTier) : 0;
  const maintenancePayout = roundMmk(y2 * m_y2 + y3 * m_y3);
  const bonusPayout = gate && requirementMet ? roundMmk(growth * bonus) : 0;

  const uncapped = growthPayout + maintenancePayout + bonusPayout;
  const capValue = roundMmk(net * cap);
  const total = roundMmk(Math.min(uncapped, capValue));
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
    quality_gate_breakdown: breakdown,
    tier_approval_required: tierApprovalRequired,
    growth_payout: growthPayout,
    maintenance_payout: maintenancePayout,
    bonus_payout: bonusPayout,
    total_payout_uncapped: uncapped,
    total_payout: total,
    cap_applied: capApplied,
  };
}

/**
 * Completed calendar months between two ISO timestamps using UTC.
 * Browser-timezone-independent. Dec 31 → Jan 1 returns 0 (not 1).
 */
export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
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
