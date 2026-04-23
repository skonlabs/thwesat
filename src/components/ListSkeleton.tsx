import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  /** How many placeholder cards to render. Defaults to 5. */
  count?: number;
  /** Layout variant. `card` mimics job/mentor cards, `row` mimics chat/notification rows. */
  variant?: "card" | "row";
}

/**
 * Structural skeleton placeholder for list pages. Renders the rough shape of
 * a card/row so the eventual content slots in without layout shift, instead
 * of showing a generic spinner.
 */
const ListSkeleton = ({ count = 5, variant = "card" }: ListSkeletonProps) => {
  const items = Array.from({ length: count });

  if (variant === "row") {
    return (
      <div className="divide-y divide-border" aria-busy="true" aria-live="polite">
        {items.map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-busy="true" aria-live="polite">
      {items.map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;
