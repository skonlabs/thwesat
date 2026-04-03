import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/hooks/use-role";

/**
 * Determines which app roles (jobseeker / employer / mentor) the current user
 * is allowed to access, based on their profile's primary_role and whether a
 * mentor_profiles row exists.
 *
 * Admin / moderator users get NO app roles — they should only use admin screens.
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

  const { data: systemRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-system-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    enabled: !!user,
  });

  const isAdmin = systemRoles?.includes("admin") ?? false;
  const isModerator = systemRoles?.includes("moderator") ?? false;
  const isSystemRole = isAdmin || isModerator;
  const primaryRole = (profile?.primary_role as UserRole) || "jobseeker";
  const isLoading = authLoading || mentorLoading || rolesLoading;

  const allowedRoles: UserRole[] = [];

  if (!isLoading && profile && !isAdmin) {
    // Base role from signup
    if (primaryRole === "employer") {
      allowedRoles.push("employer");
    } else {
      allowedRoles.push("jobseeker");
    }

    // Mentor access if they have a mentor profile or signed up as mentor
    if (hasMentorProfile || primaryRole === "mentor") {
      allowedRoles.push("mentor");
    }
  }

  const hasRole = (role: UserRole) => allowedRoles.includes(role);

  return { allowedRoles, hasRole, isLoading, isAdmin };
}
