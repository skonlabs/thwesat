import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeMonthlyStatement,
  monthsBetween,
  periodBoundsYangon,
  ageBucket,
  type AttributedPayment,
  type ReversalEntry,
} from "@/lib/partner-finance";

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
        .select("user_id, attributed_at, first_paid_at")
        .eq("partner_id", partner.id);
      if (aErr) throw aErr;
      const userIds = (attribs || []).map((a: any) => a.user_id);
      // Use first_paid_at when present; otherwise leave undefined and
      // fall back to the payment's own date so age = 0 (Growth) for the
      // very first txn rather than wrongly aging from attribution date.
      const firstPaidByUser = new Map<string, string | null>(
        (attribs || []).map((a: any) => [a.user_id, a.first_paid_at || null]),
      );

      let payments: AttributedPayment[] = [];
      // Map from payment_request_id -> bucket of original payment (for reversal classification)
      const paymentBucketById = new Map<string, ReturnType<typeof ageBucket>>();

      if (userIds.length > 0) {
        const { data: pays, error: pErr } = await (supabase as any)
          .from("payment_requests")
          .select("id, user_id, payment_type, amount, currency, third_party_payout, npr_amount, revenue_classification, reviewed_at, status")
          .in("user_id", userIds)
          .eq("status", "approved")
          .eq("currency", "MMK")
          .gte("reviewed_at", start)
          .lt("reviewed_at", endExclusive);
        if (pErr) throw pErr;
        payments = (pays || []).map((p: any) => {
          const ageBase = firstPaidByUser.get(p.user_id) || p.reviewed_at;
          const months = monthsBetween(ageBase, periodEndIso);
          const bucket = ageBucket(months);
          paymentBucketById.set(p.id, bucket);
          return {
            user_id: p.user_id,
            payment_type: p.payment_type,
            amount: Number(p.amount || 0),
            third_party_payout: Number(p.third_party_payout || 0),
            npr_amount_override: p.npr_amount,
            approved_at: p.reviewed_at,
            classification: (p.revenue_classification || "new") as any,
            account_age_months: months,
          };
        });
      }

      // Reversals occurring in this period for attributed users.
      // For each reversal, look up the ORIGINAL payment to determine its bucket
      // (the original payment may be from any prior period).
      const { data: revRowsRaw } = await (supabase as any)
        .from("payment_reversals")
        .select("amount, currency, npr_amount, occurred_at, payment_request_id")
        .gte("occurred_at", start)
        .lt("occurred_at", endExclusive);
      const revRows = (revRowsRaw || []) as any[];
      const origIds = Array.from(new Set(revRows.map((r) => r.payment_request_id)));
      let origPayments: any[] = [];
      if (origIds.length > 0) {
        const { data: origs } = await (supabase as any)
          .from("payment_requests")
          .select("id, user_id, reviewed_at, currency")
          .in("id", origIds);
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
          // Bucket = bucket of the original payment at the time it was approved
          const ageBase = firstPaidByUser.get(o.user_id) || o.reviewed_at;
          const monthsAtOrig = monthsBetween(ageBase, o.reviewed_at);
          return {
            amount_npr: Number(r.npr_amount ?? r.amount ?? 0),
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
        quality: qRows || null,
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
        ...computation,
      };
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
      const { error } = await (supabase as any).from("partner_monthly_statements").upsert({
        partner_id: input.partner_id,
        period_year: input.year,
        period_month: input.month,
        gross_attributed_npr: input.preview.gross_attributed_npr,
        reversals_npr: input.preview.reversals_npr,
        net_collected_attributed_npr: input.preview.net_collected_attributed_npr,
        growth_npr: input.preview.growth_npr,
        maintenance_y2_npr: input.preview.maintenance_y2_npr,
        maintenance_y3_npr: input.preview.maintenance_y3_npr,
        growth_tier_pct: input.preview.growth_tier_pct,
        growth_bonus_pct: input.preview.growth_bonus_pct,
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
