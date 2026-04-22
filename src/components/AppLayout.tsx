import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "./BottomNav";
import PullToRefresh from "./PullToRefresh";
import { usePresenceHeartbeat } from "@/hooks/use-presence";

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

const AppLayout = () => {
  usePresenceHeartbeat();
  const queryClient = useQueryClient();
  const location = useLocation();

  const ptrDisabled = PTR_DISABLED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
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
