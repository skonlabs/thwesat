import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: any[]) => fromMock(...a), rpc: (...a: any[]) => rpcMock(...a) },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

import { useSpendCredits, useCreateTopupRequest, formatMMK, formatCredits } from "@/hooks/use-wallet";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
});

describe("Wallet — useSpendCredits", () => {
  it("forwards args to wallet_spend RPC with correct underscored keys", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, new_balance: 50 }, error: null });
    const { result } = renderHook(() => useSpendCredits(), { wrapper });
    await result.current.mutateAsync({
      action_key: "feature_job",
      target_type: "job",
      target_id: "job-1",
      idempotency_key: "idem-1",
      metadata: { reason: "boost" },
    });
    expect(rpcMock).toHaveBeenCalledWith("wallet_spend", {
      _action_key: "feature_job",
      _target_type: "job",
      _target_id: "job-1",
      _idempotency_key: "idem-1",
      _metadata: { reason: "boost" },
    });
  });

  it("defaults missing optional args to null / empty object", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { result } = renderHook(() => useSpendCredits(), { wrapper });
    await result.current.mutateAsync({ action_key: "feature_x" });
    expect(rpcMock).toHaveBeenCalledWith("wallet_spend", {
      _action_key: "feature_x",
      _target_type: null,
      _target_id: null,
      _idempotency_key: null,
      _metadata: {},
    });
  });

  it("propagates RPC errors with the server message intact", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "insufficient_credits" } });
    const { result } = renderHook(() => useSpendCredits(), { wrapper });
    await expect(result.current.mutateAsync({ action_key: "feature_x" })).rejects.toThrow(/insufficient_credits/);
  });
});

describe("Wallet — useCreateTopupRequest", () => {
  it("auto-stamps user_id and forces status=pending", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: "tx-1" }, error: null }) }),
    });
    fromMock.mockReturnValue({ insert: insertMock });

    const { result } = renderHook(() => useCreateTopupRequest(), { wrapper });
    await result.current.mutateAsync({
      package_id: "pkg-1",
      mmk_amount: 50000,
      credits_to_grant: 500,
      payment_method: "kbzpay",
      proof_url: "x",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        status: "pending",
        package_id: "pkg-1",
        mmk_amount: 50000,
        credits_to_grant: 500,
        payment_method: "kbzpay",
      })
    );
  });
});

describe("Wallet — formatters", () => {
  it("formats MMK with locale separators", () => {
    expect(formatMMK(50000, "en")).toBe("50,000 Ks");
    expect(formatMMK(50000, "my")).toBe("50,000 Ks");
  });

  it("formats credits", () => {
    expect(formatCredits(120)).toBe("120 Ks");
  });
});
