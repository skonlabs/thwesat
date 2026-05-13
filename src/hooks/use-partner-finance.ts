import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeMonthlyStatement,
  monthsBetween,
  periodBoundsYangon,
  ageBucket,
  nprForPayment,
  type AttributedPayment,
  type ReversalEntry,
} from "@/lib/partner-finance";

const MAX_ROWS = 50_000; // explicit cap to avoid the silent 1000-row default

export interface Partner {
  id: string;
  code: string;
  name: string;
  contact_email: string | null;
  contract_start_date: string;
  contract_end_date: string | null;
  maintenance_rate_y2: number;
  maintenance_rate_y3plus: number;
  payout_cap_pct: number;
  is_active: boolean;
  notes: string | null;
}

export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });
}

export function usePartnerAttributions(partnerId?: string | null) {
  return useQuery({
    queryKey: ["partner-attributions", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_attributions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("attributed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function usePaymentReversals() {
  return useQuery({
    queryKey: ["payment-reversals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_reversals")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function usePartnerStatements(partnerId?: string | null) {
  return useQuery({
    queryKey: ["partner-statements", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_monthly_statements")
        .select("*")
        .eq("partner_id", partnerId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function usePartnerQualityMetrics(partnerId?: string | null) {
  return useQuery({
    queryKey: ["partner-quality", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_quality_metrics")
        .select("*")
        .eq("partner_id", partnerId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

/**
 * Compute (preview) a monthly statement for a partner from raw approved
 * payments + reversals. Returns numbers + the inputs needed to persist.
 */
export function usePartnerStatementPreview(
  partner: Partner | null | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["partner-statement-preview", partner?.id, year, month],
    enabled: !!partner,
    queryFn: async () => {
      if (!partner) return null;
      const { start, endExclusive } = periodBoundsYangon(year, month);
      const periodEndIso = new Date(new Date(endExclusive).getTime() - 1).toISOString();

      // Attributions for this partner
      const { data: attribs, error: aErr } = await (supabase as any)
        .from("partner_attributions")
        .select("user_id, attributed_at, first_paid_at, onboarding_completed_at")
        .eq("partner_id", partner.id)
        .limit(MAX_ROWS);
      if (aErr) throw aErr;
      const userIds = (attribs || []).map((a: any) => a.user_id);
      // Age base = attributed_at (≈ signup) per SOP "first 12 months from joining".
      // Fall back to first_paid_at only if attribution timestamp is missing.
      const ageBaseByUser = new Map<string, string | null>(
        (attribs || []).map((a: any) => [a.user_id, a.attributed_at || a.first_paid_at || null]),
      );
      // Onboarding %: only count attributions that have had a full 7-day window
      // BEFORE period end. Younger ones still have time to onboard and shouldn't
      // count as failures yet. Use Date.getTime() to avoid ISO suffix mismatches
      // (Postgres `+00:00` vs JS `Z`).
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const cutoffMs = new Date(endExclusive).getTime() - sevenDaysMs;
      const eligible = (attribs || []).filter(
        (a: any) => a.attributed_at && new Date(a.attributed_at).getTime() <= cutoffMs,
      );
      const onboardedCount = eligible.filter((a: any) => !!a.onboarding_completed_at).length;
      const onboardingPct = eligible.length > 0 ? (onboardedCount / eligible.length) * 100 : 100; // vacuously true if no eligible attribs

      let payments: AttributedPayment[] = [];
      // payment_request_id -> {bucket, payment_type, amount, third_party_payout, npr_amount}
      // (used to compute the correct NPR for any reversal whose npr_amount is missing)
      const paymentByIdForReversal = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: pays, error: pErr } = await (supabase as any)
          .from("payment_requests")
          .select("id, user_id, payment_type, amount, currency, third_party_payout, npr_amount, revenue_classification, reviewed_at, status")
          .in("user_id", userIds)
          .eq("status", "approved")
          .eq("currency", "MMK")
          .gte("reviewed_at", start)
          .lt("reviewed_at", endExclusive)
          .limit(MAX_ROWS);
        if (pErr) throw pErr;
        payments = (pays || []).map((p: any) => {
          const ageBase = firstPaidByUser.get(p.user_id) || p.reviewed_at;
          const months = monthsBetween(ageBase, periodEndIso);
          const ap: AttributedPayment = {
            user_id: p.user_id,
            payment_type: p.payment_type,
            amount: Number(p.amount || 0),
            third_party_payout: Number(p.third_party_payout || 0),
            npr_amount_override: p.npr_amount,
            approved_at: p.reviewed_at,
            classification: (p.revenue_classification || "new") as any,
            account_age_months: months,
          };
          paymentByIdForReversal.set(p.id, { ap, reviewed_at: p.reviewed_at, user_id: p.user_id });
          return ap;
        });
      }

      // Reversals occurring in this period for attributed users.
      // For each reversal: bucket = bucket of ORIGINAL payment, NPR = original
      // payment's NPR (proportional) when not explicitly set on the reversal row.
      const { data: revRowsRaw } = await (supabase as any)
        .from("payment_reversals")
        .select("amount, currency, npr_amount, occurred_at, payment_request_id")
        .gte("occurred_at", start)
        .lt("occurred_at", endExclusive)
        .limit(MAX_ROWS);
      const revRows = (revRowsRaw || []) as any[];
      const origIds = Array.from(new Set(revRows.map((r) => r.payment_request_id)));
      let origPayments: any[] = [];
      if (origIds.length > 0) {
        const { data: origs } = await (supabase as any)
          .from("payment_requests")
          .select("id, user_id, payment_type, amount, currency, third_party_payout, npr_amount, reviewed_at")
          .in("id", origIds)
          .limit(MAX_ROWS);
        origPayments = origs || [];
      }
      const origById = new Map<string, any>(origPayments.map((o) => [o.id, o]));

      const reversals: ReversalEntry[] = revRows
        .filter((r) => {
          const o = origById.get(r.payment_request_id);
          return o && userIds.includes(o.user_id) && (o.currency || "MMK") === "MMK";
        })
        .map((r) => {
          const o = origById.get(r.payment_request_id);
          const ageBase = firstPaidByUser.get(o.user_id) || o.reviewed_at;
          const monthsAtOrig = monthsBetween(ageBase, o.reviewed_at);
          // Compute NPR of the reversal: prefer explicit, else proportional to
          // original NPR using ratio of reversed gross to original gross.
          const reversedGross = Number(r.amount || 0);
          const origGross = Number(o.amount || 0);
          let nprAmount: number;
          if (r.npr_amount != null) {
            nprAmount = Number(r.npr_amount);
          } else {
            const origNpr = nprForPayment({
              user_id: o.user_id,
              payment_type: o.payment_type,
              amount: origGross,
              third_party_payout: Number(o.third_party_payout || 0),
              npr_amount_override: o.npr_amount,
              approved_at: o.reviewed_at,
              classification: "new",
              account_age_months: 0,
            });
            const ratio = origGross > 0 ? Math.min(1, reversedGross / origGross) : 1;
            nprAmount = origNpr * ratio;
          }
          return {
            amount_npr: Math.max(0, nprAmount),
            occurred_at: r.occurred_at,
            bucket: ageBucket(monthsAtOrig),
          };
        });

      // Quality metrics for the period
      const { data: qRows } = await (supabase as any)
        .from("partner_quality_metrics")
        .select("*")
        .eq("partner_id", partner.id)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();

      // Tier approval (if any)
      const { data: tRow } = await (supabase as any)
        .from("partner_tier_approvals")
        .select("approved_tier_pct")
        .eq("partner_id", partner.id)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();

      // Prior month growth NPR for MoM
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const { data: prevStmt } = await (supabase as any)
        .from("partner_monthly_statements")
        .select("growth_npr")
        .eq("partner_id", partner.id)
        .eq("period_year", prevYear)
        .eq("period_month", prevMonth)
        .maybeSingle();

      const computation = computeMonthlyStatement({
        payments,
        reversals,
        prior_growth_npr: Number(prevStmt?.growth_npr || 0),
        quality: { ...(qRows || {}), onboarding_pct: onboardingPct },
        approved_tier_pct: tRow?.approved_tier_pct ?? null,
        maintenance_y2_pct: Number(partner.maintenance_rate_y2),
        maintenance_y3_pct: Number(partner.maintenance_rate_y3plus),
        payout_cap_pct: Number(partner.payout_cap_pct),
      });

      return {
        partner,
        year,
        month,
        payments_count: payments.length,
        attributed_users_count: userIds.length,
        onboarding_pct: onboardingPct,
        onboarded_count: onboardedCount,
        eligible_attributions_count: eligible.length,
        ...computation,
      };
    },
  });
}

/**
 * Approved MMK payments for users attributed to a partner within a Yangon-aligned
 * month. Used by the override editor (third_party_payout, npr_amount, classification).
 */
export function usePartnerPeriodPayments(
  partner: Partner | null | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["partner-period-payments", partner?.id, year, month],
    enabled: !!partner,
    queryFn: async () => {
      if (!partner) return [];
      const { start, endExclusive } = periodBoundsYangon(year, month);
      const { data: attribs } = await (supabase as any)
        .from("partner_attributions")
        .select("user_id")
        .eq("partner_id", partner.id);
      const userIds = (attribs || []).map((a: any) => a.user_id);
      if (userIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("payment_requests")
        .select("id, user_id, payment_type, amount, currency, third_party_payout, npr_amount, revenue_classification, reviewed_at")
        .in("user_id", userIds)
        .eq("status", "approved")
        .eq("currency", "MMK")
        .gte("reviewed_at", start)
        .lt("reviewed_at", endExclusive)
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useUpdatePaymentOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      third_party_payout?: number | null;
      npr_amount?: number | null;
      revenue_classification?: string | null;
    }) => {
      // Use SECURITY DEFINER RPC so RLS on payment_requests doesn't silently
      // refuse the update — the RPC checks admin role server-side.
      const { error } = await (supabase as any).rpc("admin_set_payment_revenue_overrides", {
        _payment_id: input.id,
        _third_party_payout: input.third_party_payout ?? null,
        _npr_amount: input.npr_amount ?? null,
        _revenue_classification: input.revenue_classification ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-period-payments"] });
      qc.invalidateQueries({ queryKey: ["partner-statement-preview"] });
    },
  });
}

export function useFinalizeStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      partner_id: string;
      year: number;
      month: number;
      preview: any;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const partner = input.preview.partner || {};
      // Snapshot contract terms + raw computation inputs so the statement
      // remains reproducible even if partner.maintenance_rate_* changes later.
      const computationInputs = {
        snapshot_at: new Date().toISOString(),
        partner_terms: {
          maintenance_rate_y2: partner.maintenance_rate_y2,
          maintenance_rate_y3plus: partner.maintenance_rate_y3plus,
          payout_cap_pct: partner.payout_cap_pct,
        },
        period_summary: {
          payments_count: input.preview.payments_count,
          attributed_users_count: input.preview.attributed_users_count,
          eligible_attributions_count: input.preview.eligible_attributions_count,
          onboarded_count: input.preview.onboarded_count,
          onboarding_pct: input.preview.onboarding_pct,
          quality_gate_breakdown: input.preview.quality_gate_breakdown,
          tier_approval_required: input.preview.tier_approval_required,
        },
      };
      const { error } = await (supabase as any).from("partner_monthly_statements").upsert({
        partner_id: input.partner_id,
        period_year: input.year,
        period_month: input.month,
        currency: "MMK",
        gross_attributed_npr: input.preview.gross_attributed_npr,
        reversals_npr: input.preview.reversals_npr,
        net_collected_attributed_npr: input.preview.net_collected_attributed_npr,
        growth_npr: input.preview.growth_npr,
        maintenance_y2_npr: input.preview.maintenance_y2_npr,
        maintenance_y3_npr: input.preview.maintenance_y3_npr,
        growth_tier_pct: input.preview.growth_tier_pct,
        growth_bonus_pct: input.preview.growth_bonus_pct,
        maintenance_y2_pct: Number(partner.maintenance_rate_y2 ?? 0.075),
        maintenance_y3_pct: Number(partner.maintenance_rate_y3plus ?? 0.05),
        mom_growth_pct: input.preview.mom_growth_pct,
        active_growth_ratio: input.preview.active_growth_ratio,
        quality_gate_passed: input.preview.quality_gate_passed,
        active_growth_requirement_met: input.preview.active_growth_requirement_met,
        growth_payout: input.preview.growth_payout,
        maintenance_payout: input.preview.maintenance_payout,
        bonus_payout: input.preview.bonus_payout,
        total_payout_uncapped: input.preview.total_payout_uncapped,
        total_payout: input.preview.total_payout,
        cap_applied: input.preview.cap_applied,
        computation_inputs: computationInputs,
        status: "finalized",
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
        created_by: userId,
      }, { onConflict: "partner_id,period_year,period_month" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-statements"] });
      qc.invalidateQueries({ queryKey: ["partner-statement-preview"] });
    },
  });
}
