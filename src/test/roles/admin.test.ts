import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: any[]) => fromMock(...a), rpc: (...a: any[]) => rpcMock(...a) },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ lang: "en" }) }));

import { useApprovePost, useApproveJob } from "@/hooks/use-employer-data";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
});

describe("Admin — useApprovePost", () => {
  it("flips is_approved=true and notifies the post author", async () => {
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const notifInsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((t: string) => {
      if (t === "community_posts") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { author_id: "user-1" }, error: null }) }) }),
          update: updateChain.update,
          eq: updateChain.eq,
        };
      }
      if (t === "notifications") return { insert: notifInsert };
      return {};
    });

    const { result } = renderHook(() => useApprovePost(), { wrapper });
    await result.current.mutateAsync("post-1");

    expect(updateChain.update).toHaveBeenCalledWith({ is_approved: true });
    expect(updateChain.eq).toHaveBeenCalledWith("id", "post-1");
    expect(notifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        notification_type: "community",
        link_path: "/community",
      })
    );
  });

  it("does NOT crash when post lookup returns no author", async () => {
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const notifInsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((t: string) => {
      if (t === "community_posts") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          update: updateChain.update,
          eq: updateChain.eq,
        };
      }
      if (t === "notifications") return { insert: notifInsert };
      return {};
    });

    const { result } = renderHook(() => useApprovePost(), { wrapper });
    await result.current.mutateAsync("post-1");
    expect(updateChain.update).toHaveBeenCalled();
    expect(notifInsert).not.toHaveBeenCalled();
  });
});

describe("Admin — useApproveJob", () => {
  it("delegates to the atomic approve_job RPC", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useApproveJob(), { wrapper });
    await result.current.mutateAsync("job-1");
    expect(rpcMock).toHaveBeenCalledWith("approve_job", { _job_id: "job-1" });
  });

  it("propagates RPC errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "not_pending" } });
    const { result } = renderHook(() => useApproveJob(), { wrapper });
    await expect(result.current.mutateAsync("job-1")).rejects.toBeTruthy();
  });
});
