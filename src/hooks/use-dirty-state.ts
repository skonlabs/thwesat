import { useState, useEffect } from "react";

// Note: beforeunload is not reliable on mobile browsers (iOS Safari, Android Chrome).
// For mobile, consider persisting form state to sessionStorage as an additional safeguard.

/**
 * Tracks whether a form has unsaved changes and shows the browser's
 * "Leave site?" dialog when the user tries to navigate away while dirty.
 *
 * @param initialValue - Whether the form starts in a dirty state.
 * @param onPageHide   - Optional callback invoked when the page becomes hidden
 *                       (visibilitychange → "hidden"). Use this to trigger an
 *                       auto-save on mobile where beforeunload is unreliable.
 */
function useDirtyState(initialValue = false, onPageHide?: () => void) {
  const [isDirty, setIsDirty] = useState(initialValue);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show a generic message; setting returnValue is required
      // for some browsers to trigger the dialog at all.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Complementary visibilitychange listener for mobile browsers where
  // beforeunload does not fire reliably. When the page is hidden (e.g. user
  // switches apps or closes the tab on iOS), callers can auto-save via onPageHide.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isDirty) {
        // Opportunity to auto-save — caller should implement this via the onPageHide callback
        onPageHide?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isDirty, onPageHide]);

  const setDirty = (value: boolean) => setIsDirty(value);
  const markClean = () => setIsDirty(false);

  return { isDirty, setDirty, markClean };
}

export default useDirtyState;
