import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
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

export function useAllProfiles(search?: string) {
  return useQuery({
    queryKey: ["all-profiles", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search) {
        query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,headline.ilike.%${search}%`);
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
        .select("*")
        .in("primary_role", ["jobseeker", "mentor"])
        .order("created_at", { ascending: false })
        .limit(50);

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
