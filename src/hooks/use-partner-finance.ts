import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { periodBoundsYangon } from "@/lib/partner-finance";

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
      const { data, error } = await (supabase as any).rpc("admin_compute_partner_statement", {
        _partner_id: partner.id,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return data;
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
        .select("user_id, attributed_at")
        .eq("partner_id", partner.id)
        .limit(MAX_ROWS);
      const userIds = (attribs || []).map((a: any) => a.user_id);
      if (userIds.length === 0) return [];
      const attributionByUser = new Map<string, string>((attribs || []).map((a: any) => [a.user_id, a.attributed_at]));
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
      return (data || []).filter((p: any) => {
        const attributedAt = attributionByUser.get(p.user_id);
        return !attributedAt || new Date(p.reviewed_at).getTime() >= new Date(attributedAt).getTime();
      }) as any[];
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
      const { error } = await (supabase as any).rpc("admin_finalize_partner_statement", {
        _partner_id: input.partner_id,
        _year: input.year,
        _month: input.month,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-statements"] });
      qc.invalidateQueries({ queryKey: ["partner-statement-preview"] });
    },
  });
}
