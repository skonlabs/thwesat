import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * These tests verify the post-RPC side-effects of useUpdatePaymentRequest:
 *   - approved/rejected reviews trigger an in-app email with the right link path
 *   - revoked reviews do NOT send approval/rejection emails
 *   - missing payment_requests row is tolerated (no email, no throw)
 */

const rpcMock = vi.fn();
const fromMock = vi.fn();
const sendAppEmailMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "admin-uuid" } }),
}));

vi.mock("@/lib/send-app-email", () => ({
  sendAppEmail: (...args: any[]) => sendAppEmailMock(...args),
}));

import { useUpdatePaymentRequest } from "@/hooks/use-payment";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

function mockPaymentLookup(row: Record<string, unknown> | null) {
  fromMock.mockImplementation((table: string) => {
    if (table === "payment_requests") {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
        }),
      };
    }
    return {};
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  sendAppEmailMock.mockReset();
});

describe("useUpdatePaymentRequest → email side effects", () => {
  it("sends approval email with mentor-session deep-link", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "approved" }, error: null });
    mockPaymentLookup({
      user_id: "user-1",
      amount: 25000,
      currency: "MMK",
      payment_type: "mentor_session",
    });

    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });
    await result.current.mutateAsync({ id: "p1", status: "approved" });

    expect(sendAppEmailMock).toHaveBeenCalledTimes(1);
    expect(sendAppEmailMock.mock.calls[0][0]).toMatchObject({
      templateName: "payment-approved",
      recipientUserId: "user-1",
      idempotencyKey: "payment-approved-p1",
      templateData: expect.objectContaining({
        currency: "MMK",
        paymentType: "mentor_session",
        linkPath: "/mentors/bookings",
      }),
    });
  });

  it("uses /employer/finance link path for placement_fee approvals", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "approved" }, error: null });
    mockPaymentLookup({
      user_id: "emp-1",
      amount: 100000,
      currency: "MMK",
      payment_type: "placement_fee",
    });

    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });
    await result.current.mutateAsync({ id: "p2", status: "approved" });

    expect(sendAppEmailMock.mock.calls[0][0].templateData.linkPath).toBe("/employer/finance");
  });

  it("sends rejection email with reason carried through", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "rejected" }, error: null });
    mockPaymentLookup({
      user_id: "user-2",
      amount: 50000,
      currency: "MMK",
      payment_type: "mentor_session",
    });

    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });
    await result.current.mutateAsync({ id: "p3", status: "rejected", admin_note: "blurry proof" });

    expect(sendAppEmailMock.mock.calls[0][0]).toMatchObject({
      templateName: "payment-rejected",
      idempotencyKey: "payment-rejected-p3",
      templateData: expect.objectContaining({ reason: "blurry proof" }),
    });
  });

  it("does NOT send email when status is revoked", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "revoked" }, error: null });
    mockPaymentLookup({
      user_id: "user-3",
      amount: 25000,
      currency: "MMK",
      payment_type: "mentor_session",
    });

    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });
    await result.current.mutateAsync({ id: "p4", status: "revoked", admin_note: "fraud" });

    expect(sendAppEmailMock).not.toHaveBeenCalled();
  });

  it("tolerates a missing payment_requests row without sending or throwing", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: "approved" }, error: null });
    mockPaymentLookup(null);

    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: "p5", status: "approved" })
    ).resolves.toMatchObject({ ok: true });

    expect(sendAppEmailMock).not.toHaveBeenCalled();
  });
});
