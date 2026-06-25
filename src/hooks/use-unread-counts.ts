import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Total unread message count across all conversations */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      const convIds = (parts || []).map(p => p.conversation_id);
      if (!convIds.length) return 0;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

/** Total unread notification count */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
