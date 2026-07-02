import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
const sendAppEmailMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: any[]) => fromMock(...a) },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "seeker-1" } }) }));
vi.mock("@/lib/send-app-email", () => ({ sendAppEmail: (...a: any[]) => sendAppEmailMock(...a) }));

import { useApplyToJob, useToggleSaveJob } from "@/hooks/use-jobs";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  fromMock.mockReset();
  sendAppEmailMock.mockReset();
});

describe("Job Seeker — useApplyToJob", () => {
  function buildApplyMocks(opts: {
    existing: { id: string; status: string } | null;
    job?: { employer_id: string; title: string; title_my: string; company: string } | null;
    bonusTx?: { id: string } | null;
  }) {
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const insertChain = vi.fn().mockResolvedValue({ error: null });
    const docInsertSingle = vi.fn().mockResolvedValue({ data: { id: "cover-doc-1" }, error: null });
    const docInsertSelect = vi.fn().mockReturnValue({ single: docInsertSingle });
    const docInsert = vi.fn().mockReturnValue({ select: docInsertSelect });
    fromMock.mockImplementation((table: string) => {
      if (table === "user_documents") return { insert: docInsert };
      if (table === "applications") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.existing, error: null }) }) }),
          }),
          update: updateChain.update,
          eq: updateChain.eq,
          insert: insertChain,
        };
      }
      if (table === "jobs") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.job ?? null, error: null }) }) }),
        };
      }
      if (table === "profiles" || table === "v_profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { display_name: "Aung" }, error: null }) }) }),
        };
      }
      if (table === "notifications") return { insert: vi.fn().mockResolvedValue({ error: null }) };
      if (table === "wallet_transactions") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.bonusTx ?? null, error: null }) }) }),
          }),
        };
      }
      return {};
    });
    return { updateChain, insertChain, docInsert };
  }

  it("REACTIVATES an existing withdrawn/rejected application instead of inserting", async () => {
    const { updateChain, insertChain } = buildApplyMocks({
      existing: { id: "app-old", status: "withdrawn" },
      job: { employer_id: "emp-1", title: "X", title_my: "X", company: "C" },
    });

    const { result } = renderHook(() => useApplyToJob(), { wrapper });
    await result.current.mutateAsync({ jobId: "job-1", coverLetter: "hi" });

    expect(insertChain).not.toHaveBeenCalled();
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "applied", cover_letter_id: "cover-doc-1", withdrawn_at: null })
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "app-old");
  });

  it("INSERTS a fresh application when none exists", async () => {
    const { updateChain, insertChain } = buildApplyMocks({
      existing: null,
      job: { employer_id: "emp-1", title: "X", title_my: "X", company: "C" },
    });

    const { result } = renderHook(() => useApplyToJob(), { wrapper });
    await result.current.mutateAsync({ jobId: "job-1", cvDocumentId: "cv-1" });

    expect(insertChain).toHaveBeenCalledWith([
      expect.objectContaining({
        applicant_id: "seeker-1",
        job_id: "job-1",
        status: "applied",
        resume_id: "cv-1",
      }),
    ]);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("emails the EMPLOYER about the new application with idempotency key", async () => {
    buildApplyMocks({
      existing: null,
      job: { employer_id: "emp-1", title: "Senior Dev", title_my: "Senior Dev", company: "Acme" },
    });
    const { result } = renderHook(() => useApplyToJob(), { wrapper });
    await result.current.mutateAsync({ jobId: "job-1" });

    expect(sendAppEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: "application-received",
        recipientUserId: "emp-1",
        idempotencyKey: "app-received-seeker-1-job-1",
      })
    );
  });

  it("sends welcome-bonus email ONLY when the signup_bonus tx exists", async () => {
    buildApplyMocks({
      existing: null,
      job: { employer_id: "emp-1", title: "X", title_my: "X", company: "C" },
      bonusTx: { id: "tx-1" },
    });
    const { result } = renderHook(() => useApplyToJob(), { wrapper });
    await result.current.mutateAsync({ jobId: "job-1" });

    const calls = sendAppEmailMock.mock.calls.map((c) => c[0].templateName);
    expect(calls).toContain("welcome-bonus");
  });

  it("does NOT send welcome-bonus when no signup_bonus tx", async () => {
    buildApplyMocks({
      existing: null,
      job: { employer_id: "emp-1", title: "X", title_my: "X", company: "C" },
      bonusTx: null,
    });
    const { result } = renderHook(() => useApplyToJob(), { wrapper });
    await result.current.mutateAsync({ jobId: "job-1" });

    const calls = sendAppEmailMock.mock.calls.map((c) => c[0].templateName);
    expect(calls).not.toContain("welcome-bonus");
  });

  it("rejects when not authenticated", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
    const { useApplyToJob: anonHook } = await import("@/hooks/use-jobs");
    const { result } = renderHook(() => anonHook(), { wrapper });
    await expect(result.current.mutateAsync({ jobId: "job-1" })).rejects.toThrow(/Not authenticated/);
    vi.doUnmock("@/hooks/use-auth");
  });
});

describe("Job Seeker — useToggleSaveJob (optimistic)", () => {
  it("optimistically appends a job id and rolls back on error", async () => {
    fromMock.mockImplementation(() => ({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      insert: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["saved-job-ids", "seeker-1"], ["existing"]);
    const w = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useToggleSaveJob(), { wrapper: w });
    await expect(
      result.current.mutateAsync({ jobId: "new-job", isSaved: false })
    ).rejects.toBeTruthy();

    await waitFor(() =>
      expect(qc.getQueryData(["saved-job-ids", "seeker-1"])).toEqual(["existing"])
    );
  });
});
