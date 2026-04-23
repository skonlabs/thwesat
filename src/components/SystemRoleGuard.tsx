import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/use-user-roles";

interface SystemRoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "moderator")[];
}

/**
 * Guards admin/moderator-only routes. Reuses the cached `useUserRoles`
 * query (same query key as BottomNav and AppRoleGuard) so we don't fire
 * a second user-roles request on every protected page load.
 */
const SystemRoleGuard = ({ children, allowedRoles }: SystemRoleGuardProps) => {
  const { isLoading, isAdmin, isModerator } = useUserRoles();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasAccess =
    (allowedRoles.includes("admin") && isAdmin) ||
    (allowedRoles.includes("moderator") && isModerator);

  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default SystemRoleGuard;
