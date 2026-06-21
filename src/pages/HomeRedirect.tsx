import { useUserRoles } from "@/hooks/use-user-roles";
import { useRole } from "@/hooks/use-role";
import HomePage from "./HomePage";
import AdminDashboard from "./AdminDashboard";
import PartnerDashboard from "./PartnerDashboard";
import EmployerDashboard from "./EmployerDashboard";
import AgentDashboard from "./AgentDashboard";
import MentorDashboard from "./MentorDashboard";

/**
 * /dashboard is the single unified home URL. We render the role-specific
 * dashboard inline (no redirects) to avoid navigation loops with the
 * legacy /admin, /employer/dashboard, /mentors/dashboard routes
 * which all redirect into /dashboard.
 */
const HomeRedirect = () => {
  const { isLoading, isAdmin, isPartner, allowedRoles } = useUserRoles();
  const { role } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAdmin) return <AdminDashboard />;
  if (isPartner) return <PartnerDashboard />;

  // Fall back to the user's actual allowed roles when the persisted UI role
  // is stale (e.g. previous session was a different account/role).
  const effectiveRole = allowedRoles.includes(role) ? role : allowedRoles[0];

  if (effectiveRole === "agent") return <AgentDashboard />;
  if (effectiveRole === "employer") return <EmployerDashboard />;
  if (effectiveRole === "mentor") return <MentorDashboard />;

  return <HomePage />;
};

export default HomeRedirect;
