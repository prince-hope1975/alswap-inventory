export default function CategoriesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading categories…</span>
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-gray-100 px-6 py-4 last:border-0 dark:border-gray-700"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
