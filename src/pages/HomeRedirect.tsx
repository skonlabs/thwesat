import { useUserRoles } from "@/hooks/use-user-roles";
import { useRole } from "@/hooks/use-role";
import HomePage from "./HomePage";
import AdminDashboard from "./AdminDashboard";
import ModeratorDashboard from "./ModeratorDashboard";
import EmployerDashboard from "./EmployerDashboard";
import MentorDashboard from "./MentorDashboard";

/**
 * /dashboard is the single unified home URL. We render the role-specific
 * dashboard inline (no redirects) to avoid navigation loops with the
 * legacy /admin, /employer/dashboard, /mentors/dashboard, /moderator routes
 * which all redirect into /dashboard.
 */
const HomeRedirect = () => {
  const { isLoading, isAdmin, isModerator, allowedRoles } = useUserRoles();
  const { role } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAdmin) return <AdminDashboard />;
  if (isModerator) return <ModeratorDashboard />;

  // Fall back to the user's actual allowed roles when the persisted UI role
  // is stale (e.g. previous session was a different account/role). Without
  // this, a mentor whose localStorage still says "jobseeker" would land on
  // the seeker home instead of their mentor dashboard.
  const effectiveRole = allowedRoles.includes(role) ? role : allowedRoles[0];

  if (effectiveRole === "employer") return <EmployerDashboard />;
  if (effectiveRole === "mentor") return <MentorDashboard />;

  return <HomePage />;
};

export default HomeRedirect;
