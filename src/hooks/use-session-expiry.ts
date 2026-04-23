import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserSettings } from "@/hooks/use-user-settings";

const EXPIRY_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const STORAGE_KEY = "thwesat:last_activity_at";

/**
 * Enforces user-selected session expiry by tracking last activity time.
 * If the gap between now and last activity exceeds the chosen window,
 * the user is signed out on next visit/activity.
 *
 * Note: This is "idle expiry" — not absolute. Resets on every user input.
 */
export const useSessionExpiry = () => {
  const { user, signOut } = useAuth();
  const { data: settings } = useUserSettings();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      checkedRef.current = false;
      return;
    }
    const expiryKey = settings?.session_expiry || "24h";
    const windowMs = EXPIRY_MS[expiryKey] ?? EXPIRY_MS["24h"];

    // On mount/resume: check if last activity exceeded window — if so, sign out.
    if (!checkedRef.current) {
      checkedRef.current = true;
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (last && Date.now() - last > windowMs) {
        localStorage.removeItem(STORAGE_KEY);
        signOut();
        return;
      }
    }

    const stamp = () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    };
    stamp();

    // Throttle: only update once per minute on input
    let lastStamp = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastStamp > 60_000) {
        lastStamp = now;
        stamp();
      }
    };

    // Periodic idle check every minute
    const interval = window.setInterval(() => {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (last && Date.now() - last > windowMs) {
        localStorage.removeItem(STORAGE_KEY);
        signOut();
      }
    }, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
        if (last && Date.now() - last > windowMs) {
          localStorage.removeItem(STORAGE_KEY);
          signOut();
        } else {
          stamp();
        }
      }
    };

    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, settings?.session_expiry, signOut]);
};
