import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRoles } from "@/hooks/use-user-roles";

export function useStartConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasRole } = useUserRoles();

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    if (otherUserId === user.id) {
      toast({ title: "Cannot message yourself", variant: "destructive" });
      return;
    }

    try {
      // If an existing conversation already exists, always allow re-entering it.
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

      // Gating for NEW conversations:
      // - Mentors and employers can message anyone.
      // - Everyone else can only message users who are mentors or employers.
      const currentUserCanMessageAnyone = hasRole("mentor") || hasRole("employer");
      if (!currentUserCanMessageAnyone) {
        const [mentorRes, employerRes] = await Promise.all([
          supabase
            .from("mentor_profiles")
            .select("id", { head: true, count: "exact" })
            .eq("id", otherUserId),
          supabase
            .from("employer_profiles")
            .select("id", { head: true, count: "exact" })
            .eq("id", otherUserId),
        ]);
        const targetIsMentor = (mentorRes.count ?? 0) > 0;
        const targetIsEmployer = (employerRes.count ?? 0) > 0;
        if (!targetIsMentor && !targetIsEmployer) {
          toast({
            title: "Messaging not available",
            description: "You can only message mentors or employers.",
            variant: "destructive",
          });
          return;
        }
      }

      // Generate UUID client-side to avoid RLS SELECT issue on conversations
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
