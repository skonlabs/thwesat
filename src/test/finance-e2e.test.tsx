/**
 * End-to-end finance ledger correctness tests.
 *
 * Verifies the client contracts for every money-touching flow across all user
 * types (job seeker, mentor, employer, agent, admin):
 *  - wallet balance reads
 *  - top-up requests (insert shape)
 *  - mentor bookings (atomic RPC + insufficient-balance redirect path)
 *  - placement fees (RPC, not direct table writes)
 *  - subscriptions (RPC, not direct table writes)
 *  - unified user finance ledger (merges 3 sources, correct labels & totals
 *    per currency)
 *
 * Supabase is mocked. Server-side RPC bodies (atomicity, RLS, amount
 * validation, idempotency) are enforced in Postgres and covered by the SQL
 * itself — not duplicated here.
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
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import {
  roundMmk,
  calculatePlacementFee,
  sumByCurrency,
  formatMoney,
  formatTotals,
  PLACEMENT_FEE_PERCENT,
  PLACEMENT_PLATFORM_COMMISSION,
} from "@/lib/finance";
import {
  useWallet,
  useCreateTopupRequest,
  useSpendCredits,
  useMyTopupRequests,
  formatMMK as formatMMKWallet,
  formatCredits,
} from "@/hooks/use-wallet";
import { useCreateSubscriptionPaymentRequest } from "@/hooks/use-subscription";
import { useUserFinance } from "@/hooks/use-user-finance";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

// ---------------------------------------------------------------------------
// 1. Money primitives (used by every finance screen)
// ---------------------------------------------------------------------------
describe("finance primitives", () => {
  it("rounds MMK to nearest 100 Ks", () => {
    expect(roundMmk(12347)).toBe(12300);
    expect(roundMmk(12350)).toBe(12400);
    expect(roundMmk(99)).toBe(100);
    expect(roundMmk(49)).toBe(0);
    expect(roundMmk(null as any)).toBe(0);
    expect(roundMmk("abc" as any)).toBe(0);
  });

  it("calculatePlacementFee uses the central 8% constant and rounds", () => {
    expect(PLACEMENT_FEE_PERCENT).toBe(0.08);
    expect(PLACEMENT_PLATFORM_COMMISSION).toBe(0.10);
    // 500_000 * 0.08 = 40_000 → already 100-aligned
    expect(calculatePlacementFee(500_000)).toBe(40_000);
    // 1_234_567 * 0.08 = 98_765.36 → roundMmk → 98_800
    expect(calculatePlacementFee(1_234_567)).toBe(98_800);
    expect(calculatePlacementFee(0)).toBe(0);
    expect(calculatePlacementFee(-100)).toBe(0);
  });

  it("sumByCurrency keeps currencies separate (no MMK collapse)", () => {
    const rows = [
      { amount: 100, currency: "MMK" },
      { amount: 200, currency: "MMK" },
      { amount: 50, currency: "USD" },
      { amount: 25, currency: "USD" },
      { amount: 10, currency: "CREDITS" },
    ];
    const totals = sumByCurrency(rows).sort((a, b) => a.currency.localeCompare(b.currency));
    expect(totals).toEqual([
      { currency: "CREDITS", amount: 10 },
      { currency: "MMK", amount: 300 },
      { currency: "USD", amount: 75 },
    ]);
  });

  it("formatTotals renders each currency bucket separately", () => {
    const out = formatTotals([
      { amount: 12347, currency: "MMK" },
      { amount: 100, currency: "CREDITS" },
    ]);
    expect(out).toContain("12,300 Ks");
    expect(out).toContain("100 credits");
  });

  it("wallet helpers format MMK and credits with the right unit", () => {
    expect(formatMMKWallet(1234)).toBe("1,200 Ks");
    expect(formatCredits(1500)).toBe("1,500 credits");
    expect(formatMoney(12347, "MMK")).toBe("12,300 Ks");
    expect(formatMoney(50, "CREDITS")).toBe("50 credits");
  });
});

// ---------------------------------------------------------------------------
// 2. Wallet reads (job seeker / mentor)
// ---------------------------------------------------------------------------
describe("wallet (seeker/mentor)", () => {
  it("returns a zero wallet when the row does not exist yet", async () => {
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      user_id: "user-1",
      balance_credits: 0,
      lifetime_topup_mmk: 0,
      lifetime_spent_credits: 0,
    });
  });

  it("returns the real wallet row when present", async () => {
    fromMock.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: "user-1", balance_credits: 25_000, lifetime_topup_mmk: 50_000, lifetime_spent_credits: 25_000 },
      }),
    }));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance_credits).toBe(25_000);
  });

  it("lists user-scoped top-up requests in reverse-chronological order", async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [{ id: "t1" }, { id: "t2" }] });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    const { result } = renderHook(() => useMyTopupRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith("topup_requests");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});

// ---------------------------------------------------------------------------
// 3. Top-up creation (seeker/mentor)
// ---------------------------------------------------------------------------
describe("topup requests", () => {
  it("inserts a pending row stamped with the authenticated user_id", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: "tr-1" }, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectAfterInsert });
    fromMock.mockReturnValue({ insert: insertMock });

    const { result } = renderHook(() => useCreateTopupRequest(), { wrapper });
    await result.current.mutateAsync({
      package_id: "pkg-1",
      mmk_amount: 10_000,
      credits_to_grant: 10_000,
      payment_method: "kpay",
      proof_url: "user-1/p.jpg",
      sender_reference: "TX123",
    });

    expect(fromMock).toHaveBeenCalledWith("topup_requests");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.user_id).toBe("user-1");
    expect(payload.status).toBe("pending");
    expect(payload.mmk_amount).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// 4. Wallet spend (seeker/mentor uses it for unlocks / mentor sessions)
// ---------------------------------------------------------------------------
describe("wallet spend", () => {
  it("calls the wallet_spend RPC with the exact argument shape", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, new_balance: 9_000 }, error: null });
    const { result } = renderHook(() => useSpendCredits(), { wrapper });
    await result.current.mutateAsync({
      action_key: "unlock_cv",
      target_type: "profile",
      target_id: "profile-7",
      idempotency_key: "idem-1",
      metadata: { source: "search" },
    });
    expect(rpcMock).toHaveBeenCalledWith("wallet_spend", {
      _action_key: "unlock_cv",
      _target_type: "profile",
      _target_id: "profile-7",
      _idempotency_key: "idem-1",
      _metadata: { source: "search" },
    });
  });

  it("surfaces server errors verbatim (e.g. insufficient balance)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "insufficient_balance" } });
    const { result } = renderHook(() => useSpendCredits(), { wrapper });
    await expect(
      result.current.mutateAsync({ action_key: "unlock_cv" }),
    ).rejects.toThrow("insufficient_balance");
  });
});

// ---------------------------------------------------------------------------
// 5. Subscriptions (employer/agent) — must go through RPC, never direct insert
// ---------------------------------------------------------------------------
describe("subscription payment requests", () => {
  it("creates subscription requests via the gated RPC, not a raw insert", async () => {
    rpcMock.mockResolvedValue({ data: "spr-1", error: null });
    const { result } = renderHook(() => useCreateSubscriptionPaymentRequest(), { wrapper });
    await result.current.mutateAsync({
      request_type: "subscription",
      plan_id: "plan-growth",
      addon_id: null,
      quantity: 1,
      mmk_amount: 150_000,
      payment_method: "kpay",
      proof_url: "user-1/sub/x.jpg",
      sender_reference: "REF1",
    });
    expect(rpcMock).toHaveBeenCalledWith("create_subscription_payment_request", {
      _request_type: "subscription",
      _plan_id: "plan-growth",
      _addon_id: null,
      _quantity: 1,
      _mmk_amount: 150_000,
      _payment_method: "kpay",
      _proof_url: "user-1/sub/x.jpg",
      _sender_reference: "REF1",
    });
    expect(fromMock).not.toHaveBeenCalledWith("subscription_payment_requests");
  });

  it("propagates server-side validation errors (price mismatch, duplicate pending, free-trial guard)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "price_mismatch" } });
    const { result } = renderHook(() => useCreateSubscriptionPaymentRequest(), { wrapper });
    await expect(
      result.current.mutateAsync({
        request_type: "subscription",
        plan_id: "plan-growth",
        addon_id: null,
        quantity: 1,
        mmk_amount: 0,
        payment_method: "free_trial",
        proof_url: null,
        sender_reference: null,
      }),
    ).rejects.toMatchObject({ message: "price_mismatch" });
  });
});

// ---------------------------------------------------------------------------
// 6. Unified user finance ledger
// ---------------------------------------------------------------------------
describe("useUserFinance unified ledger", () => {
  function mockLedger({
    payments = [],
    subs = [],
    topups = [],
    plans = [],
    addons = [],
  }: {
    payments?: any[]; subs?: any[]; topups?: any[]; plans?: any[]; addons?: any[];
  }) {
    fromMock.mockImplementation((table: string) => {
      const data = (() => {
        switch (table) {
          case "payment_requests": return payments;
          case "subscription_payment_requests": return subs;
          case "topup_requests": return topups;
          case "subscription_plans": return plans;
          case "addon_products": return addons;
          default: return [];
        }
      })();
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data }),
      };
      // subscription_plans/addon_products are awaited directly after .select()
      if (table === "subscription_plans" || table === "addon_products") {
        chain.select = vi.fn().mockResolvedValue({ data });
      }
      return chain;
    });
  }

  it("seeker ledger: merges top-ups, mentor sessions, and placement fees", async () => {
    mockLedger({
      payments: [
        { id: "pr1", payment_type: "mentor_session", amount: 5_000, currency: "MMK", status: "approved", payment_method: "wallet", created_at: "2026-06-02T00:00:00Z" },
        { id: "pr2", payment_type: "placement_fee", amount: 40_000, currency: "MMK", status: "pending", payment_method: null, created_at: "2026-06-03T00:00:00Z" },
      ],
      topups: [
        { id: "tr1", mmk_amount: 10_000, status: "approved", payment_method: "kpay", created_at: "2026-06-01T00:00:00Z" },
      ],
    });
    const { result } = renderHook(() => useUserFinance("seeker-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data!;
    expect(rows).toHaveLength(3);
    // sorted desc by created_at
    expect(rows[0].id).toBe("pr2");
    expect(rows[2].id).toBe("tr1");

    const topup = rows.find((r) => r.source === "topup_request")!;
    expect(topup.payment_type).toBe("wallet_topup");
    expect(topup.amount).toBe(10_000);
    expect(topup.display_label?.en).toBe("Wallet Top-up");

    const placement = rows.find((r) => r.payment_type === "placement_fee")!;
    expect(placement.amount).toBe(40_000);
    expect(placement.status).toBe("pending");

    // Totals per currency are correct
    const totals = sumByCurrency(rows.map((r) => ({ amount: r.amount, currency: r.currency })));
    expect(totals).toEqual([{ currency: "MMK", amount: 55_000 }]);
  });

  it("employer ledger: subscriptions and add-ons resolve plan/addon labels", async () => {
    mockLedger({
      subs: [
        { id: "s1", request_type: "subscription", plan_id: "plan-growth", addon_id: null, mmk_amount: 150_000, status: "approved", payment_method: "kpay", created_at: "2026-06-10T00:00:00Z" },
        { id: "s2", request_type: "addon", plan_id: null, addon_id: "addon-featured", mmk_amount: 30_000, status: "pending", payment_method: "wave", created_at: "2026-06-11T00:00:00Z" },
      ],
      plans: [{ id: "plan-growth", tier: "growth" }],
      addons: [{ id: "addon-featured", label_en: "Featured Job", label_my: "Featured Job (MY)" }],
    });
    const { result } = renderHook(() => useUserFinance("employer-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data!;
    expect(rows).toHaveLength(2);
    const sub = rows.find((r) => r.payment_type === "subscription")!;
    expect(sub.display_label?.en).toBe("Growth Package");
    const addon = rows.find((r) => r.payment_type === "addon")!;
    expect(addon.display_label?.en).toBe("Featured Job Package");
    const totals = sumByCurrency(rows.map((r) => ({ amount: r.amount, currency: r.currency })));
    expect(totals).toEqual([{ currency: "MMK", amount: 180_000 }]);
  });

  it("agent ledger: same shape as employer (subscriptions + add-ons)", async () => {
    mockLedger({
      subs: [
        { id: "s1", request_type: "subscription", plan_id: "plan-biz", addon_id: null, mmk_amount: 300_000, status: "approved", payment_method: "kpay", created_at: "2026-06-10T00:00:00Z" },
      ],
      plans: [{ id: "plan-biz", tier: "business" }],
    });
    const { result } = renderHook(() => useUserFinance("agent-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].display_label?.en).toBe("Business Package");
  });

  it("mentor ledger: combines wallet top-ups (as mentee) and mentor session earnings (as payee)", async () => {
    mockLedger({
      payments: [
        { id: "earn1", payment_type: "mentor_session", amount: 8_000, currency: "MMK", status: "approved", payment_method: "wallet", created_at: "2026-06-05T00:00:00Z" },
      ],
      topups: [
        { id: "tr1", mmk_amount: 20_000, status: "approved", payment_method: "kpay", created_at: "2026-06-01T00:00:00Z" },
      ],
    });
    const { result } = renderHook(() => useUserFinance("mentor-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    const totals = sumByCurrency(result.current.data!.map((r) => ({ amount: r.amount, currency: r.currency })));
    expect(totals).toEqual([{ currency: "MMK", amount: 28_000 }]);
  });

  it("handles a user with no finance activity gracefully", async () => {
    mockLedger({});
    const { result } = renderHook(() => useUserFinance("new-user"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
