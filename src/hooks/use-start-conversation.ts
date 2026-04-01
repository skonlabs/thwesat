import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function useStartConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    if (otherUserId === user.id) {
      toast({ title: "Cannot message yourself", variant: "destructive" });
      return;
    }

    // Check if conversation already exists between these two users
    const { data: myParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myParticipations && myParticipations.length > 0) {
      const convIds = myParticipations.map((p) => p.conversation_id);
      const { data: otherParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", convIds);

      if (otherParticipations && otherParticipations.length > 0) {
        navigate(`/messages/chat?id=${otherParticipations[0].conversation_id}`);
        return;
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convErr || !conv) {
      toast({ title: "Failed to create conversation", variant: "destructive" });
      return;
    }

    // Add current user first (RLS requires auth.uid() = user_id for first insert)
    const { error: partErr1 } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: conv.id, user_id: user.id });

    if (partErr1) {
      toast({ title: "Failed to create conversation", variant: "destructive" });
      return;
    }

    // Now add other user (RLS allows because current user is already a participant)
    const { error: partErr } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: conv.id, user_id: otherUserId });

    if (partErr) {
      toast({ title: "Failed to create conversation", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    navigate(`/messages/chat?id=${conv.id}`);
  };

  return { startConversation };
}
