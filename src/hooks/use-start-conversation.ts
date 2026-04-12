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

    try {
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

      // Generate UUID client-side to avoid RLS SELECT issue on conversations
      // (The SELECT policy requires user to be a participant, but participants
      //  aren't added until after the conversation is created)
      const convId = crypto.randomUUID();
      const { error: convErr } = await supabase
        .from("conversations")
        .insert({ id: convId });

      if (convErr) {
        console.error("Failed to create conversation:", convErr);
        toast({ title: "Failed to create conversation", variant: "destructive" });
        return;
      }

      // Add current user first (RLS requires auth.uid() = user_id for first insert)
      const { error: partErr1 } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: convId, user_id: user.id });

      if (partErr1) {
        console.error("Failed to add self as participant:", partErr1);
        toast({ title: "Failed to create conversation", variant: "destructive" });
        return;
      }

      // Now add other user (RLS allows because current user is already a participant)
      const { error: partErr } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: convId, user_id: otherUserId });

      if (partErr) {
        console.error("Failed to add other participant:", partErr);
        toast({ title: "Failed to create conversation", variant: "destructive" });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate(`/messages/chat?id=${convId}`);
    } catch (err) {
      console.error("startConversation error:", err);
      toast({ title: "Failed to start conversation", variant: "destructive" });
    }
  };

  return { startConversation };
}
