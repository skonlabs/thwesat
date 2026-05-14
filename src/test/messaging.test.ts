import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();
const invalidateMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: any[]) => fromMock(...a) },
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateMock }),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/use-user-roles", () => ({
  useUserRoles: () => ({ hasRole: (r: string) => r === "mentor" }),
}));

// Stable UUID for asserting create-path
vi.stubGlobal("crypto", { randomUUID: () => "new-conv-uuid" });

import { useStartConversation } from "@/hooks/use-start-conversation";

beforeEach(() => {
  fromMock.mockReset();
  navigateMock.mockReset();
  toastMock.mockReset();
  invalidateMock.mockReset();
});

describe("useStartConversation", () => {
  it("rejects messaging yourself", async () => {
    const { startConversation } = useStartConversation();
    await startConversation("user-1");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cannot message yourself" })
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("REUSES an existing conversation instead of creating a new one", async () => {
    let call = 0;
    fromMock.mockImplementation((t: string) => {
      if (t === "conversation_participants") {
        call++;
        if (call === 1) {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ conversation_id: "conv-existing" }], error: null }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ conversation_id: "conv-existing" }], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { startConversation } = useStartConversation();
    await startConversation("user-2");
    expect(navigateMock).toHaveBeenCalledWith("/messages/chat?id=conv-existing");
  });

  it("CREATES a new conversation + 2 participants when none exists", async () => {
    const partInsert = vi.fn().mockResolvedValue({ error: null });
    const convInsert = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((t: string) => {
      if (t === "conversation_participants") {
        let call = 0;
        return {
          select: () => ({
            eq: () => {
              call++;
              if (call === 1) return Promise.resolve({ data: [], error: null });
              return { in: () => Promise.resolve({ data: [], error: null }) };
            },
          }),
          insert: partInsert,
        };
      }
      if (t === "conversations") return { insert: convInsert };
      return {};
    });

    const { startConversation } = useStartConversation();
    await startConversation("user-2");

    expect(convInsert).toHaveBeenCalledWith({ id: "new-conv-uuid" });
    expect(partInsert).toHaveBeenCalledTimes(2);
    expect(partInsert.mock.calls[0][0]).toEqual({ conversation_id: "new-conv-uuid", user_id: "user-1" });
    expect(partInsert.mock.calls[1][0]).toEqual({ conversation_id: "new-conv-uuid", user_id: "user-2" });
    expect(navigateMock).toHaveBeenCalledWith("/messages/chat?id=new-conv-uuid");
  });

  it("auto-sends initialMessage on a freshly created thread", async () => {
    const partInsert = vi.fn().mockResolvedValue({ error: null });
    const msgInsert = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((t: string) => {
      if (t === "conversation_participants") {
        let call = 0;
        return {
          select: () => ({
            eq: () => {
              call++;
              if (call === 1) return Promise.resolve({ data: [], error: null });
              return { in: () => Promise.resolve({ data: [], error: null }) };
            },
          }),
          insert: partInsert,
        };
      }
      if (t === "conversations") return { insert: vi.fn().mockResolvedValue({ error: null }) };
      if (t === "messages") return { insert: msgInsert };
      return {};
    });

    const { startConversation } = useStartConversation();
    await startConversation("user-2", { initialMessage: "  hi there  " });

    expect(msgInsert).toHaveBeenCalledWith({
      conversation_id: "new-conv-uuid",
      sender_id: "user-1",
      content: "hi there",
    });
  });
});
