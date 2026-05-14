import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (...a: any[]) => fromMock(...a) } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-notifications-data";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => fromMock.mockReset());

describe("Notifications — mark-read mutations", () => {
  it("useMarkNotificationRead flips ONLY the targeted notification id", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqMock }) });

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    await result.current.mutateAsync("notif-1");
    expect(eqMock).toHaveBeenCalledWith("id", "notif-1");
  });

  it("useMarkAllNotificationsRead scopes to current user AND is_read=false", async () => {
    const eqs: Array<[string, any]> = [];
    const second = { eq: (col: string, val: any) => { eqs.push([col, val]); return Promise.resolve({ error: null }); } };
    const first = { eq: (col: string, val: any) => { eqs.push([col, val]); return second; } };
    fromMock.mockReturnValue({ update: vi.fn().mockReturnValue(first) });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper });
    await result.current.mutateAsync();
    expect(eqs).toEqual([["user_id", "user-1"], ["is_read", false]]);
  });
});
