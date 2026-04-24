import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Returns all conversations for the current user with last-message and unread counts.
 *
 * NOTE: This function has an N+1 query pattern — it fires separate Supabase queries
 * per conversation to fetch the last message and unread count. In a future iteration
 * this should be refactored into a single Postgres RPC call (e.g. `get_conversations`)
 * that returns all data in one round-trip.
 */
export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get conversations the user participates in
      const { data: participations, error: pErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (pErr) throw pErr;
      if (!participations?.length) return [];

      const convIds = participations.map(p => p.conversation_id);
      const { data: conversations, error: cErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("last_message_at", { ascending: false });
      if (cErr) throw cErr;

      // Get other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      const otherUserIds = [...new Set(
        (allParticipants || [])
          .filter(p => p.user_id !== user.id)
          .map(p => p.user_id)
      )];

      const { data: profiles } = otherUserIds.length > 0
        ? await supabase.from("profiles").select("id, display_name, headline, avatar_url").in("id", otherUserIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get last message for each conversation
      const results = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("content, sender_id, created_at, is_read")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          const otherParticipant = (allParticipants || []).find(
            p => p.conversation_id === conv.id && p.user_id !== user.id
          );
          const otherProfile = otherParticipant ? profileMap.get(otherParticipant.user_id) : null;

          return {
            ...conv,
            lastMessage: msgs?.[0] || null,
            unreadCount: unreadCount || 0,
            otherProfile,
          };
        })
      );
      return results;
    },
    enabled: !!user,
    // Polling every 60 s is a temporary workaround. The proper solution is to subscribe
    // to Supabase Realtime (postgres_changes on conversations + messages) so updates are
    // pushed instantly without any polling overhead.
    refetchInterval: 60000,
  });
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId && !!user,
    // Polling every 30 s is a temporary workaround. The proper solution is to subscribe
    // to Supabase Realtime (postgres_changes on the messages table filtered by
    // conversation_id) so new messages are pushed in real time without polling.
    refetchInterval: 30000,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
