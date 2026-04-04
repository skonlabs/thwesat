import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import SystemNav from "./SystemNav";
import { usePresenceHeartbeat } from "@/hooks/use-presence";

const AppLayout = () => {
  usePresenceHeartbeat();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <SystemNav />
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
