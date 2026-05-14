import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fromMock = vi.fn();
const rpcMock = vi.fn();
const sendAppEmailMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: any[]) => fromMock(...a), rpc: (...a: any[]) => rpcMock(...a) },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "mentor-1" } }) }));
vi.mock("@/lib/send-app-email", () => ({ sendAppEmail: (...a: any[]) => sendAppEmailMock(...a) }));

import {
  useCreateBooking,
  useUpdateBookingStatus,
  useMentorMentees,
  useMarkSessionComplete,
} from "@/hooks/use-mentor-bookings";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

function commonNotifAndMessageMocks(extra: (table: string) => any = () => null) {
  return (table: string) => {
    const ext = extra(table);
    if (ext) return ext;
    if (table === "profiles") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { display_name: "Aung" }, error: null }) }) }),
      };
    }
    if (table === "notifications") return { insert: vi.fn().mockResolvedValue({ error: null }) };
    if (table === "conversation_participants") {
      return {
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "conversations") {
      return {
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "conv-1" }, error: null }) }) }),
      };
    }
    if (table === "messages") return { insert: vi.fn().mockResolvedValue({ error: null }) };
    return {};
  };
}

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
  sendAppEmailMock.mockReset();
});

describe("Mentor — useCreateBooking", () => {
  it("inserts a booking and returns the new id", async () => {
    const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: "bk-1" }, error: null });
    fromMock.mockImplementation(
      commonNotifAndMessageMocks((t) =>
        t === "mentor_bookings"
          ? {
              insert: () => ({ select: () => ({ single: insertSelectSingle }) }),
            }
          : null
      )
    );

    const { result } = renderHook(() => useCreateBooking(), { wrapper });
    const res = await result.current.mutateAsync({
      mentor_id: "mentor-7",
      mentee_id: "mentor-1",
      scheduled_date: "2026-06-01",
      scheduled_time: "10:00",
    });
    expect(res).toEqual({ id: "bk-1" });
    expect(insertSelectSingle).toHaveBeenCalled();
  });

  it("propagates DB errors from booking insert", async () => {
    fromMock.mockImplementation(
      commonNotifAndMessageMocks((t) =>
        t === "mentor_bookings"
          ? { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "conflict" } }) }) }) }
          : null
      )
    );
    const { result } = renderHook(() => useCreateBooking(), { wrapper });
    await expect(
      result.current.mutateAsync({
        mentor_id: "m", mentee_id: "x", scheduled_date: "2026-06-01", scheduled_time: "10:00",
      })
    ).rejects.toBeTruthy();
  });
});

describe("Mentor — useUpdateBookingStatus → confirmed", () => {
  function build(opts: { existingMentee: any | null; bookingMentorId?: string; bookingMenteeId?: string }) {
    const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const menteeUpdateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const menteeInsert = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation(
      commonNotifAndMessageMocks((t) => {
        if (t === "mentor_bookings") {
          return {
            update: updateChain.update,
            eq: updateChain.eq,
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      mentor_id: opts.bookingMentorId ?? "mentor-1",
                      mentee_id: opts.bookingMenteeId ?? "mentee-1",
                      scheduled_date: "2026-06-01",
                      scheduled_time: "10:00",
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (t === "mentor_mentees") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: opts.existingMentee, error: null }),
                }),
              }),
            }),
            update: menteeUpdateChain.update,
            eq: menteeUpdateChain.eq,
            insert: menteeInsert,
          };
        }
        return null;
      })
    );
    return { updateChain, menteeUpdateChain, menteeInsert };
  }

  it("INSERTS a new mentor_mentees row when no relationship exists", async () => {
    const { menteeInsert } = build({ existingMentee: null, bookingMentorId: "mentor-1", bookingMenteeId: "mentee-2" });
    const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", status: "confirmed" });

    expect(menteeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        mentor_id: "mentor-1",
        mentee_id: "mentee-2",
        status: "active",
      })
    );
  });

  it("UPDATES an existing mentor_mentees row to status=active (no duplicate insert)", async () => {
    const { menteeUpdateChain, menteeInsert } = build({
      existingMentee: { id: "mm-1", sessions_completed: 3 },
    });
    const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", status: "confirmed" });

    expect(menteeInsert).not.toHaveBeenCalled();
    expect(menteeUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" })
    );
    expect(menteeUpdateChain.eq).toHaveBeenCalledWith("id", "mm-1");
  });

  it("emails BOTH mentor and mentee on confirmation with role-aware idempotency keys", async () => {
    build({ existingMentee: null });
    const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", status: "confirmed" });

    const keys = sendAppEmailMock.mock.calls.map((c) => c[0].idempotencyKey).sort();
    expect(keys).toEqual(["booking-confirmed-mentee-bk-1", "booking-confirmed-mentor-bk-1"]);
  });

  it("writes decline_reason to the booking when status=cancelled with reason", async () => {
    const { updateChain } = build({ existingMentee: null });
    const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", status: "cancelled", declineReason: "schedule conflict" });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled", decline_reason: "schedule conflict" })
    );
  });

  it("writes proposed_date/proposed_time on counter-proposal", async () => {
    const { updateChain } = build({ existingMentee: null });
    const { result } = renderHook(() => useUpdateBookingStatus(), { wrapper });
    await result.current.mutateAsync({
      id: "bk-1",
      status: "cancelled",
      proposedDate: "2026-06-05",
      proposedTime: "14:00",
    });
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ proposed_date: "2026-06-05", proposed_time: "14:00" })
    );
  });
});

