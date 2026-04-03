import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute

export function usePresenceHeartbeat() {
  const { user } = useAuth();

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() } as any)
      .eq("id", user.id);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Send immediately on mount
    sendHeartbeat();

    // Then every minute
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Also send on visibility change (tab focus)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, sendHeartbeat]);
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export type UserStatus = "online" | "busy" | "offline";

export function deriveUserStatus(
  lastSeenAt: string | null | undefined,
  hasActiveBooking?: boolean
): UserStatus {
  if (!lastSeenAt) return "offline";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff > ONLINE_THRESHOLD_MS) return "offline";
  if (hasActiveBooking) return "busy";
  return "online";
}
