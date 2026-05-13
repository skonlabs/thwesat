import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

import { useFinalizeStatement, usePartnerPeriodPayments, usePartnerStatementPreview } from "@/hooks/use-partner-finance";
import type { Partner } from "@/hooks/use-partner-finance";

const partner: Partner = {
  id: "partner-1",
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

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe("partner finance RPC source of truth", () => {
  it("loads statement previews from the server-side calculation RPC", async () => {
    rpcMock.mockResolvedValue({ data: { partner, payments_count: 0, total_payout: 0 }, error: null });

    const { result } = renderHook(() => usePartnerStatementPreview(partner, 2026, 5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("admin_compute_partner_statement", {
      _partner_id: "partner-1",
      _year: 2026,
      _month: 5,
    });
    expect(fromMock).not.toHaveBeenCalledWith("payment_requests");
    expect(result.current.data?.total_payout).toBe(0);
  });

  it("finalizes through the server-side finalize RPC instead of trusting preview payloads", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null });

    const { result } = renderHook(() => useFinalizeStatement(), { wrapper });
    await result.current.mutateAsync({
      partner_id: "partner-1",
      year: 2026,
      month: 5,
      preview: { total_payout: 999_999_999 },
    });

    expect(rpcMock).toHaveBeenCalledWith("admin_finalize_partner_statement", {
      _partner_id: "partner-1",
      _year: 2026,
      _month: 5,
    });
    expect(fromMock).not.toHaveBeenCalledWith("partner_monthly_statements");
  });

  it("hides pre-attribution payments from the override editor", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_attributions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ user_id: "user-1", attributed_at: "2026-05-10T00:00:00.000Z" }],
            error: null,
          }),
        };
      }
      if (table === "payment_requests") {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: "old", user_id: "user-1", reviewed_at: "2026-05-01T00:00:00.000Z" },
              { id: "new", user_id: "user-1", reviewed_at: "2026-05-11T00:00:00.000Z" },
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
    expect(result.current.data?.map((p: any) => p.id)).toEqual(["new"]);
  });
});