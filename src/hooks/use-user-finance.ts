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
  source: "payment_request" | "subscription_payment_request" | "topup_request";
  payment_type: string;
  /** Human-friendly label resolved from plan/addon name when available. */
  display_label: { my: string; en: string } | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  reference: string | null;
  admin_note: string | null;
  created_at: string;
  raw: any;
};

const TIER_LABEL: Record<string, string> = {
  free_trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

export function useUserFinance(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["user-finance", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserFinanceRow[]> => {
      if (!userId) return [];
      const [pr, sr, tr, plans, addons] = await Promise.all([
        (supabase as any)
          .from("payment_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("subscription_payment_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("topup_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        (supabase as any).from("subscription_plans").select("id,tier"),
        (supabase as any).from("addon_products").select("id,label_en,label_my"),
      ]);

      const planMap = new Map<string, string>(
        (plans?.data || []).map((p: any) => [p.id, TIER_LABEL[p.tier] || p.tier]),
      );
      const addonMap = new Map<string, { en: string; my: string }>(
        (addons?.data || []).map((a: any) => [a.id, { en: a.label_en, my: a.label_my || a.label_en }]),
      );


      const rows: UserFinanceRow[] = [];

      (tr.data || []).forEach((t: any) => {
        rows.push({
          id: t.id,
          source: "topup_request",
          payment_type: "wallet_topup",
          display_label: { en: "Wallet Top-up", my: "ပိုက်ဆံအိတ် ဖြည့်" },
          amount: Number(t.mmk_amount || 0),
          currency: "MMK",
          status: t.status,
          payment_method: t.payment_method,
          proof_url: t.proof_url,
          reference: t.sender_reference || null,
          admin_note: t.admin_note || null,
          created_at: t.created_at,
          raw: t,
        });
      });

      (pr.data || []).forEach((p: any) => {
        rows.push({
          id: p.id,
          source: "payment_request",
          payment_type: p.payment_type,
          display_label: null,
          amount: Number(p.amount || 0),
          currency: p.currency || "MMK",
          status: p.status,
          payment_method: p.payment_method,
          proof_url: p.proof_url,
          reference: p.reference_id || null,
          admin_note: p.admin_note || null,
          created_at: p.created_at,
          raw: p,
        });
      });

      (sr.data || []).forEach((s: any) => {
        const isAddon = s.request_type === "addon";
        let label: { en: string; my: string } | null = null;
        if (isAddon && s.addon_id) {
          const a = addonMap.get(s.addon_id);
          if (a) label = { en: `${a.en} Package`, my: `${a.my} Package` };
        } else if (!isAddon && s.plan_id) {
          const tier = planMap.get(s.plan_id);
          if (tier) label = { en: `${tier} Package`, my: `${tier} Package` };
        }
        rows.push({
          id: s.id,
          source: "subscription_payment_request",
          payment_type: isAddon ? "addon" : "subscription",
          display_label: label,
          amount: Number(s.mmk_amount || 0),
          currency: "MMK",
          status: s.status,
          payment_method: s.payment_method,
          proof_url: s.proof_url,
          reference: s.sender_reference || null,
          admin_note: s.admin_note || null,
          created_at: s.created_at,
          raw: s,
        });
      });


      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows;
    },
  });
}
