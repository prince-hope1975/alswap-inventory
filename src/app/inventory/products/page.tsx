import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api, HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";

import { ProductActions } from "./product-actions";
import { ProductSearch } from "./product-search";
import { Money } from "./money";
import { InventoryStockBadge } from "./stock-badge";
import { productSearchReadiness } from "~/lib/seo/product-readiness";
import {
  hasActiveProductFilters,
  parseProductListParams,
  productListQuery,
} from "~/lib/domain/product-list-params";

const th =
  "px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400";

export default async function ProductsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseProductListParams(await props.searchParams);

  const [result, categories, session] = await Promise.all([
    api.inventory.listProducts({
      search: params.search,
      hasImage: params.hasImage,
      stock: params.stock,
      sort: params.sort,
      categoryId: params.categoryId,
      page: params.page,
    }),
    api.inventory.listCategories(),
    auth(),
  ]);
  const { items: products, total, page, pageSize } = result;
  const canDelete = session?.user?.role === "ADMIN";
  const filtered = hasActiveProductFilters(params);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(total, page * pageSize);

  const readiness = new Map(
    products.map((product) => [
      product.id,
      productSearchReadiness({
        name: product.name,
        description: product.description,
        image: product.image,
        images: product.images,
        categoryName: product.category?.name,
        brand: product.brand,
        sku: product.sku,
        gtin: product.gtin,
        mpn: product.mpn,
        price: product.salePrice ?? product.price,
        stockQuantity: product.stockQuantity,
      }),
    ]),
  );
  const readyCount = Array.from(readiness.values()).filter(
    (item) => item.ready,
  ).length;

  const emptyMessage = filtered ? (
    <>
      No products match these filters.{" "}
      <Link
        href="/inventory/products"
        className="font-medium text-[var(--brand-primary-600)] hover:underline dark:text-[var(--brand-primary-400)]"
      >
        Clear filters
      </Link>
    </>
  ) : (
    "No products yet. Add your first product to get started."
  );

  return (
    <HydrateClient>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Products
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {params.stock === "low"
                ? `${total} product${total === 1 ? "" : "s"} at or below the low stock threshold`
                : `${total} product${total === 1 ? "" : "s"}${filtered ? " match" : ""}`}
            </p>
          </div>
          <Link
            href="/inventory/products/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>

        <ProductSearch categories={categories} />

        {products.length > 0 && (
          <details className="group rounded-xl border border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <strong>
                  {readyCount}/{products.length}
                </strong>{" "}
                {pageCount > 1 ? "on this page are" : "are"} ready for search and
                shopping feeds
              </span>
              <span className="text-xs font-medium text-sky-700 group-open:hidden dark:text-sky-300">
                Why?
              </span>
            </summary>
            <p className="border-t border-sky-200 px-4 py-3 text-sm leading-6 text-sky-800 dark:border-sky-900 dark:text-sky-200">
              Prioritize active products missing an image, useful description,
              category, or brand/identifier. Price and availability must remain
              current. Hover a product&apos;s readiness score to see what is
              missing.
            </p>
          </details>
        )}

        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>SKU / Barcode</th>
                    <th className={th}>Category</th>
                    <th className={th}>Price</th>
                    <th className={th}>Stock</th>
                    <th className={th}>Search readiness</th>
                    <th className="relative px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const item = readiness.get(product.id)!;
                      return (
                        <tr
                          key={product.id}
                          className="relative hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3">
                            {/* Stretched link: the whole row opens the editor. */}
                            <Link
                              href={`/inventory/products/${product.id}`}
                              className="font-medium text-gray-900 after:absolute after:inset-0 hover:text-[var(--brand-primary-700)] focus-visible:underline focus-visible:outline-none dark:text-white dark:hover:text-[var(--brand-primary-300)]"
                            >
                              {product.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>{product.sku ?? "-"}</span>
                              <span className="text-xs text-gray-400">
                                {product.barcode}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {product.category?.name ?? "Uncategorized"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white">
                            <PriceCell price={product.price} salePrice={product.salePrice} />
                          </td>
                          <td className="px-4 py-3">
                            <InventoryStockBadge
                              stockQuantity={product.stockQuantity}
                              lowStockThreshold={product.lowStockThreshold}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              title={
                                item.missing.length
                                  ? `Missing: ${item.missing.join(", ")}`
                                  : "Ready"
                              }
                              className={`relative z-10 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.ready ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"}`}
                            >
                              {item.ready
                                ? "Ready"
                                : `${item.completed}/${item.total}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                            <ProductActions
                              id={product.id}
                              name={product.name}
                              stockQuantity={product.stockQuantity}
                              canDelete={canDelete}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {products.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              products.map((product) => {
                const item = readiness.get(product.id)!;
                return (
                  <div
                    key={product.id}
                    className="relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/inventory/products/${product.id}`}
                          className="font-medium text-gray-900 after:absolute after:inset-0 dark:text-white"
                        >
                          {product.name}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.category?.name ?? "Uncategorized"}
                        </p>
                      </div>
                      <ProductActions
                        id={product.id}
                        name={product.name}
                        stockQuantity={product.stockQuantity}
                        canDelete={canDelete}
                      />
                    </div>
                    <p
                      className={`text-xs font-semibold ${item.ready ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                    >
                      {item.ready
                        ? "Search ready"
                        : `Search readiness ${item.completed}/${item.total}: ${item.missing.join(", ")}`}
                    </p>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          <PriceCell price={product.price} salePrice={product.salePrice} />
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          SKU: {product.sku ?? "-"}
                        </span>
                      </div>
                      <InventoryStockBadge
                        stockQuantity={product.stockQuantity}
                        lowStockThreshold={product.lowStockThreshold}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {total > 0 && (
            <nav
              aria-label="Pagination"
              className="flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row dark:text-gray-300"
            >
              <p>
                Showing {firstShown}–{lastShown} of {total}
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <PageLink
                    href={`/inventory/products${productListQuery({ ...params, page: page - 1 })}`}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </PageLink>
                  <span className="px-2 tabular-nums">
                    Page {page} of {pageCount}
                  </span>
                  <PageLink
                    href={`/inventory/products${productListQuery({ ...params, page: page + 1 })}`}
                    disabled={page >= pageCount}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </PageLink>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </HydrateClient>
  );
}

function PriceCell({ price, salePrice }: { price: string; salePrice: string | null }) {
  if (salePrice !== null && Number(salePrice) < Number(price)) {
    return (
      <span className="flex flex-col">
        <Money amount={salePrice} />
        <span className="text-xs font-normal text-gray-400 line-through">
          <Money amount={price} />
        </span>
      </span>
    );
  }
  return <Money amount={price} />;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium dark:border-gray-600 dark:bg-gray-800";
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${cls} cursor-not-allowed opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${cls} hover:bg-gray-50 dark:hover:bg-gray-700`}>
      {children}
    </Link>
  );
}
