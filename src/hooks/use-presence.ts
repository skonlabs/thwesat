import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute
const MIN_UPDATE_INTERVAL = 5_000; // minimum 5 s between presence writes

export function usePresenceHeartbeat() {
  const { user } = useAuth();
  const lastUpdate = useRef<number>(0);

  const updatePresence = useCallback(async () => {
    if (!user) return;
    // Debounce: skip if called too soon after the last successful write
    if (Date.now() - lastUpdate.current < MIN_UPDATE_INTERVAL) return;
    lastUpdate.current = Date.now();
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() } as any)
      .eq("id", user.id);
    if (error) console.warn("Presence update failed:", error.message);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Send immediately on mount
    updatePresence();

    // Then every minute
    const interval = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Also send on visibility change (tab focus)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, updatePresence]);
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
