import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  profile?: {
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    skills: string[] | null;
    languages: string[] | null;
  };
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

      const ids = (data || []).map(m => m.id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, headline, avatar_url, skills, languages")
        .in("id", ids);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(mentor => ({
        ...mentor,
        profile: profileMap.get(mentor.id),
      })) as MentorWithProfile[];
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, headline, avatar_url, skills, languages, bio, location")
        .eq("id", id)
        .maybeSingle();

      return { ...data, profile } as MentorWithProfile;
    },
    enabled: !!id,
  });
}