describe("Mentor — useMentorMentees (dedup + session counting)", () => {
  it("dedupes by mentee_id and counts only confirmed/completed bookings as sessions", async () => {
    const bookings = [
      { id: "b1", mentor_id: "mentor-1", mentee_id: "alice", status: "confirmed", created_at: "2026-01-01", goals: "g", message: "m" },
      { id: "b2", mentor_id: "mentor-1", mentee_id: "alice", status: "completed", created_at: "2026-02-01", goals: "g", message: "m" },
      { id: "b3", mentor_id: "mentor-1", mentee_id: "alice", status: "pending",   created_at: "2026-03-01", goals: "g", message: "m" },
      { id: "b4", mentor_id: "mentor-1", mentee_id: "bob",   status: "confirmed", created_at: "2026-02-15", goals: "g", message: "m" },
    ];
    fromMock.mockImplementation((t: string) => {
      if (t === "mentor_bookings") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: () => ({ order: () => Promise.resolve({ data: bookings, error: null }) }),
              }),
            }),
          }),
        };
      }
      if (t === "profiles") {
        return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
      }
      return {};
    });

    const { result } = renderHook(() => useMentorMentees(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const mentees = result.current.data || [];
    expect(mentees).toHaveLength(2);
    const alice = mentees.find((m: any) => m.mentee_id === "alice");
    const bob = mentees.find((m: any) => m.mentee_id === "bob");
    // Alice: confirmed + completed = 2; pending NOT counted
    expect(alice.sessions_completed).toBe(2);
    expect(alice.status).toBe("active");
    expect(bob.sessions_completed).toBe(1);
  });
});

describe("Mentor — useMarkSessionComplete", () => {
  it("delegates to the mark_session_complete RPC and skips notify when both completed", async () => {
    rpcMock.mockResolvedValue({
      data: { mentor_completed_at: "2026-06-01", mentee_completed_at: "2026-06-01" },
      error: null,
    });
    const notifInsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((t: string) => {
      if (t === "mentor_bookings") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { mentor_id: "mentor-1", mentee_id: "mentee-1", scheduled_date: "2026-06-01", scheduled_time: "10:00" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (t === "notifications") return { insert: notifInsert };
      if (t === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { display_name: "Aung" }, error: null }) }) }) };
      }
      return {};
    });

    const { result } = renderHook(() => useMarkSessionComplete(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", role: "mentor" });

    expect(rpcMock).toHaveBeenCalledWith("mark_session_complete", { _booking_id: "bk-1", _role: "mentor" });
    expect(notifInsert).not.toHaveBeenCalled();
  });

  it("notifies the OTHER party when only one side has completed", async () => {
    rpcMock.mockResolvedValue({
      data: { mentor_completed_at: "2026-06-01", mentee_completed_at: null },
      error: null,
    });
    const notifInsert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((t: string) => {
      if (t === "mentor_bookings") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { mentor_id: "mentor-1", mentee_id: "mentee-9", scheduled_date: "2026-06-01", scheduled_time: "10:00" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (t === "notifications") return { insert: notifInsert };
      if (t === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { display_name: "Aung" }, error: null }) }) }) };
      }
      return {};
    });

    const { result } = renderHook(() => useMarkSessionComplete(), { wrapper });
    await result.current.mutateAsync({ id: "bk-1", role: "mentor" });

    expect(notifInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "mentee-9", notification_type: "booking" })
    );
  });
});
