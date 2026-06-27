import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
  /** Joined from public.user_roles. May be null while the role row is missing. */
  primary_role: string | null;
  skills: string[] | null;
  languages: string[] | null;
  experience: string | null;
  visibility: string | null;
  remote_ready: boolean | null;
  has_laptop: boolean | null;
  internet_stable: boolean | null;
  has_wise: boolean | null;
  has_upwork: boolean | null;
  referral_code: string | null;
  preferred_work_types: string[] | null;
}

const PUBLIC_PROFILE_FIELDS = "id, display_name, avatar_url, headline, bio, location, website, skills, languages, experience, visibility, remote_ready, has_laptop, internet_stable, has_wise, has_upwork, referral_code, preferred_work_types, created_at";

function applyVisibilityFilter(query: ReturnType<typeof supabase.from> extends never ? never : any, isAuthed: boolean) {
  if (isAuthed) {
    return query.in("visibility", ["public", "members"]);
  }
  return query.eq("visibility", "public");
}

async function attachRoles(rows: any[]): Promise<ProfileData[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
  const byId = new Map<string, string>();
  (roles ?? []).forEach((r: any) => byId.set(r.user_id, r.role));
  return rows.map((r) => ({ ...r, primary_role: byId.get(r.id) ?? null })) as ProfileData[];
}

export function useAllProfiles(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-profiles", search, !!user],
    queryFn: async () => {
      let query = (supabase as any)
        .from("profiles")
        .select(PUBLIC_PROFILE_FIELDS)
        .order("created_at", { ascending: false })
        .limit(1000);

      query = applyVisibilityFilter(query, !!user);

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,headline.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return attachRoles((data as any) ?? []);
    },
  });
}

export function useSearchTalent(filters?: { search?: string; skill?: string; location?: string; available?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["search-talent", filters, !!user],
    queryFn: async () => {
      // Fetch user_ids of seekers + mentors first, then their profiles.
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["job_seeker", "mentor"]);
      const ids = (roleRows ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [] as ProfileData[];

      let query = (supabase as any)
        .from("profiles")
        .select(PUBLIC_PROFILE_FIELDS)
        .in("id", ids)
        .order("created_at", { ascending: false })
        .limit(1000);

      query = applyVisibilityFilter(query, !!user);

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
      return attachRoles((data as any) ?? []);
    },
  });
}
