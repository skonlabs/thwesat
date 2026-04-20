import { GraduationCap, Shield, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type RoleType = "mentor" | "admin" | "moderator" | "employer";

interface RoleBadgeProps {
  type: RoleType;
  size?: "sm" | "md";
}

const config: Record<RoleType, { label: string; icon: typeof GraduationCap; className: string }> = {
  mentor: {
    label: "Mentor",
    icon: GraduationCap,
    className: "bg-accent/15 text-accent-foreground border-accent/30",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  moderator: {
    label: "Mod",
    icon: Shield,
    className: "bg-primary/10 text-primary border-primary/30",
  },
  employer: {
    label: "Employer",
    icon: Building2,
    className: "bg-muted text-foreground border-border",
  },
};

export function RoleBadge({ type, size = "sm" }: RoleBadgeProps) {
  const { label, icon: Icon, className } = config[type];
  const sizing = size === "sm" ? "text-[9px] px-1.5 py-0.5 gap-0.5" : "text-[10px] px-2 py-0.5 gap-1";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${sizing} ${className}`}>
      <Icon className={iconSize} strokeWidth={2} />
      {label}
    </span>
  );
}

/**
 * Fetches role flags for a given user (mentor profile, admin/moderator role, employer profile).
 */
export function useUserRoleFlags(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-role-flags", userId],
    queryFn: async () => {
      if (!userId) return { isMentor: false, isAdmin: false, isModerator: false, isEmployer: false };
      const [m, e, r] = await Promise.all([
        supabase.from("mentor_profiles").select("id", { head: true, count: "exact" }).eq("id", userId),
        supabase.from("employer_profiles").select("id", { head: true, count: "exact" }).eq("id", userId),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const roles = (r.data || []).map((x) => x.role);
      return {
        isMentor: (m.count ?? 0) > 0,
        isEmployer: (e.count ?? 0) > 0,
        isAdmin: roles.includes("admin"),
        isModerator: roles.includes("moderator"),
      };
    },
    enabled: !!userId,
  });
}

/** Convenience: renders all applicable badges for a user inline. */
export function UserRoleBadges({ userId }: { userId: string | undefined }) {
  const { data } = useUserRoleFlags(userId);
  if (!data) return null;
  return (
    <>
      {data.isAdmin && <RoleBadge type="admin" />}
      {data.isModerator && !data.isAdmin && <RoleBadge type="moderator" />}
      {data.isMentor && <RoleBadge type="mentor" />}
      {data.isEmployer && <RoleBadge type="employer" />}
    </>
  );
}
