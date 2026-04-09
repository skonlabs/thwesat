import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  id: string;
  display_name: string;
  email?: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone?: string | null;
  website: string | null;
  primary_role: string;
  skills: string[] | null;
  languages: string[] | null;
  experience: string | null;
  visibility: string | null;
  is_premium: boolean | null;
  remote_ready: boolean | null;
  has_laptop: boolean | null;
  internet_stable: boolean | null;
  has_wise: boolean | null;
  has_payoneer: boolean | null;
  has_upwork: boolean | null;
  referral_code: string | null;
  preferred_work_types: string[] | null;
}

const PUBLIC_PROFILE_FIELDS = "id, display_name, avatar_url, headline, bio, location, website, primary_role, skills, languages, experience, visibility, is_premium, remote_ready, has_laptop, internet_stable, has_wise, has_payoneer, has_upwork, referral_code, preferred_work_types, created_at";

export function useAllProfiles(search?: string) {
  return useQuery({
    queryKey: ["all-profiles", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(PUBLIC_PROFILE_FIELDS)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,headline.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileData[];
    },
  });
}

export function useSearchTalent(filters?: { search?: string; skill?: string; location?: string; available?: boolean }) {
  return useQuery({
    queryKey: ["search-talent", filters],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(PUBLIC_PROFILE_FIELDS)
        .in("primary_role", ["jobseeker", "mentor"])
        .order("created_at", { ascending: false })
        .limit(1000);

      if (filters?.search) {
        query = query.or(`display_name.ilike.%${filters.search}%,headline.ilike.%${filters.search}%`);
      }
      if (filters?.location && filters.location !== "all") {
        query = query.eq("location", filters.location);
      }
      if (filters?.available) {
        query = query.eq("remote_ready", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileData[];
    },
  });
}
