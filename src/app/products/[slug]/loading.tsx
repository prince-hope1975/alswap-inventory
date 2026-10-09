export default function ProductLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading product"
      className="min-h-screen bg-[#f3f0e8] dark:bg-[#0a1117]"
    >
      <div className="h-20 border-b border-stone-300/60 dark:border-white/10" />
      <div className="mx-auto max-w-7xl animate-pulse px-5 py-8 sm:px-8">
        <div className="h-6 w-32 rounded bg-stone-300/70 dark:bg-white/10" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-[2rem] bg-stone-300/70 dark:bg-white/10" />
          <div className="space-y-5 py-4 lg:py-10">
            <div className="h-4 w-40 rounded bg-stone-300/70 dark:bg-white/10" />
            <div className="h-12 w-3/4 rounded bg-stone-300/70 dark:bg-white/10" />
            <div className="h-9 w-40 rounded bg-stone-300/70 dark:bg-white/10" />
            <div className="h-24 w-full rounded bg-stone-300/70 dark:bg-white/10" />
            <div className="flex gap-3">
              <div className="h-14 w-36 rounded-full bg-stone-300/70 dark:bg-white/10" />
              <div className="h-14 w-36 rounded-full bg-stone-300/70 dark:bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
