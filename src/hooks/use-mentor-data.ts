import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { deriveUserStatus, type UserStatus } from "@/hooks/use-presence";

export interface MentorWithProfile {
  id: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  bio_my: string | null;
  expertise: string[] | null;
  location: string | null;
  hourly_rate: number | null;
  currency: string | null;
  is_available: boolean | null;
  rating_avg: number | null;
  total_sessions: number | null;
  total_mentees: number | null;
  available_days: string[] | null;
  timezone: string | null;
  status?: UserStatus;
  profile?: {
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    skills: string[] | null;
    languages: string[] | null;
    last_seen_at?: string | null;
  };
}

function isBookingActiveNow(booking: { scheduled_date: string; scheduled_time: string }): boolean {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (booking.scheduled_date !== today) return false;
  if (!booking.scheduled_time || booking.scheduled_time === "TBD") return false;
  const [h, m] = booking.scheduled_time.split(":").map(Number);
  const bookingStart = new Date(now);
  bookingStart.setHours(h, m, 0, 0);
  const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000);
  return now >= bookingStart && now <= bookingEnd;
}

export function useMentorProfiles() {
  return useQuery({
    queryKey: ["mentor-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("*")
        .order("rating_avg", { ascending: false });
      if (error) throw error;

      const validMentors = (data || []).filter(
        (m) => m.title && m.title.trim() !== ""
      );

      const ids = validMentors.map(m => m.id);
      if (ids.length === 0) return [];

      const [profilesRes, bookingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, headline, avatar_url, skills, languages, last_seen_at")
          .in("id", ids),
        supabase
          .from("mentor_bookings")
          .select("mentor_id, scheduled_date, scheduled_time")
          .in("mentor_id", ids)
          .eq("status", "confirmed"),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      const busyMentorIds = new Set<string>();
      (bookingsRes.data || []).forEach(b => {
        if (isBookingActiveNow(b)) busyMentorIds.add(b.mentor_id);
      });

      return validMentors.map(mentor => {
        const profile = profileMap.get(mentor.id);
        const status = deriveUserStatus(
          (profile as any)?.last_seen_at,
          busyMentorIds.has(mentor.id)
        );
        return { ...mentor, profile, status } as MentorWithProfile;
      });
    },
  });
}

export function useMentorProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["mentor-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [profileRes, bookingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, headline, avatar_url, skills, languages, bio, location, last_seen_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("mentor_bookings")
          .select("scheduled_date, scheduled_time")
          .eq("mentor_id", id)
          .eq("status", "confirmed"),
      ]);

      const hasActiveBooking = (bookingsRes.data || []).some(isBookingActiveNow);
      const status = deriveUserStatus(
        (profileRes.data as any)?.last_seen_at,
        hasActiveBooking
      );

      return { ...data, profile: profileRes.data, status } as MentorWithProfile;
    },
    enabled: !!id,
  });
}
