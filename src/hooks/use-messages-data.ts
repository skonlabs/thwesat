import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeText } from "@/lib/sanitize";

/**
 * SECURITY NOTE — XSS prevention for message content:
 *
 * Message content stored in state or returned from this hook MUST be rendered
 * via React's safe JSX text interpolation (e.g. `{message.content}`), NOT via
 * `dangerouslySetInnerHTML`. React automatically HTML-escapes text node content,
 * preventing XSS. Never pass raw message content to `dangerouslySetInnerHTML`.
 *
 * If message content must ever be processed for display outside of React's
 * templating (e.g. for notifications, clipboard, or native UI), use
 * `sanitizeText(content)` from `@/lib/sanitize` to strip all HTML and return
 * plain text only.
 *
 * Example safe usage:    <p>{message.content}</p>
 * Example unsafe usage:  <p dangerouslySetInnerHTML={{ __html: message.content }} />
 */

/**
 * Returns all conversations for the current user with last-message and unread counts.
 *
 * N+1 QUERY PATTERN — NOTE FOR FUTURE IMPROVEMENT:
 * For each conversation, this function fires two additional Supabase queries:
 *   1. Fetch the last message (messages ORDER BY created_at DESC LIMIT 1)
 *   2. Fetch the unread count (COUNT WHERE is_read=false AND sender_id!=user)
 *
 * These are currently batched with Promise.all to run in parallel, but they still
 * result in 2N+3 round-trips for N conversations. The proper fix is a single Postgres
 * RPC or view, e.g.:
 *   CREATE OR REPLACE FUNCTION get_conversations(p_user_id uuid)
 *   that JOINs conversations with last-message and unread counts in one query.
 *
 * TODO: Replace with a single RPC call: get_conversations(user_id)
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

          // Sanitize the last-message content preview to plain text so it is
          // safe to use in any rendering context (notifications, list previews, etc.)
          const rawLastMsg = msgs?.[0] || null;
          const lastMessage = rawLastMsg
            ? { ...rawLastMsg, content: sanitizeText(rawLastMsg.content ?? "") }
            : null;

          return {
            ...conv,
            lastMessage,
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
  const queryClient = useQueryClient();

  // Supabase Realtime subscription — pushes live message inserts so the UI
  // updates instantly without waiting for the polling fallback.
  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

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
    // Polling at 60 s as a fallback in case the Realtime subscription misses an
    // event. The subscription above handles the common path so 60 s is acceptable.
    refetchInterval: 60000,
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
