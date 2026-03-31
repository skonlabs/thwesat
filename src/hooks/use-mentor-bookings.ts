import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useMentorBookings(asMentor = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-bookings", user?.id, asMentor],
    queryFn: async () => {
      if (!user) return [];
      const column = asMentor ? "mentor_id" : "mentee_id";
      const { data, error } = await supabase
        .from("mentor_bookings")
        .select("*")
        .eq(column, user.id)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      // Fetch other party profiles
      const otherIds = [...new Set((data || []).map(b => asMentor ? b.mentee_id : b.mentor_id))];
      if (otherIds.length === 0) return (data || []).map(b => ({ ...b, otherProfile: null }));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url")
        .in("id", otherIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(b => ({
        ...b,
        otherProfile: profileMap.get(asMentor ? b.mentee_id : b.mentor_id) || null,
      }));
    },
    enabled: !!user,
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("mentor_bookings")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
    },
  });
}

export function useCreateBooking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (booking: {
      mentor_id: string; mentee_id: string; scheduled_date: string; scheduled_time: string;
      topic?: string; message?: string; goals?: string; booked_by?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("mentor_bookings")
        .insert(booking);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
    },
  });
}

export function useMentorMentees() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-mentees", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mentor_mentees")
        .select("*")
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const menteeIds = [...new Set((data || []).map(m => m.mentee_id))];
      if (menteeIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url, location")
        .in("id", menteeIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(m => ({
        ...m,
        profile: profileMap.get(m.mentee_id) || null,
      }));
    },
    enabled: !!user,
  });
}

export function useMentorEarnings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-earnings", user?.id],
    queryFn: async () => {
      if (!user) return { thisMonth: 0, allTime: 0, withdrawable: 0 };
      const { data, error } = await supabase
        .from("mentor_earnings")
        .select("*")
        .eq("mentor_id", user.id);
      if (error) throw error;
      const now = new Date();
      const thisMonth = (data || [])
        .filter(e => new Date(e.created_at || "").getMonth() === now.getMonth())
        .reduce((a, e) => a + Number(e.amount), 0);
      const allTime = (data || []).reduce((a, e) => a + Number(e.amount), 0);
      const withdrawable = (data || [])
        .filter(e => e.status === "pending")
        .reduce((a, e) => a + Number(e.amount), 0);
      return { thisMonth, allTime, withdrawable };
    },
    enabled: !!user,
  });
}
