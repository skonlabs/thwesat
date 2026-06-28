import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { periodBoundsYangon } from "@/lib/partner-finance";

const MAX_ROWS = 50_000; // explicit cap to avoid the silent 1000-row default
const IN_CHUNK = 500;    // Postgres parameter / URL length safety bound for .in()
const STALE_30S = 30_000;
const STALE_60S = 60_000;

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
  user_id?: string | null;
}

/** Admin-scope: list every partner. RLS restricts non-admins server-side. */
export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    staleTime: STALE_60S,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((p) => ({ ...p, id: p.user_id, name: p.display_name })) as Partner[];
    },
  });
}

/** Partner-scope: returns ONLY the caller's own partner record via RPC. */
export function useCurrentPartner() {
  return useQuery({
    queryKey: ["current-partner"],
    staleTime: STALE_60S,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("current_partner");
      if (error) throw error;
      const rows = (data || []) as Partner[];
      return rows[0] ?? null;
    },
  });
}

export function usePartnerAttributions(partnerId?: string | null) {
  return useQuery({
    queryKey: ["partner-attributions", partnerId],
    enabled: !!partnerId,
    staleTime: STALE_30S,
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
    staleTime: STALE_30S,
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
    staleTime: STALE_60S,
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
    staleTime: STALE_60S,
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

export function usePartnerStatementPreview(
  partner: Partner | null | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["partner-statement-preview", partner?.id, year, month],
    enabled: !!partner,
    staleTime: STALE_30S,
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

export function usePartnerPeriodPayments(
  partner: Partner | null | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["partner-period-payments", partner?.id, year, month],
    enabled: !!partner,
    staleTime: STALE_30S,
    queryFn: async () => {
      if (!partner) return [];
      const { start, endExclusive } = periodBoundsYangon(year, month);
      const { data: attribs } = await (supabase as any)
        .from("partner_attributions")
        .select("user_id, attributed_at")
        .eq("partner_id", partner.id)
        .limit(MAX_ROWS);
      const userIds = Array.from(new Set<string>((attribs || []).map((a: any) => a.user_id)));
      if (userIds.length === 0) return [];
      const attributionByUser = new Map<string, string>(
        (attribs || []).map((a: any) => [a.user_id, a.attributed_at]),
      );

      // Chunk the IN clause to avoid silent truncation when a partner has
      // tens of thousands of attributed users (Postgres parameter cap).
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += IN_CHUNK) {
        chunks.push(userIds.slice(i, i + IN_CHUNK));
      }
      const results = await Promise.all(
        chunks.map((ids) =>
          (supabase as any)
            .from("subscription_payment_requests")
            .select(
              "id, user_id, payment_type, amount, currency, third_party_payout, npr_amount, revenue_classification, reviewed_at",
            )
            .in("user_id", ids)
            .eq("status", "approved")
            .eq("currency", "MMK")
            .gte("reviewed_at", start)
            .lt("reviewed_at", endExclusive)
            .order("reviewed_at", { ascending: false }),
        ),
      );
      const merged: any[] = [];
      for (const r of results) {
        if (r.error) throw r.error;
        merged.push(...(r.data || []));
      }
      return merged.filter((p: any) => {
        const attributedAt = attributionByUser.get(p.user_id);
        return !attributedAt || new Date(p.reviewed_at).getTime() >= new Date(attributedAt).getTime();
      });
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
    mutationFn: async (input: { partner_id: string; year: number; month: number; preview: any }) => {
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

// ============================================================
// PA: Audited mutation wrappers
// ============================================================
export function useAdminAttributeUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { partner_id: string; user_id: string; channel: string }) => {
      const { error } = await (supabase as any).rpc("admin_attribute_user", {
        _partner_id: input.partner_id,
        _user_id: input.user_id,
        _channel: input.channel,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-attributions", vars.partner_id] });
      qc.invalidateQueries({ queryKey: ["partner-statement-preview", vars.partner_id] });
    },
  });
}

export function useAdminLinkPartnerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { partner_id: string; user_id: string }) => {
      const { error } = await (supabase as any).rpc("admin_link_partner_user", {
        _partner_id: input.partner_id,
        _user_id: input.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

export function useAdminUnlinkPartnerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partner_id: string) => {
      const { error } = await (supabase as any).rpc("admin_unlink_partner_user", { _partner_id: partner_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

export function useAdminCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      code: string;
      contact_email?: string | null;
      contract_start_date?: string;
      user_id?: string | null;
    }) => {
      const { error } = await (supabase as any).rpc("admin_create_partner", {
        _name: input.name,
        _code: input.code,
        _contact_email: input.contact_email ?? null,
        _contract_start_date: input.contract_start_date ?? new Date().toISOString().slice(0, 10),
        _user_id: input.user_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

export function useAdminRecordReversal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      payment_request_id: string;
      reversal_type: string;
      amount: number;
      npr_amount?: number | null;
      reason?: string | null;
    }) => {
      const { error } = await (supabase as any).rpc("admin_record_payment_reversal", {
        _payment_request_id: input.payment_request_id,
        _reversal_type: input.reversal_type,
        _amount: input.amount,
        _npr_amount: input.npr_amount ?? null,
        _reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-reversals"] });
      qc.invalidateQueries({ queryKey: ["partner-statement-preview"] });
    },
  });
}
