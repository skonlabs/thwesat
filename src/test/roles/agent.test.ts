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

/**
 * Agent clients are now stored as a JSONB array on agent_profiles.clients.
 * Tests assert the hook reads/writes via agent_profiles.{select,update}
 * scoped by user_id.
 */
function mockClientsTable(clients: any[]) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: updateEq });
  const selectEq = vi.fn().mockReturnValue({ maybeSingle: () => Promise.resolve({ data: { clients }, error: null }) });
  const selectMock = vi.fn().mockReturnValue({ eq: selectEq });
  fromMock.mockImplementation((table: string) => {
    if (table === "agent_profiles") return { select: selectMock, update: updateMock };
    return {};
  });
  return { updateMock, updateEq, selectEq };
}

describe("Agent — useAgentClients (RLS scope)", () => {
  it("scopes the SELECT to the current agent's user_id", async () => {
    const { selectEq } = mockClientsTable([]);

    const { result } = renderHook(() => useAgentClients(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(selectEq).toHaveBeenCalledWith("user_id", "agent-1");
  });
});

describe("Agent — useUpsertAgentClient", () => {
  it("INSERT path injects agent_id and defaults optional fields to empty strings", async () => {
    const { updateMock } = mockClientsTable([]);

    const { result } = renderHook(() => useUpsertAgentClient(), { wrapper });
    await result.current.mutateAsync({ name: "Acme Co" });

    const written = updateMock.mock.calls[0][0].clients as any[];
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      agent_id: "agent-1",
      name: "Acme Co",
      website: "",
      industry: "",
      notes: "",
      is_active: true,
    });
  });

  it("UPDATE path mutates the existing client by id", async () => {
    const existing = [{ id: "client-1", agent_id: "agent-1", name: "Old", logo_url: "", website: "", industry: "", notes: "", is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01" }];
    const { updateMock } = mockClientsTable(existing);

    const { result } = renderHook(() => useUpsertAgentClient(), { wrapper });
    await result.current.mutateAsync({ id: "client-1", name: "Acme Co Updated" });

    const written = updateMock.mock.calls[0][0].clients as any[];
    expect(written.find((c) => c.id === "client-1").name).toBe("Acme Co Updated");
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
  it("removes the client by id from the JSONB array", async () => {
    const existing = [
      { id: "client-1", agent_id: "agent-1", name: "Keep", logo_url: "", website: "", industry: "", notes: "", is_active: true, created_at: "", updated_at: "" },
      { id: "client-2", agent_id: "agent-1", name: "Drop", logo_url: "", website: "", industry: "", notes: "", is_active: true, created_at: "", updated_at: "" },
    ];
    const { updateMock } = mockClientsTable(existing);

    const { result } = renderHook(() => useDeleteAgentClient(), { wrapper });
    await result.current.mutateAsync("client-2");
    const written = updateMock.mock.calls[0][0].clients as any[];
    expect(written.map((c) => c.id)).toEqual(["client-1"]);
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
