import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "./BottomNav";
import PullToRefresh from "./PullToRefresh";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { useSessionExpiry } from "@/hooks/use-session-expiry";

// Routes that own scrollable input/chat surfaces where pull-to-refresh
// would interfere with normal scrolling/typing.
const PTR_DISABLED_PREFIXES = [
  "/messages/chat",
  "/login",
  "/signup",
  "/onboarding",
  "/welcome",
  "/forgot-password",
];

// Map route prefix → query keys that should refetch on pull-to-refresh.
// Avoids the previous behavior of invalidating EVERY cached query (wasteful
// on slow networks and triggers unnecessary background refetches).
const ROUTE_REFETCH_KEYS: { match: (path: string) => boolean; keys: string[][] }[] = [
  { match: (p) => p.startsWith("/jobs"), keys: [["jobs"], ["saved-jobs"], ["applications"]] },
  { match: (p) => p.startsWith("/applications"), keys: [["applications"]] },
  { match: (p) => p.startsWith("/mentors"), keys: [["mentor-profiles"], ["mentor-bookings"], ["mentor-availability"]] },
  { match: (p) => p.startsWith("/messages"), keys: [["conversations"], ["messages"]] },
  { match: (p) => p.startsWith("/notifications"), keys: [["notifications"], ["unread-notifications"]] },
  { match: (p) => p.startsWith("/community"), keys: [["community-posts"]] },
  { match: (p) => p.startsWith("/guides"), keys: [["guides"]] },
  { match: (p) => p.startsWith("/employer"), keys: [["employer-jobs"], ["employer-applications"]] },
  { match: (p) => p.startsWith("/admin"), keys: [["admin-jobs"], ["admin-users"], ["admin-payments"], ["admin-employers"]] },
  { match: (p) => p.startsWith("/dashboard") || p === "/home", keys: [["notifications"], ["conversations"], ["jobs"], ["applications"]] },
  { match: (p) => p.startsWith("/profile"), keys: [["profile"]] },
];

const AppLayout = () => {
  usePresenceHeartbeat();
  useSessionExpiry();
  const queryClient = useQueryClient();
  const location = useLocation();

  const ptrDisabled = PTR_DISABLED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  const handleRefresh = async () => {
    const matched = ROUTE_REFETCH_KEYS.find((r) => r.match(location.pathname));
    if (!matched) {
      // Fallback: only refetch active queries on the current view, not all.
      await queryClient.refetchQueries({ type: "active" });
      return;
    }
    await Promise.all(
      matched.keys.map((k) =>
        queryClient.invalidateQueries({ queryKey: k, refetchType: "active" }),
      ),
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background md:max-w-2xl lg:max-w-3xl">
      <PullToRefresh onRefresh={handleRefresh} disabled={ptrDisabled}>
        <div className="pb-20">
          <Outlet />
        </div>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
