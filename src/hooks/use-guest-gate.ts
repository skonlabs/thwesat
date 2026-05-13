import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * Returns a guard function. Call it before performing an action that requires
 * a signed-in user. If the user is signed in, returns true and lets you proceed.
 * Otherwise, redirects to /login (preserving where they were) and returns false.
 */
export function useGuestGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (user) return true;
    const back = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?redirect=${back}`);
    return false;
  };
}
