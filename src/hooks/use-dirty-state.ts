import { useState, useEffect } from "react";

/**
 * Tracks whether a form has unsaved changes and shows the browser's
 * "Leave site?" dialog when the user tries to navigate away while dirty.
 */
function useDirtyState(initialValue = false) {
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

  const setDirty = (value: boolean) => setIsDirty(value);
  const markClean = () => setIsDirty(false);

  return { isDirty, setDirty, markClean };
}

export default useDirtyState;
