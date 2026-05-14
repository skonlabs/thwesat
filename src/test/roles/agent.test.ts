import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: any[]) => fromMock(...a),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "https://x" } }) }) },
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "agent-1" } }) }));

import { useAgentClients, useUpsertAgentClient, useDeleteAgentClient } from "@/hooks/use-agent-clients";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  fromMock.mockReset();
});

describe("Agent — useAgentClients (RLS scope)", () => {
  it("scopes the SELECT to the current agent's id", async () => {
    const eqMock = vi.fn().mockReturnValue({ order: () => Promise.resolve({ data: [], error: null }) });
    fromMock.mockReturnValue({ select: () => ({ eq: eqMock }) });

    const { result } = renderHook(() => useAgentClients(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eqMock).toHaveBeenCalledWith("agent_id", "agent-1");
  });
});

describe("Agent — useUpsertAgentClient", () => {
  it("INSERT path injects agent_id and defaults optional fields to empty strings", async () => {
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "client-1" }, error: null }),
    };
    fromMock.mockReturnValue(insertChain);

    const { result } = renderHook(() => useUpsertAgentClient(), { wrapper });
    await result.current.mutateAsync({ name: "Acme Co" });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-1",
        name: "Acme Co",
        logo_url: "",
        website: "",
        industry: "",
        notes: "",
        is_active: true,
      })
    );
  });

  it("UPDATE path uses .eq(id) when an id is provided", async () => {
    const eqMock = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: "client-1" }, error: null }) }),
    });
    fromMock.mockReturnValue({ update: () => ({ eq: eqMock }) });

    const { result } = renderHook(() => useUpsertAgentClient(), { wrapper });
    await result.current.mutateAsync({ id: "client-1", name: "Acme Co Updated" });
    expect(eqMock).toHaveBeenCalledWith("id", "client-1");
  });

  it("rejects when not signed in", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
    const { useUpsertAgentClient: H } = await import("@/hooks/use-agent-clients");
    const { result } = renderHook(() => H(), { wrapper });
    await expect(result.current.mutateAsync({ name: "X" })).rejects.toThrow(/Not signed in/);
    vi.doUnmock("@/hooks/use-auth");
  });
});

describe("Agent — useDeleteAgentClient", () => {
  it("calls delete().eq(id, ...)", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ delete: () => ({ eq: eqMock }) });

    const { result } = renderHook(() => useDeleteAgentClient(), { wrapper });
    await result.current.mutateAsync("client-1");
    expect(eqMock).toHaveBeenCalledWith("id", "client-1");
  });
});

describe("Agent — useRoleLabels (vocabulary swap)", () => {
  async function loadLabels(role: string, lang: "en" | "my") {
    vi.resetModules();
    vi.doMock("@/hooks/use-auth", () => ({ useAuth: () => ({ effectiveRole: role }) }));
    vi.doMock("@/hooks/use-language", () => ({ useLanguage: () => ({ lang }) }));
    const { useRoleLabels } = await import("@/hooks/use-role-labels");
    return renderHook(() => useRoleLabels()).result.current;
  }

  it("returns Agent vocabulary in English when effectiveRole='agent'", async () => {
    const labels = await loadLabels("agent", "en");
    expect(labels.isAgent).toBe(true);
    expect(labels.company).toBe("Client");
    expect(labels.applicants).toBe("Candidates");
    expect(labels.posting).toBe("Listing");
    expect(labels.dashboard).toBe("Agent Dashboard");
  });

  it("returns Employer vocabulary when effectiveRole='employer'", async () => {
    const labels = await loadLabels("employer", "en");
    expect(labels.isAgent).toBe(false);
    expect(labels.company).toBe("Company");
    expect(labels.applicants).toBe("Applicants");
    expect(labels.posting).toBe("Job");
  });

  it("returns Burmese Agent vocabulary when lang='my'", async () => {
    const labels = await loadLabels("agent", "my");
    expect(labels.company).toBe("ဖောက်သည်");
    expect(labels.applicants).toBe("ကိုယ်စားလှယ်လောင်းများ");
  });
});
