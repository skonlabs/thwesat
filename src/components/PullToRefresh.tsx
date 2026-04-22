import { useEffect, useRef, useState, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<unknown>;
  children: ReactNode;
  /** Distance the user must drag before a refresh fires. */
  threshold?: number;
  /** Maximum distance the indicator will travel. */
  maxPull?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Mobile-first pull-to-refresh wrapper. Activates only when the page is
 * scrolled to the very top and the user drags downward with a touch input.
 */
const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
  maxPull = 120,
  className,
  disabled = false,
}: PullToRefreshProps) => {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;

    const atTop = () =>
      (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || !atTop()) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current == null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Damp the pull so it feels rubbery
      const next = Math.min(maxPull, delta * 0.5);
      setPull(next);
      if (next > 6 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const triggered = pull >= threshold;
      startY.current = null;

      if (triggered) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove as EventListener);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, maxPull, onRefresh, pull, refreshing, threshold]);

  const progress = Math.min(1, pull / threshold);
  const showIndicator = pull > 4 || refreshing;

  return (
    <div className={className} style={{ position: "relative" }}>
      <div
        aria-hidden={!showIndicator}
        className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2"
        style={{
          opacity: showIndicator ? 1 : 0,
          transform: `translate(-50%, ${Math.max(0, pull - 24)}px)`,
          transition: refreshing || pulling.current ? "none" : "all 200ms ease",
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm">
          <RefreshCw
            className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={2}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: refreshing ? "none" : "transform 80ms linear",
            }}
          />
        </div>
      </div>
      <div
        style={{
          paddingTop: `${pull}px`,
          transition: refreshing || pulling.current ? "none" : "padding-top 200ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
