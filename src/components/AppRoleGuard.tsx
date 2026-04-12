import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useRole } from "@/hooks/use-role";
import type { UserRole } from "@/hooks/use-role";

interface AppRoleGuardProps {
  children: React.ReactNode;
  /** Which app roles (jobseeker/employer/mentor) are allowed */
  allowedRoles: UserRole[];
}

/**
 * Guards routes so users can only access screens for roles they actually hold.
 * Redirects to the home screen for their current (valid) role.
 */
const AppRoleGuard = ({ children, allowedRoles }: AppRoleGuardProps) => {
  const { allowedRoles: userRoles, isLoading } = useUserRoles();
  const { role } = useRole();
  const effectiveRole = userRoles.includes(role) ? role : userRoles[0];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasAccess = allowedRoles.some((r) => userRoles.includes(r));

  if (!hasAccess) {
    // Redirect to the appropriate home for their actual role
    const fallback =
      effectiveRole === "employer" && userRoles.includes("employer")
        ? "/employer/dashboard"
        : effectiveRole === "mentor" && userRoles.includes("mentor")
          ? "/mentors/dashboard"
          : "/home";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default AppRoleGuard;
