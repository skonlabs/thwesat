import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * These tests exercise the client-side surface of the payment review flow:
 * the `useUpdatePaymentRequest` mutation must call the `review_payment_request`
 * RPC with the right shape and propagate errors.
 *
 * The RPC itself (atomicity, idempotency, amount validation, state-machine
 * rules) is enforced server-side by Postgres and is covered by SQL CHECK
 * constraints + the function body — not re-implemented here.
 */

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "admin-uuid" } }),
}));

import { useUpdatePaymentRequest, useCreatePaymentRequest } from "@/hooks/use-payment";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe("useUpdatePaymentRequest → review_payment_request RPC", () => {
  it("calls RPC with approve payload", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "approved" }, error: null });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await result.current.mutateAsync({ id: "pay-1", status: "approved", admin_note: "ok" });

    expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
      _payment_id: "pay-1",
      _new_status: "approved",
      _admin_note: "ok",
    });
  });

  it("calls RPC with reject payload and null note when omitted", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "rejected" }, error: null });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await result.current.mutateAsync({ id: "pay-2", status: "rejected" });

    expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
      _payment_id: "pay-2",
      _new_status: "rejected",
      _admin_note: null,
    });
  });

  it("supports revoke status (refund path)", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "revoked" }, error: null });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await result.current.mutateAsync({ id: "pay-3", status: "revoked", admin_note: "fraud" });

    expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
      _payment_id: "pay-3",
      _new_status: "revoked",
      _admin_note: "fraud",
    });
  });

  it("propagates RPC error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "amount_mismatch: expected 15, got 1" } });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: "pay-4", status: "approved" })
    ).rejects.toThrow(/amount_mismatch/);
  });

  it("returns idempotent noop result without throwing", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, noop: true, status: "approved" }, error: null });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    const res = await result.current.mutateAsync({ id: "pay-5", status: "approved" });
    expect(res).toMatchObject({ ok: true, noop: true });
  });
});

describe("useCreatePaymentRequest → validation", () => {
  it("rejects non-positive amount before hitting DB", async () => {
    const { result } = renderHook(() => useCreatePaymentRequest(), { wrapper });
    await expect(
      result.current.mutateAsync({
        payment_method: "kbzpay",
        payment_type: "subscription",
        amount: 0,
        currency: "USD",
      })
    ).rejects.toThrow(/Amount must be greater than zero/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("flips booking to pending on mentor_session insert", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    fromMock.mockImplementation((table: string) => {
      if (table === "payment_requests") return { insert: insertMock };
      if (table === "mentor_bookings") return updateChain;
      return {};
    });

    const { result } = renderHook(() => useCreatePaymentRequest(), { wrapper });
    await result.current.mutateAsync({
      payment_method: "kbzpay",
      payment_type: "mentor_session",
      amount: 25,
      currency: "USD",
      booking_id: "bk-1",
    });

    await waitFor(() => {
      expect(updateChain.update).toHaveBeenCalledWith({ payment_status: "pending" });
      expect(updateChain.eq).toHaveBeenCalledWith("id", "bk-1");
    });
  });
});
