import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface AvailabilitySlot {
  id: string;
  mentor_id: string;
  day_of_week: string;
  slot_date: string | null;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

/** Fetch available (unbooked) slots for a mentor — used by mentees when booking */
export function useMentorAvailability(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-availability", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      const { data, error } = await supabase
        .from("mentor_availability_slots")
        .select("*")
        .eq("mentor_id", mentorId)
        .eq("is_booked", false)
        .not("slot_date", "is", null)
        .gte("slot_date", new Date().toISOString().split("T")[0])
        .order("slot_date")
        .order("start_time");
      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
    enabled: !!mentorId,
  });
}

/** Fetch ALL slots for a mentor (including booked) — used by mentor dashboard */
export function useMentorAllAvailability(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-all-availability", mentorId],
    queryFn: async () => {
      if (!mentorId) return [];
      const { data, error } = await supabase
        .from("mentor_availability_slots")
        .select("*")
        .eq("mentor_id", mentorId)
        .not("slot_date", "is", null)
        .gte("slot_date", new Date().toISOString().split("T")[0])
        .order("slot_date")
        .order("start_time");
      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
    enabled: !!mentorId,
  });
}

export function useAddAvailabilitySlot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slot: { slot_date: string; day_of_week: string; start_time: string; end_time: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_availability_slots")
        .insert({ mentor_id: user.id, ...slot } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-availability"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-all-availability"] });
    },
  });
}

export function useDeleteAvailabilitySlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mentor_availability_slots")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-availability"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-all-availability"] });
    },
  });
}
