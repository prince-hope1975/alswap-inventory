import Link from "next/link";

/**
 * Real `<a>` links to each department page so crawlers can reach them; the
 * in-grid category chips are client-side buttons. Rendered below the grid.
 */
export function CrawlableCategoryLinks({
  categories,
}: {
  categories: Array<{ id: number; name: string; slug: string | null }>;
}) {
  const linked = categories.filter(
    (category): category is typeof category & { slug: string } =>
      Boolean(category.slug),
  );
  if (!linked.length) return null;

  return (
    <nav
      aria-label="Product departments"
      className="border-t border-[#14212b]/15 bg-[#efece4] px-4 pt-8 pb-24 text-[#14212b] lg:pb-10 dark:border-white/10 dark:bg-[#0d161d] dark:text-white"
    >
      <div className="container mx-auto">
        <h2 className="mb-3 text-xs font-black tracking-[0.16em] text-[#07597d] uppercase dark:text-[#71b7d5]">
          Shop by department
        </h2>
        <ul className="flex flex-wrap gap-2">
          {linked.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex min-h-10 items-center rounded-full border border-[#14212b]/20 bg-white px-4 text-sm font-semibold transition hover:border-[#0b6e99] hover:text-[#07597d] dark:border-white/15 dark:bg-white/5 dark:hover:text-[#71b7d5]"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
        {/* Shopper navbar has no sign-in; staff still need a way in. */}
        <p className="mt-8 text-xs text-[#5c6870] dark:text-white/50">
          <Link href="/auth/signin" className="hover:underline">
            Staff login
          </Link>
        </p>
      </div>
    </nav>
  );
}
