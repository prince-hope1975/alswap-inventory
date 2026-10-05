import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { db as appDb } from "~/server/db";
import { categories, productCategories, products } from "~/server/db/schema";
import { toRows } from "~/server/db/rows";
import { publicProductColumns, publicProductRelations } from "~/server/shop/public-product";
import {
  resolveShopSort,
  toDisplayCategoryName,
  type ShopSortOption,
} from "~/lib/domain/shop-filters";

type Database = typeof appDb;

export type BrowseInput = {
  search?: string;
  categoryId?: number;
  condition?: ("NEW" | "USED" | "REFURBISHED")[];
  sort?: ShopSortOption;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  limit: number;
  /** Offset into the result set; null/undefined = first page. */
  cursor?: number | null;
};

// Same rule as `effectiveUnitPrice` in the shop router: a non-negative
// salePrice wins over price.
const effectivePrice = sql`(CASE WHEN p."sale_price" IS NOT NULL AND p."sale_price" >= 0 THEN p."sale_price" ELSE p.price END)`;

function loadProductsInOrder(db: Database, ids: string[]) {
  return db.query.products.findMany({
    where: inArray(products.id, ids),
    // Public endpoint: never load cost, supplier or other internal columns.
    columns: publicProductColumns,
    with: publicProductRelations,
  });
}

type StorefrontProduct = Awaited<ReturnType<typeof loadProductsInOrder>>[number];

export type BrowseResult = {
  items: StorefrontProduct[];
  /** Matches for the full filter set (search, category, condition, price, stock). */
  total: number;
  /** Offset of the next page, or null when this page is the last. */
  nextCursor: number | null;
  /**
   * Highest effective price among products matching search/category/condition,
   * ignoring the price bounds, so the slider's max is the real catalogue max.
   */
  priceCeiling: number;
};

/**
 * One storefront grid page. Sort, price and stock filters run in SQL so
 * offset pagination stays consistent; every ORDER BY ends on `id` so ties
 * never duplicate or skip rows between pages.
 */
export async function browseStorefrontProducts(
  db: Database,
  tenantId: string,
  input: BrowseInput,
): Promise<BrowseResult> {
  const searchTerm = input.search?.trim() ? input.search.trim() : undefined;
  const sort = resolveShopSort(input.sort ?? null, Boolean(searchTerm));
  const offset = input.cursor ?? 0;
  const like = searchTerm ? `%${searchTerm}%` : "";

  const base: SQL[] = [
    sql`p."tenantId" = ${tenantId}`,
    sql`p.visibility = 'PUBLISHED'`,
  ];
  // Applied to every query below — missing it silently shows new stock on
  // the used surface.
  if (input.condition?.length) {
    base.push(
      sql`p.condition IN (${sql.join(
        input.condition.map((value) => sql`${value}`),
        sql`, `,
      )})`,
    );
  }
  if (input.categoryId) {
    base.push(sql`EXISTS (
      SELECT 1 FROM "alswap-inventory_product_category" pc
      WHERE pc."productId" = p.id AND pc."categoryId" = ${input.categoryId}
    )`);
  }
  if (searchTerm) {
    // Trigram similarity (fuzzy) with ILIKE fallback over name, description
    // and linked category names.
    base.push(sql`(
      p.name % ${searchTerm}
      OR COALESCE(p.description, '') % ${searchTerm}
      OR p.name ILIKE ${like}
      OR COALESCE(p.description, '') ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM "alswap-inventory_product_category" pc
        JOIN "alswap-inventory_category" c ON pc."categoryId" = c.id
        WHERE pc."productId" = p.id AND (c.name % ${searchTerm} OR c.name ILIKE ${like})
      )
    )`);
  }

  const narrowing: SQL[] = [];
  if (input.minPrice != null) narrowing.push(sql`${effectivePrice} >= ${input.minPrice}`);
  if (input.maxPrice != null) narrowing.push(sql`${effectivePrice} <= ${input.maxPrice}`);
  if (input.inStockOnly) {
    // -1 = untracked stock, treated as available.
    narrowing.push(sql`(p."stockQuantity" = -1 OR p."stockQuantity" > 0)`);
  }

  const baseWhere = sql.join(base, sql` AND `);
  const fullWhere = sql.join([...base, ...narrowing], sql` AND `);
  const narrowingWhere = narrowing.length ? sql.join(narrowing, sql` AND `) : sql`TRUE`;

  const relevance = searchTerm
    ? sql`GREATEST(
        COALESCE(similarity(p.name, ${searchTerm}), 0),
        COALESCE(similarity(COALESCE(p.description, ''), ${searchTerm}), 0),
        COALESCE((
          SELECT MAX(similarity(c.name, ${searchTerm}))
          FROM "alswap-inventory_product_category" pc
          JOIN "alswap-inventory_category" c ON pc."categoryId" = c.id
          WHERE pc."productId" = p.id
        ), 0)
      )`
    : sql`0`;

  const orderBy: Record<ShopSortOption, SQL> = {
    relevance: sql`${relevance} DESC, p."createdAt" DESC, p.id`,
    newest: sql`p."createdAt" DESC, p.id`,
    "price-asc": sql`${effectivePrice} ASC, p.id`,
    "price-desc": sql`${effectivePrice} DESC, p.id`,
    "name-asc": sql`lower(p.name) ASC, p.id`,
    "name-desc": sql`lower(p.name) DESC, p.id`,
  };

  const [pageResult, statsResult] = await Promise.all([
    db.execute(sql`
      SELECT p.id
      FROM "alswap-inventory_product" p
      WHERE ${fullWhere}
      ORDER BY ${orderBy[sort]}
      LIMIT ${input.limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE ${narrowingWhere}) AS total,
        MAX(${effectivePrice}) AS ceiling
      FROM "alswap-inventory_product" p
      WHERE ${baseWhere}
    `),
  ]);

  const ids = toRows<{ id: string }>(pageResult).map((row) => row.id);
  const stats = toRows<{ total: string | number | null; ceiling: string | number | null }>(
    statsResult,
  )[0];
  const total = Number(stats?.total ?? 0) || 0;
  const priceCeiling = Math.ceil(Number(stats?.ceiling ?? 0) || 0);

  const loaded = ids.length ? await loadProductsInOrder(db, ids) : [];
  const byId = new Map(loaded.map((product) => [product.id, product]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((product): product is StorefrontProduct => product !== undefined);

  const consumed = offset + ids.length;
  return {
    items,
    total,
    nextCursor: ids.length > 0 && consumed < total ? consumed : null,
    priceCeiling,
  };
}

export function emptyBrowseResult(): BrowseResult {
  return { items: [], total: 0, nextCursor: null, priceCeiling: 0 };
}

/**
 * Storefront departments: only categories with at least one published
 * product (same junction-table rule as the product filter), ordered by name,
 * with counts and display-cased names.
 */
export async function listStorefrontCategories(db: Database, tenantId: string) {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`count(distinct ${products.id})`,
    })
    .from(categories)
    .innerJoin(productCategories, eq(productCategories.categoryId, categories.id))
    .innerJoin(
      products,
      and(
        eq(products.id, productCategories.productId),
        eq(products.tenantId, tenantId),
        eq(products.visibility, "PUBLISHED"),
      ),
    )
    .where(eq(categories.tenantId, tenantId))
    .groupBy(categories.id)
    .orderBy(sql`lower(${categories.name})`, categories.id);

  return rows.map((row) => ({
    ...row,
    name: toDisplayCategoryName(row.name),
    productCount: Number(row.productCount) || 0,
  }));
}
