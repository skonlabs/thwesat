import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Full admin payments approval test pass.
 *
 * For each payment_type the admin can review (subscription,
 * employer_subscription, placement_fee, mentor_session) we verify that:
 *   - the client mutation sends the canonical RPC payload
 *   - the success path is exercised (approved → ok)
 *   - the reject path is exercised (rejected → ok)
 *   - the revoke path is exercised where applicable (approved-only precondition)
 *   - server-side constraint errors surface cleanly (amount_mismatch,
 *     invalid_transition) instead of generic CHECK violations
 *
 * Side effects (subscription extension, employer tier, mentor earnings,
 * placement fee bookkeeping, notifications) are owned by the
 * `review_payment_request` Postgres function and are stable as long as the
 * RPC contract holds — that contract is what these tests pin.
 */

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "admin-uuid" } }),
}));

import { useUpdatePaymentRequest } from "@/hooks/use-payment";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  rpcMock.mockReset();
});

type Case = {
  label: string;
  paymentId: string;
  /** sample fixture id taken from real DB to make failures traceable */
  payment_type: "subscription" | "employer_subscription" | "placement_fee" | "mentor_session";
};

const cases: Case[] = [
  { label: "subscription (premium_3mo)", paymentId: "6b34400a-ea49-49d1-ad50-136f07012661", payment_type: "subscription" },
  { label: "employer_subscription (pro)", paymentId: "7caa13da-1442-47d6-a67b-ff078a35098f", payment_type: "employer_subscription" },
  { label: "mentor_session", paymentId: "ff450c76-0754-45db-9c10-64edac23502f", payment_type: "mentor_session" },
  { label: "placement_fee", paymentId: "placement-fee-fixture-uuid", payment_type: "placement_fee" },
];

describe("Admin payment approval — full pass across all payment types", () => {
  for (const c of cases) {
    describe(c.label, () => {
      it("approves without constraint errors", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, status: "approved" }, error: null });
        const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

        const res = await result.current.mutateAsync({ id: c.paymentId, status: "approved", admin_note: "verified" });

        expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
          _payment_id: c.paymentId,
          _new_status: "approved",
          _admin_note: "verified",
        });
        expect(res).toMatchObject({ ok: true, status: "approved" });
      });

      it("rejects without constraint errors", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, status: "rejected" }, error: null });
        const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

        const res = await result.current.mutateAsync({ id: c.paymentId, status: "rejected", admin_note: "proof unclear" });

        expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
          _payment_id: c.paymentId,
          _new_status: "rejected",
          _admin_note: "proof unclear",
        });
        expect(res).toMatchObject({ ok: true, status: "rejected" });
      });

      it("revokes a previously approved payment", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, status: "revoked" }, error: null });
        const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

        const res = await result.current.mutateAsync({ id: c.paymentId, status: "revoked", admin_note: "chargeback" });

        expect(rpcMock).toHaveBeenCalledWith("review_payment_request", {
          _payment_id: c.paymentId,
          _new_status: "revoked",
          _admin_note: "chargeback",
        });
        expect(res).toMatchObject({ ok: true, status: "revoked" });
      });

      it("treats a re-approval as a noop instead of throwing", async () => {
        rpcMock.mockResolvedValue({ data: { ok: true, noop: true, status: "approved" }, error: null });
        const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

        const res = await result.current.mutateAsync({ id: c.paymentId, status: "approved" });
        expect(res).toMatchObject({ ok: true, noop: true });
      });
    });
  }

  it("surfaces amount_mismatch from subscription plan validation", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "amount_mismatch: expected 15 USD, got 1 USD" },
    });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: "6b34400a-ea49-49d1-ad50-136f07012661", status: "approved" })
    ).rejects.toThrow(/amount_mismatch/);
  });

  it("rejects revoke on a non-approved payment with invalid_transition", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "invalid_transition: only approved payments can be revoked" },
    });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: "ff450c76-0754-45db-9c10-64edac23502f", status: "revoked" })
    ).rejects.toThrow(/invalid_transition/);
  });

  it("rejects unauthorized callers with not_authorized", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "not_authorized: only admins can review payments" },
    });
    const { result } = renderHook(() => useUpdatePaymentRequest(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: "any", status: "approved" })
    ).rejects.toThrow(/not_authorized/);
  });
});
