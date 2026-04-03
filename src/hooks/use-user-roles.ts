import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/hooks/use-role";

/**
 * Determines which app roles (jobseeker / employer / mentor) the current user
 * is allowed to access, based on their profile's primary_role and whether a
 * mentor_profiles row exists.
 */
export function useUserRoles() {
  const { user, profile, loading: authLoading } = useAuth();

  const { data: hasMentorProfile, isLoading: mentorLoading } = useQuery({
    queryKey: ["has-mentor-profile", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("mentor_profiles")
        .select("id", { count: "exact", head: true })
        .eq("id", user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
  });

  const primaryRole = (profile?.primary_role as UserRole) || "jobseeker";
  const isLoading = authLoading || mentorLoading;

  const allowedRoles: UserRole[] = [];

  if (!isLoading && profile) {
    // Base role from signup
    if (primaryRole === "employer") {
      allowedRoles.push("employer");
    } else {
      // jobseeker or mentor signup → gets jobseeker access
      allowedRoles.push("jobseeker");
    }

    // Mentor access if they have a mentor profile or signed up as mentor
    if (hasMentorProfile || primaryRole === "mentor") {
      allowedRoles.push("mentor");
    }
  }

  const hasRole = (role: UserRole) => allowedRoles.includes(role);

  return { allowedRoles, hasRole, isLoading };
}
