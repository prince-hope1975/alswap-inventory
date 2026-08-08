import Link from "next/link";

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
      className="border-y border-[#14212b]/15 bg-[#f5f3ed] px-4 py-4 text-[#14212b] dark:border-white/10 dark:bg-[#0a1117] dark:text-white"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 px-2 py-2 text-xs font-black tracking-[0.16em] text-[#07597d] uppercase dark:text-[#71b7d5]">
          Departments
        </span>
        {linked.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="shrink-0 border border-[#14212b]/25 bg-white px-4 py-2 text-sm font-bold transition hover:border-[#0b6e99] hover:text-[#07597d] dark:border-white/15 dark:bg-white/5 dark:hover:text-[#71b7d5]"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
