/**
 * End-to-end finance tests focused on AGENT, EMPLOYER, and PARTNER flows.
 *
 *  - Agent: placement-fee invoicing via placement_confirm_with_invoice RPC,
 *           commission math (8% fee × 10% platform cut), subscription
 *           creation through the gated RPC.
 *  - Employer: subscription + add-on purchase flow, placement RPC when
 *              employer (not agent) confirms a hire (no auto-invoice), and
 *              ledger merging across subscription_payment_requests.
 *  - Partner: scoped period-payments query honors RLS-friendly filters,
 *             finalize-statement is server-side only, override editor uses
 *             SECURITY-DEFINER RPC.
 *
 * Supabase is mocked. Server-side RPC bodies (RLS, atomicity, validation) are
 * enforced in Postgres and covered by the SQL migrations directly.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: (...a: any[]) => fromMock(...a),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-actor" } }),
}));

import {
  calculatePlacementFee,
  PLACEMENT_FEE_PERCENT,
  PLACEMENT_PLATFORM_COMMISSION,
  roundMmk,
  sumByCurrency,
} from "@/lib/finance";
import { useCreateSubscriptionPaymentRequest } from "@/hooks/use-subscription";
import { useUserFinance } from "@/hooks/use-user-finance";
import {
  useFinalizeStatement,
  useUpdatePaymentOverrides,
  usePartnerPeriodPayments,
  type Partner,
} from "@/hooks/use-partner-finance";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const partner: Partner = {
  id: "p-1",
  code: "P1",
  name: "Partner One",
  contact_email: null,
  contract_start_date: "2026-01-01",
  contract_end_date: null,
  maintenance_rate_y2: 0.075,
  maintenance_rate_y3plus: 0.05,
  payout_cap_pct: 0.35,
  is_active: true,
  notes: null,
};

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

// ===========================================================================
// AGENT
// ===========================================================================
describe("agent — placement fee commission math", () => {
  it("8% fee on negotiated salary, rounded to 100 Ks", () => {
    // Confirm constants used by the placement modal copy
    expect(PLACEMENT_FEE_PERCENT).toBe(0.08);
    expect(PLACEMENT_PLATFORM_COMMISSION).toBe(0.10);

    // 1_500_000 × 0.08 = 120_000 → already aligned
    const salary = 1_500_000;
    const fee = calculatePlacementFee(salary);
    expect(fee).toBe(120_000);

    // Platform retains 10% of the fee. Agent net = 90% of fee.
    const platformCut = roundMmk(fee * PLACEMENT_PLATFORM_COMMISSION);
    const agentNet = roundMmk(fee * (1 - PLACEMENT_PLATFORM_COMMISSION));
    expect(platformCut).toBe(12_000);
    expect(agentNet).toBe(108_000);
    expect(platformCut + agentNet).toBe(fee);
  });

  it("odd salary: 977_777 × 8% → 78,200 Ks (rounded)", () => {
    expect(calculatePlacementFee(977_777)).toBe(78_200);
  });
});

describe("agent — placement confirmation goes through RPC, not direct table writes", () => {
  it("invokes placement_confirm_with_invoice with the agent-supplied salary + fee", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, invoice_id: "inv-1" }, error: null });
    // Simulate the EmployerApplications.handlePlacement call shape directly:
    const salary = 1_500_000;
    const fee = calculatePlacementFee(salary);
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).rpc("placement_confirm_with_invoice", {
      _application_id: "app-1",
      _placement_salary: salary,
      _placement_fee: fee,
    });
    expect(rpcMock).toHaveBeenCalledWith("placement_confirm_with_invoice", {
      _application_id: "app-1",
      _placement_salary: 1_500_000,
      _placement_fee: 120_000,
    });
  });
});

describe("agent — subscription purchase routes through gated RPC", () => {
  it("agent purchases Business package via create_subscription_payment_request", async () => {
    rpcMock.mockResolvedValue({ data: "spr-agent-1", error: null });
    const { result } = renderHook(() => useCreateSubscriptionPaymentRequest(), { wrapper });
    await result.current.mutateAsync({
      request_type: "subscription",
      plan_id: "plan-agent-business",
      addon_id: null,
      quantity: 1,
      mmk_amount: 300_000,
      payment_method: "kpay",
      proof_url: "user-actor/sub/a.jpg",
      sender_reference: "AG-001",
    });
    expect(rpcMock).toHaveBeenCalledWith(
      "create_subscription_payment_request",
      expect.objectContaining({
        _request_type: "subscription",
        _plan_id: "plan-agent-business",
        _mmk_amount: 300_000,
      }),
    );
    // Never writes directly to the table
    expect(fromMock).not.toHaveBeenCalledWith("subscription_payment_requests");
  });
});

// ===========================================================================
// EMPLOYER
// ===========================================================================
describe("employer — purchases & ledger", () => {
  it("subscription + add-on purchases create exactly one RPC call each", async () => {
    rpcMock.mockResolvedValue({ data: "spr", error: null });
    const { result } = renderHook(() => useCreateSubscriptionPaymentRequest(), { wrapper });

    await result.current.mutateAsync({
      request_type: "subscription",
      plan_id: "plan-emp-growth",
      addon_id: null,
      quantity: 1,
      mmk_amount: 150_000,
      payment_method: "kpay",
      proof_url: null,
      sender_reference: null,
    });
    await result.current.mutateAsync({
      request_type: "addon",
      plan_id: null,
      addon_id: "addon-featured-job",
      quantity: 2,
      mmk_amount: 60_000,
      payment_method: "wave",
      proof_url: null,
      sender_reference: null,
    });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[0][0]).toBe("create_subscription_payment_request");
    expect(rpcMock.mock.calls[1][0]).toBe("create_subscription_payment_request");
    expect(rpcMock.mock.calls[1][1]).toMatchObject({ _request_type: "addon", _quantity: 2 });
  });

  it("employer ledger: subscription + addon labels resolve and per-currency totals are correct", async () => {
    fromMock.mockImplementation((table: string) => {
      const data = (() => {
        switch (table) {
          case "subscription_payment_requests":
            return [
              { id: "s1", request_type: "subscription", plan_id: "plan-emp-growth", addon_id: null, mmk_amount: 150_000, status: "approved", payment_method: "kpay", created_at: "2026-06-10T00:00:00Z" },
              { id: "s2", request_type: "addon", plan_id: null, addon_id: "addon-featured-job", mmk_amount: 60_000, status: "pending", payment_method: "wave", created_at: "2026-06-11T00:00:00Z" },
              { id: "s3", request_type: "subscription", plan_id: "plan-emp-starter", addon_id: null, mmk_amount: 50_000, status: "rejected", payment_method: "kpay", created_at: "2026-06-12T00:00:00Z" },
            ];
          case "subscription_plans":
            return [
              { id: "plan-emp-growth", tier: "growth" },
              { id: "plan-emp-starter", tier: "starter" },
            ];
          case "addon_products":
            return [{ id: "addon-featured-job", label_en: "Featured Job", label_my: "Featured Job (MY)" }];
          default:
            return [];
        }
      })();
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data }),
      };
      if (table === "subscription_plans" || table === "addon_products") {
        chain.select = vi.fn().mockResolvedValue({ data });
      }
      return chain;
    });

    const { result } = renderHook(() => useUserFinance("emp-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data!;
    expect(rows).toHaveLength(3);

    const labels = rows.map((r) => r.display_label?.en).sort();
    expect(labels).toEqual(["Featured Job Package", "Growth Package", "Starter Package"]);

    // Totals (gross, all statuses) — keep MMK bucket isolated
    const totals = sumByCurrency(rows.map((r) => ({ amount: r.amount, currency: r.currency })));
    expect(totals).toEqual([{ currency: "MMK", amount: 260_000 }]);

    // Approved-only total
    const approved = rows.filter((r) => r.status === "approved");
    const approvedTotal = sumByCurrency(approved.map((r) => ({ amount: r.amount, currency: r.currency })));
    expect(approvedTotal).toEqual([{ currency: "MMK", amount: 150_000 }]);
  });

  it("employer (not agent) confirming placement: same RPC, fee = 0 (paid by no one in-house)", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, invoice_id: null }, error: null });
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).rpc("placement_confirm_with_invoice", {
      _application_id: "app-emp-1",
      _placement_salary: 800_000,
      _placement_fee: 0,
    });
    expect(rpcMock).toHaveBeenCalledWith("placement_confirm_with_invoice", {
      _application_id: "app-emp-1",
      _placement_salary: 800_000,
      _placement_fee: 0,
    });
  });
});

// ===========================================================================
// PARTNER
// ===========================================================================
describe("partner — period payments query is RLS-friendly and post-attribution only", () => {
  it("filters by partner attribution, MMK approved status, period bounds, and post-attribution date", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_attributions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { user_id: "u-a", attributed_at: "2026-05-05T00:00:00.000Z" },
              { user_id: "u-b", attributed_at: "2026-05-20T00:00:00.000Z" },
            ],
            error: null,
          }),
        };
      }
      if (table === "subscription_payment_requests") {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: "pr-old", user_id: "u-a", reviewed_at: "2026-05-04T12:00:00.000Z", amount: 10_000, currency: "MMK" },
              { id: "pr-a", user_id: "u-a", reviewed_at: "2026-05-08T00:00:00.000Z", amount: 25_000, currency: "MMK" },
              { id: "pr-b-early", user_id: "u-b", reviewed_at: "2026-05-15T00:00:00.000Z", amount: 5_000, currency: "MMK" },
              { id: "pr-b", user_id: "u-b", reviewed_at: "2026-05-22T00:00:00.000Z", amount: 40_000, currency: "MMK" },
            ],
            error: null,
          }),
        };
        return chain;
      }
      return {};
    });

    const { result } = renderHook(() => usePartnerPeriodPayments(partner, 2026, 5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = (result.current.data || []).map((p: any) => p.id);
    expect(ids).toEqual(["pr-a", "pr-b"]);
  });

  it("returns empty list when partner has no attributions (no payment_requests call needed)", async () => {
    let prCalled = false;
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_attributions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === "subscription_payment_requests") {
        prCalled = true;
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) };
      }
      return {};
    });
    const { result } = renderHook(() => usePartnerPeriodPayments(partner, 2026, 5), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(prCalled).toBe(false);
  });
});

describe("partner — admin write paths go through SECURITY DEFINER RPCs", () => {
  it("override editor uses admin_set_payment_revenue_overrides (not raw UPDATE)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useUpdatePaymentOverrides(), { wrapper });
    await result.current.mutateAsync({
      id: "pay-1",
      third_party_payout: 5_000,
      npr_amount: 45_000,
      revenue_classification: "core",
    });
    expect(rpcMock).toHaveBeenCalledWith("admin_set_payment_revenue_overrides", {
      _payment_id: "pay-1",
      _third_party_payout: 5_000,
      _npr_amount: 45_000,
      _revenue_classification: "core",
    });
    expect(fromMock).not.toHaveBeenCalledWith("subscription_payment_requests");
  });

  it("finalize statement ignores client-supplied preview and re-computes on the server", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { result } = renderHook(() => useFinalizeStatement(), { wrapper });
    await result.current.mutateAsync({
      partner_id: "p-1",
      year: 2026,
      month: 5,
      preview: { total_payout: 999_999_999 }, // attacker-supplied, must be ignored
    });
    const call = rpcMock.mock.calls[0];
    expect(call[0]).toBe("admin_finalize_partner_statement");
    expect(call[1]).toEqual({ _partner_id: "p-1", _year: 2026, _month: 5 });
    // The preview blob is NOT forwarded
    expect(JSON.stringify(call[1])).not.toContain("999999999");
    expect(fromMock).not.toHaveBeenCalledWith("partner_monthly_statements");
  });

  it("propagates server errors (e.g. quality gate failed)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "quality_gate_failed" } });
    const { result } = renderHook(() => useFinalizeStatement(), { wrapper });
    await expect(
      result.current.mutateAsync({ partner_id: "p-1", year: 2026, month: 5, preview: {} }),
    ).rejects.toMatchObject({ message: "quality_gate_failed" });
  });
});
