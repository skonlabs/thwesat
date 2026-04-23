import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import BottomNav from "./BottomNav";
import PullToRefresh from "./PullToRefresh";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { useSessionExpiry } from "@/hooks/use-session-expiry";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useLanguage } from "@/hooks/use-language";

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

  // Cross-device language sync: once user_settings load, adopt the saved
  // preference if it differs from the local store. localStorage still wins
  // for unauthenticated visitors.
  const { data: userSettings } = useUserSettings();
  const { lang, setLang } = useLanguage();
  useEffect(() => {
    const saved = userSettings?.language;
    if (saved && (saved === "my" || saved === "en") && saved !== lang) {
      setLang(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings?.language]);

  // Apply Myanmar render-font preference. CSS rules in index.css respond
  // to `data-myanmar-font` on the <html> element. Defaults to "system".
  useEffect(() => {
    const fe = userSettings?.font_encoding || "system";
    document.documentElement.setAttribute("data-myanmar-font", fe);
  }, [userSettings?.font_encoding]);

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
