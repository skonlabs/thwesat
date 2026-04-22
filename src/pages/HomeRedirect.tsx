import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useRole } from "@/hooks/use-role";
import HomePage from "./HomePage";

/**
 * /home redirects to the active role's dashboard so Home === Dashboard for every role.
 * Job seekers stay on the streamlined HomePage; admins/moderators/employers/mentors
 * see their dedicated dashboards.
 */
const HomeRedirect = () => {
  const { isLoading, isAdmin, isModerator } = useUserRoles();
  const { role } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isModerator) return <Navigate to="/moderator" replace />;
  if (role === "employer") return <Navigate to="/employer/dashboard" replace />;
  if (role === "mentor") return <Navigate to="/mentors/dashboard" replace />;

  return <HomePage />;
};

export default HomeRedirect;
