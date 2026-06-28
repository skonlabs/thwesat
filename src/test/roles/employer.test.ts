import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
const rpcMock = vi.fn();
const sendAppEmailMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: any[]) => fromMock(...a),
    rpc: (...a: any[]) => rpcMock(...a),
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "emp-1" } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ lang: "en" }) }));
vi.mock("@/lib/send-app-email", () => ({ sendAppEmail: (...a: any[]) => sendAppEmailMock(...a) }));

import { useCreateJob, useUpdateApplicationStatus } from "@/hooks/use-employer-data";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

beforeEach(() => {
  fromMock.mockReset();
  sendAppEmailMock.mockReset();
});

describe("Employer — useCreateJob", () => {
  it("auto-injects employer_id from auth context", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((t: string) => {
      if (t === "jobs") return { insert: insertMock };
      return {};
    });

    const { result } = renderHook(() => useCreateJob(), { wrapper });
    await result.current.mutateAsync({ title: "Senior Dev", company: "Acme", expires_at: "2027-01-01T00:00:00Z" });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        employer_id: "emp-1",
        title: "Senior Dev",
        company: "Acme",
        expires_at: "2027-01-01T00:00:00Z",
      })
    );
  });

  it("propagates DB errors", async () => {
    fromMock.mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({ error: { message: "rls" } }) }));
    const { result } = renderHook(() => useCreateJob(), { wrapper });
    await expect(result.current.mutateAsync({ title: "x", company: "y" })).rejects.toBeTruthy();
  });
});

describe("Employer — useUpdateApplicationStatus", () => {
  function buildMocks(opts: {
    appJobId?: string;
    jobOwnerId?: string;
    appAfter?: { applicant_id: string; job_id: string };
    job?: { title: string; title_my: string; company: string };
  }) {
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const notifInsert = vi.fn().mockResolvedValue({ error: null });
    const empSelect = vi.fn().mockResolvedValue({ data: { id: "emp-1" }, error: null });

    let appCallCount = 0;
    fromMock.mockImplementation((t: string) => {
      if (t === "applications") {
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                appCallCount += 1;
                if (appCallCount === 1) {
                  return Promise.resolve({ data: { job_id: opts.appJobId }, error: null });
                }
                return Promise.resolve({ data: opts.appAfter, error: null });
              },
            }),
          }),
          update: updateChain.update,
          eq: updateChain.eq,
        };
      }
      if (t === "employer_profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: empSelect }) }) };
      }
      if (t === "jobs") {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: { employer_id: opts.jobOwnerId, ...opts.job }, error: null }) }),
          }),
        };
      }
      if (t === "notifications") return { insert: notifInsert };
      return {};
    });
    return { updateChain, notifInsert };
  }

  it("blocks an employer from updating an application they don't own", async () => {
    buildMocks({ appJobId: "job-1", jobOwnerId: "OTHER_EMP" });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: "app-1", status: "shortlisted" })
    ).rejects.toThrow(/Unauthorized/);
  });

  it("stamps interview_date with NOW when none provided for status='interview'", async () => {
    const { updateChain } = buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "C" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({ id: "app-1", status: "interview" });

    const call = updateChain.update.mock.calls[0][0];
    expect(call.status).toBe("interview");
    expect(typeof call.interview_date).toBe("string");
    expect(new Date(call.interview_date).getTime()).toBeGreaterThan(0);
  });

  it("preserves caller-supplied interview_date when provided", async () => {
    const { updateChain } = buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "C" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({
      id: "app-1",
      status: "interviewed",
      interviewDate: "2026-06-01T10:00:00.000Z",
    });
    expect(updateChain.update.mock.calls[0][0].interview_date).toBe("2026-06-01T10:00:00.000Z");
  });

  it("mirrors Burmese-script rejection reason into rejection_reason_my automatically", async () => {
    const { updateChain } = buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "C" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({
      id: "app-1",
      status: "rejected",
      rejectionReason: "မသင့်တော်ပါ",
    });
    const u = updateChain.update.mock.calls[0][0];
    expect(u.rejection_reason).toBe("မသင့်တော်ပါ");
    expect(u.rejection_reason_my).toBe("မသင့်တော်ပါ");
  });

  it("does NOT auto-mirror an English rejection reason", async () => {
    const { updateChain } = buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "C" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({
      id: "app-1",
      status: "rejected",
      rejectionReason: "Not a fit for this role",
    });
    expect(updateChain.update.mock.calls[0][0].rejection_reason_my).toBeUndefined();
  });

  it("inserts an applicant notification on shortlisted", async () => {
    const { notifInsert } = buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "Sales Lead", title_my: "ရောင်းအား", company: "Acme" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({ id: "app-1", status: "shortlisted" });

    expect(notifInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "seeker-1",
        notification_type: "application",
        link_path: "/applications",
      })
    );
  });

  it("emails applicant on major status changes (shortlisted/interview/offered/placed/rejected)", async () => {
    buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "Acme" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({ id: "app-1", status: "offered" });

    expect(sendAppEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: "application-status",
        recipientUserId: "seeker-1",
        idempotencyKey: "app-status-app-1-offered",
      })
    );
  });

  it("does NOT email applicant on minor status changes (viewed)", async () => {
    buildMocks({
      appJobId: "job-1",
      jobOwnerId: "emp-1",
      appAfter: { applicant_id: "seeker-1", job_id: "job-1" },
      job: { title: "X", title_my: "X", company: "C" },
    });
    const { result } = renderHook(() => useUpdateApplicationStatus(), { wrapper });
    await result.current.mutateAsync({ id: "app-1", status: "viewed" });
    expect(sendAppEmailMock).not.toHaveBeenCalled();
  });
});
