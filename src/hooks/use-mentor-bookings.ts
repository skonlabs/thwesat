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

async function sendBookingNotification({
  recipientId,
  senderId,
  type,
  bookingDate,
  bookingTime,
  proposedDate,
  proposedTime,
}: {
  recipientId: string;
  senderId: string;
  type: "new_booking" | "booking_confirmed" | "booking_declined" | "booking_counter_proposal";
  bookingDate: string;
  bookingTime: string;
  proposedDate?: string;
  proposedTime?: string;
}) {
  // Get sender name
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", senderId)
    .maybeSingle();
  const senderName = senderProfile?.display_name || "Someone";

  const titles: Record<string, { en: string; my: string }> = {
    new_booking: { en: `New booking request from ${senderName}`, my: `${senderName} ထံမှ Booking အသစ်` },
    booking_confirmed: { en: `${senderName} confirmed your booking`, my: `${senderName} သင့် Booking ကို အတည်ပြုပြီ` },
    booking_declined: { en: `${senderName} declined your booking`, my: `${senderName} သင့် Booking ကို ငြင်းပယ်ပြီ` },
    booking_counter_proposal: { en: `${senderName} proposed a new time`, my: `${senderName} အချိန်အသစ် အဆိုပြုပြီ` },
  };

  const descriptions: Record<string, { en: string; my: string }> = {
    new_booking: { en: `Session on ${bookingDate} at ${bookingTime}`, my: `${bookingDate} ${bookingTime} တွင် Session` },
    booking_confirmed: { en: `Your session on ${bookingDate} at ${bookingTime} is confirmed`, my: `${bookingDate} ${bookingTime} Session အတည်ပြုပြီ` },
    booking_declined: { en: `Your session on ${bookingDate} at ${bookingTime} was declined`, my: `${bookingDate} ${bookingTime} Session ငြင်းပယ်ခံရပြီ` },
    booking_counter_proposal: {
      en: `New proposed time: ${proposedDate} at ${proposedTime}. Check your bookings to accept.`,
      my: `အချိန်အသစ်: ${proposedDate} ${proposedTime}။ Booking တွင် စစ်ဆေးပါ။`,
    },
  };

  // 1. In-app notification
  await supabase.from("notifications").insert({
    user_id: recipientId,
    notification_type: "booking",
    title: titles[type].en,
    title_my: titles[type].my,
    description: descriptions[type].en,
    description_my: descriptions[type].my,
    link_path: "/mentors/bookings",
  });

  // 2. Auto-message: find or create conversation, then send
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", senderId);

  let conversationId: string | null = null;

  if (myParts && myParts.length > 0) {
    const convIds = myParts.map(p => p.conversation_id);
    const { data: otherParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", recipientId)
      .in("conversation_id", convIds);

    if (otherParts && otherParts.length > 0) {
      conversationId = otherParts[0].conversation_id;
    }
  }

  if (!conversationId) {
    const { data: conv } = await supabase.from("conversations").insert({}).select("id").single();
    if (conv) {
      conversationId = conv.id;
      await supabase.from("conversation_participants").insert({ conversation_id: conv.id, user_id: senderId });
      await supabase.from("conversation_participants").insert({ conversation_id: conv.id, user_id: recipientId });
    }
  }

  if (conversationId) {
    const messageTexts: Record<string, string> = {
      new_booking: `📅 Booking request: ${bookingDate} at ${bookingTime}`,
      booking_confirmed: `✅ Booking confirmed: ${bookingDate} at ${bookingTime}`,
      booking_declined: `❌ Booking declined: ${bookingDate} at ${bookingTime}`,
      booking_counter_proposal: `🔄 Proposed new time: ${proposedDate} at ${proposedTime}. Please check your bookings to accept or decline.`,
    };

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: messageTexts[type],
    });
  }
}

export function useUpdateBookingStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      declineReason,
      proposedDate,
      proposedTime,
    }: {
      id: string;
      status: string;
      declineReason?: string;
      proposedDate?: string;
      proposedTime?: string;
    }) => {
      const updatePayload: any = { status };
      if (declineReason) updatePayload.decline_reason = declineReason;
      if (proposedDate) updatePayload.proposed_date = proposedDate;
      if (proposedTime) updatePayload.proposed_time = proposedTime;

      const { error } = await supabase
        .from("mentor_bookings")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;

      // Get booking details for notification
      const { data: booking } = await supabase
        .from("mentor_bookings")
        .select("mentor_id, mentee_id, scheduled_date, scheduled_time")
        .eq("id", id)
        .single();

      if (booking && user) {
        const isMentor = user.id === booking.mentor_id;
        const recipientId = isMentor ? booking.mentee_id : booking.mentor_id;

        if (status === "confirmed") {
          await sendBookingNotification({
            recipientId,
            senderId: user.id,
            type: "booking_confirmed",
            bookingDate: booking.scheduled_date,
            bookingTime: booking.scheduled_time,
          });
        } else if (status === "cancelled" && proposedDate && proposedTime) {
          await sendBookingNotification({
            recipientId,
            senderId: user.id,
            type: "booking_counter_proposal",
            bookingDate: booking.scheduled_date,
            bookingTime: booking.scheduled_time,
            proposedDate,
            proposedTime,
          });
        } else if (status === "cancelled") {
          await sendBookingNotification({
            recipientId,
            senderId: user.id,
            type: "booking_declined",
            bookingDate: booking.scheduled_date,
            bookingTime: booking.scheduled_time,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkSessionComplete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "mentor" | "mentee" }) => {
      if (!user) throw new Error("Not authenticated");
      const field = role === "mentor" ? "mentor_completed_at" : "mentee_completed_at";
      const { error } = await supabase
        .from("mentor_bookings")
        .update({ [field]: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      const { data: booking } = await supabase
        .from("mentor_bookings")
        .select("mentor_completed_at, mentee_completed_at")
        .eq("id", id)
        .single();
      if (booking && (booking as any).mentor_completed_at && (booking as any).mentee_completed_at) {
        await supabase.from("mentor_bookings").update({ status: "completed" }).eq("id", id);
      }
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

      // Send notification + auto-message to mentor
      await sendBookingNotification({
        recipientId: booking.mentor_id,
        senderId: user.id,
        type: "new_booking",
        bookingDate: booking.scheduled_date,
        bookingTime: booking.scheduled_time,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
