import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unified finance row used by Seeker / Employer / Agent finance screens.
 * Merges payment_requests (mentor sessions, placement fees), topup_requests
 * (legacy credit top-ups) and subscription_payment_requests (subscriptions
 * + add-ons) into one chronological ledger keyed off the authenticated user.
 *
 * Without this merge, employers/agents never saw their subscription/add-on
 * payments and job seekers never saw their credit top-up history — making
 * every finance KPI under-count real activity.
 */
export type UserFinanceRow = {
  id: string;
  source: "payment_request" | "topup_request" | "subscription_payment_request";
  payment_type: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  reference: string | null;
  created_at: string;
  raw: any;
};

export function useUserFinance(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["user-finance", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserFinanceRow[]> => {
      if (!userId) return [];
      const [pr, tr, sr] = await Promise.all([
        supabase
          .from("payment_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("topup_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("subscription_payment_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      const rows: UserFinanceRow[] = [];

      (pr.data || []).forEach((p: any) => {
        rows.push({
          id: p.id,
          source: "payment_request",
          payment_type: p.payment_type,
          amount: Number(p.amount || 0),
          currency: p.currency || "MMK",
          status: p.status,
          payment_method: p.payment_method,
          proof_url: p.proof_url,
          reference: p.reference_id || null,
          created_at: p.created_at,
          raw: p,
        });
      });

      (tr.data || []).forEach((t: any) => {
        rows.push({
          id: t.id,
          source: "topup_request",
          payment_type: "topup",
          amount: Number(t.mmk_amount || 0),
          currency: "MMK",
          status: t.status,
          payment_method: t.payment_method,
          proof_url: t.proof_url,
          reference: t.sender_reference || null,
          created_at: t.created_at,
          raw: t,
        });
      });

      (sr.data || []).forEach((s: any) => {
        rows.push({
          id: s.id,
          source: "subscription_payment_request",
          payment_type: s.request_type === "addon" ? "addon" : "subscription",
          amount: Number(s.mmk_amount || 0),
          currency: "MMK",
          status: s.status,
          payment_method: s.payment_method,
          proof_url: s.proof_url,
          reference: s.sender_reference || null,
          created_at: s.created_at,
          raw: s,
        });
      });

      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows;
    },
  });
}
