import { cn } from "~/lib/utils";

/** Grey pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded bg-gray-200 dark:bg-gray-700", className)} />;
}

/** Placeholder for a list/table while it loads. */
export function SkeletonRows({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/** Placeholder grid of stat cards. */
export function SkeletonCards({
  count = 3,
  label = "Loading",
  className = "md:grid-cols-3",
}: {
  count?: number;
  label?: string;
  /** Grid column classes. */
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={cn("grid gap-6", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
