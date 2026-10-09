import { z } from "zod";
import { createSlug } from "~/lib/domain/slug";

import { createTRPCRouter, managerProcedure, tenantProcedure } from "~/server/api/trpc";
import {
  products,
  categories,
  orders,
  orderItems,
  productCategories,
  productVariants,
  inventoryMovements,
  purchaseOrderItems,
} from "~/server/db/schema";
import {
  eq,
  and,
  asc,
  desc,
  ne,
  or,
  ilike,
  sql,
  gte,
  inArray,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  PRODUCT_LIST_PAGE_SIZE,
  PRODUCT_LIST_SORTS,
  PRODUCT_LIST_STOCK,
} from "~/lib/domain/product-list-params";
import { computeStockAdjustment, nextVariantStock } from "~/lib/domain/stock-adjust";
import { countsAsSaleSql } from "~/server/orders/sales-filter";
import { bulkDeleteInput, bulkSetCategoryInput } from "~/lib/domain/bulk-products";

/**
 * Tracked (>= 0) and at or below the threshold (default 5). Shared by the
 * low-stock alert, the dashboard count and `listProducts?stock=low` so they
 * always agree. Mirrors `stockStatus` in product-list-params.
 */
function lowStockPredicate() {
  return sql`${products.stockQuantity} >= 0 and ${products.stockQuantity} <= coalesce(${products.lowStockThreshold}, ${DEFAULT_LOW_STOCK_THRESHOLD})`;
}

const productConditionInput = z.enum(["NEW", "USED", "REFURBISHED"]);
const productVisibilityInput = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const inventoryRouter = createTRPCRouter({
  // --- Categories ---

  createCategory: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db
        .insert(categories)
        .values({
          name: input.name,
          slug: `${createSlug(input.name)}-${crypto.randomUUID().slice(0, 6)}`,
          description: input.description?.trim()
            ? input.description.trim()
            : null,
          tenantId: ctx.tenantId,
        })
        .returning();
    }),

  listCategories: managerProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      where: eq(categories.tenantId, ctx.tenantId),
      orderBy: desc(categories.id),
    });
  }),

  updateCategory: managerProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db
        .update(categories)
        .set({
          name: input.name,
          description: input.description?.trim()
            ? input.description.trim()
            : null,
        })
        .where(
          and(
            eq(categories.id, input.id),
            eq(categories.tenantId, ctx.tenantId),
          ),
        );
    }),

  deleteCategory: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db
        .delete(categories)
        .where(
          and(
            eq(categories.id, input.id),
            eq(categories.tenantId, ctx.tenantId),
          ),
        );
    }),

  // --- Products ---

  validateImageUrl: managerProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, { method: "HEAD" });
        const contentType = response.headers.get("content-type");

        if (!response.ok) {
          return { isValid: false, error: "URL is not reachable" };
        }

        if (!contentType?.startsWith("image/")) {
          return { isValid: false, error: "URL does not point to an image" };
        }

        return { isValid: true, contentType };
      } catch {
        return { isValid: false, error: "Failed to validate URL" };
      }
    }),

  createProduct: managerProcedure
    .input(
      z
        .object({
          name: z.string().min(1),
          description: z.string().optional(),
          image: z.string().url().optional().or(z.literal("")),
          images: z.array(z.string().url()).optional(),
          categoryId: z.number().optional(), // Primary category (backward compat)
          categoryIds: z.array(z.number()).optional(), // Multiple categories
          barcode: z.string().optional(),
          sku: z.string().optional(),
          price: z.number().min(0),
          salePrice: z.number().min(0).optional().nullable(),
          costPrice: z.number().min(0),
          stockQuantity: z.number().int().min(-1).default(0), // -1 = unknown quantity
          lowStockThreshold: z.number().int().default(5),
          condition: productConditionInput.default("NEW"),
          conditionNotes: z.string().optional(),
          visibility: productVisibilityInput.default("PUBLISHED"),
          brand: z.string().optional(),
          gtin: z.string().max(14).optional(),
          mpn: z.string().max(70).optional(),
          googleProductCategory: z.string().optional(),
          feedEligible: z.boolean().default(true),
          serialNumber: z.string().optional(),
          warrantyMonths: z.number().int().min(0).optional(),
        })
    )
    .mutation(async ({ ctx, input }) => {
      // Insert product
      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          name: input.name,
          slug: `${createSlug(input.name)}-${crypto.randomUUID().slice(0, 6)}`,
          description: input.description || null,
          image: input.image || null,
          images: input.images || null,
          categoryId: input.categoryId, // Keep for backward compatibility
          barcode: input.barcode,
          sku: input.sku,
          price: input.price.toString(),
          salePrice: input.salePrice?.toString() ?? null,
          costPrice: input.costPrice.toString(),
          stockQuantity: input.stockQuantity,
          lowStockThreshold: input.lowStockThreshold,
          condition: input.condition,
          conditionNotes: input.conditionNotes || null,
          visibility: input.visibility,
          brand: input.brand || null,
          gtin: input.gtin || null,
          mpn: input.mpn || null,
          googleProductCategory: input.googleProductCategory || null,
          feedEligible: input.feedEligible,
          serialNumber: input.serialNumber || null,
          warrantyMonths: input.warrantyMonths ?? null,
          tenantId: ctx.tenantId,
        })
        .returning();

      if (!newProduct) {
        throw new Error("Failed to create product");
      }

      await ctx.db.insert(productVariants).values({
        tenantId: ctx.tenantId,
        productId: newProduct.id,
        name: "Default",
        sku: input.sku,
        barcode: input.barcode,
        retailPrice: input.price.toString(),
        averageUnitCost: input.costPrice.toString(),
        stockQuantity: input.stockQuantity.toString(),
      });

      // Insert category associations (many-to-many)
      const categoryIdsToInsert = new Set<number>();

      // Add primary category if provided
      if (input.categoryId) {
        categoryIdsToInsert.add(input.categoryId);
      }

      // Add additional categories
      if (input.categoryIds && input.categoryIds.length > 0) {
        input.categoryIds.forEach((id) => categoryIdsToInsert.add(id));
      }

      if (categoryIdsToInsert.size > 0) {
        await ctx.db.insert(productCategories).values(
          Array.from(categoryIdsToInsert).map((categoryId) => ({
            productId: newProduct.id,
            categoryId,
          })),
        );
      }

      return newProduct;
    }),

  listProducts: managerProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          hasImage: z.boolean().optional(),
          stock: z.enum(PRODUCT_LIST_STOCK).optional(),
          sort: z.enum(PRODUCT_LIST_SORTS).default("newest"),
          categoryId: z.number().int().positive().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(PRODUCT_LIST_PAGE_SIZE),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search;
      const hasImage = input?.hasImage;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? PRODUCT_LIST_PAGE_SIZE;
      const whereConditions = [eq(products.tenantId, ctx.tenantId)];

      if (search) {
        whereConditions.push(
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.sku, `%${search}%`),
            ilike(products.barcode, `%${search}%`),
          )!,
        );
      }

      if (hasImage !== undefined) {
        if (hasImage) {
          whereConditions.push(
            and(
              sql`${products.image} IS NOT NULL`,
              sql`${products.image} != ''`,
            )!,
          );
        } else {
          whereConditions.push(
            or(sql`${products.image} IS NULL`, eq(products.image, ""))!,
          );
        }
      }

      if (input?.stock === "low") whereConditions.push(lowStockPredicate());
      if (input?.stock === "out") whereConditions.push(eq(products.stockQuantity, 0));
      if (input?.stock === "untracked") whereConditions.push(eq(products.stockQuantity, -1));

      if (input?.categoryId) {
        whereConditions.push(
          or(
            eq(products.categoryId, input.categoryId),
            // A subquery builder (not raw sql) so the relational query's
            // root-table aliasing doesn't rewrite productCategories columns.
            inArray(
              products.id,
              ctx.db
                .select({ id: productCategories.productId })
                .from(productCategories)
                .where(eq(productCategories.categoryId, input.categoryId)),
            ),
          )!,
        );
      }

      const where = and(...whereConditions);
      const orderBy = {
        newest: [desc(products.createdAt)],
        name: [asc(products.name)],
        // Untracked (-1) last: "unknown" is not "less than zero". Mirrors compareStockAsc.
        "stock-asc": [asc(sql`(${products.stockQuantity} < 0)`), asc(products.stockQuantity), asc(products.name)],
        "stock-desc": [desc(products.stockQuantity), asc(products.name)],
        "price-asc": [asc(products.price), asc(products.name)],
        "price-desc": [desc(products.price), asc(products.name)],
      }[input?.sort ?? "newest"];

      const [items, [totalRow]] = await Promise.all([
        ctx.db.query.products.findMany({
          where,
          with: {
            category: true,
            productCategories: {
              with: {
                category: true,
              },
            },
          },
          orderBy,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        ctx.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
      ]);

      return { items, total: Number(totalRow?.count ?? 0), page, pageSize };
    }),

  getProduct: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.id),
          eq(products.tenantId, ctx.tenantId),
        ),
        with: {
          category: true,
          productCategories: {
            with: {
              category: true,
            },
          },
        },
      });
    }),

  updateProduct: managerProcedure
    .input(
      z
        .object({
          id: z.string(),
          name: z.string().min(1).optional(),
          // Deliberately NOT derived from `name`: the slug is the product's
          // public URL, and silently rewriting it on every rename would
          // break inbound links and discard accumulated ranking. Callers
          // must opt in to a URL change.
          slug: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          image: z.string().url().optional().or(z.literal("")),
          images: z.array(z.string().url()).optional(),
          categoryId: z.number().optional(), // Primary category (backward compat)
          categoryIds: z.array(z.number()).optional(), // Multiple categories - replaces existing
          barcode: z.string().optional(),
          sku: z.string().optional(),
          price: z.number().min(0).optional(),
          salePrice: z.number().min(0).optional().nullable(),
          costPrice: z.number().min(0).optional(),
          // No stockQuantity: stock only changes through updateStock (which
          // writes an inventory movement), sales, and order status changes.
          // zod strips the key if an old client still sends it.
          lowStockThreshold: z.number().int().optional(),
          condition: productConditionInput.optional(),
          conditionNotes: z.string().optional(),
          visibility: productVisibilityInput.optional(),
          brand: z.string().optional(),
          gtin: z.string().max(14).optional(),
          mpn: z.string().max(70).optional(),
          googleProductCategory: z.string().optional(),
          feedEligible: z.boolean().optional(),
          serialNumber: z.string().optional(),
          warrantyMonths: z.number().int().min(0).optional(),
        })
    )
    .mutation(async ({ ctx, input }) => {
      // Ownership first: the category-link rewrite and the final read below
      // are keyed by product id alone.
      const owned = await ctx.db.query.products.findFirst({
        where: and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)),
        columns: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.slug !== undefined) {
        const slug = createSlug(input.slug);
        if (!slug) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a URL slug with at least one letter or number.",
          });
        }
        const clash = await ctx.db.query.products.findFirst({
          where: and(
            eq(products.tenantId, ctx.tenantId),
            eq(products.slug, slug),
            ne(products.id, input.id),
          ),
          columns: { id: true },
        });
        if (clash) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another product already uses that URL slug.",
          });
        }
        updateData.slug = slug;
      }
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.image !== undefined) updateData.image = input.image || null;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.categoryId !== undefined)
        updateData.categoryId = input.categoryId;
      if (input.barcode !== undefined) updateData.barcode = input.barcode;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.price !== undefined) updateData.price = input.price.toString();
      if (input.salePrice !== undefined)
        updateData.salePrice = input.salePrice?.toString() ?? null;
      if (input.costPrice !== undefined)
        updateData.costPrice = input.costPrice.toString();
      if (input.lowStockThreshold !== undefined)
        updateData.lowStockThreshold = input.lowStockThreshold;
      if (input.condition !== undefined) updateData.condition = input.condition;
      if (input.conditionNotes !== undefined)
        updateData.conditionNotes = input.conditionNotes || null;
      if (input.visibility !== undefined)
        updateData.visibility = input.visibility;
      if (input.brand !== undefined) updateData.brand = input.brand || null;
      if (input.gtin !== undefined) updateData.gtin = input.gtin || null;
      if (input.mpn !== undefined) updateData.mpn = input.mpn || null;
      if (input.googleProductCategory !== undefined)
        updateData.googleProductCategory = input.googleProductCategory || null;
      if (input.feedEligible !== undefined)
        updateData.feedEligible = input.feedEligible;
      if (input.serialNumber !== undefined)
        updateData.serialNumber = input.serialNumber || null;
      if (input.warrantyMonths !== undefined)
        updateData.warrantyMonths = input.warrantyMonths;

      // Update product
      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(products)
          .set(updateData)
          .where(
            and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)),
          );
      }

      // Update category associations if categoryIds provided
      if (input.categoryIds !== undefined) {
        // Delete existing associations
        await ctx.db
          .delete(productCategories)
          .where(eq(productCategories.productId, input.id));

        // Insert new associations
        const categoryIdsToInsert = new Set<number>();

        // Add primary category if provided
        if (input.categoryId !== undefined) {
          categoryIdsToInsert.add(input.categoryId);
        }

        // Add additional categories
        input.categoryIds.forEach((id) => categoryIdsToInsert.add(id));

        if (categoryIdsToInsert.size > 0) {
          await ctx.db.insert(productCategories).values(
            Array.from(categoryIdsToInsert).map((categoryId) => ({
              productId: input.id,
              categoryId,
            })),
          );
        }
      }

      return ctx.db.query.products.findFirst({
        where: and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)),
        with: {
          category: true,
          productCategories: {
            with: {
              category: true,
            },
          },
        },
      });
    }),

  deleteProduct: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Product categories will be deleted automatically due to CASCADE
      return ctx.db
        .delete(products)
        .where(
          and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)),
        );
    }),

  /**
   * Sets one category on many products: it becomes their primary category
   * and their only category link. Tenant-scoped on both the products and the
   * category; ids not owned by the tenant are ignored.
   */
  bulkSetCategory: managerProcedure.input(bulkSetCategoryInput).mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const category = await tx.query.categories.findFirst({
        where: and(eq(categories.id, input.categoryId), eq(categories.tenantId, ctx.tenantId)),
        columns: { id: true, name: true },
      });
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });

      const owned = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.tenantId, ctx.tenantId), inArray(products.id, input.ids)));
      const ids = owned.map((p) => p.id);
      if (ids.length === 0) return { updated: 0, categoryName: category.name };

      await tx.update(products).set({ categoryId: category.id }).where(and(eq(products.tenantId, ctx.tenantId), inArray(products.id, ids)));
      // productCategories has no tenantId: scope it through the owned ids.
      await tx.delete(productCategories).where(inArray(productCategories.productId, ids));
      await tx.insert(productCategories).values(ids.map((productId) => ({ productId, categoryId: category.id })));
      return { updated: ids.length, categoryName: category.name };
    });
  }),

  /**
   * ADMIN-only bulk delete. Products with sales, purchase-order or stock
   * movement history are kept (those rows reference them) and reported as
   * skipped instead of failing the whole batch.
   */
  bulkDeleteProducts: tenantProcedure.input(bulkDeleteInput).mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.tenantId, ctx.tenantId), inArray(products.id, input.ids)));
      const ids = owned.map((p) => p.id);
      if (ids.length === 0) return { deleted: 0, skipped: 0 };

      const [sold, purchased, moved] = await Promise.all([
        tx.selectDistinct({ id: orderItems.productId }).from(orderItems).where(inArray(orderItems.productId, ids)),
        tx.selectDistinct({ id: purchaseOrderItems.productId }).from(purchaseOrderItems).where(inArray(purchaseOrderItems.productId, ids)),
        tx
          .selectDistinct({ id: productVariants.productId })
          .from(inventoryMovements)
          .innerJoin(productVariants, eq(productVariants.id, inventoryMovements.productVariantId))
          .where(and(eq(inventoryMovements.tenantId, ctx.tenantId), inArray(productVariants.productId, ids))),
      ]);
      const blocked = new Set([...sold, ...purchased, ...moved].map((r) => r.id));
      const deletable = ids.filter((id) => !blocked.has(id));
      if (deletable.length > 0) {
        await tx.delete(products).where(and(eq(products.tenantId, ctx.tenantId), inArray(products.id, deletable)));
      }
      return { deleted: deletable.length, skipped: ids.length - deletable.length };
    });
  }),

  getLowStockProducts: managerProcedure.query(async ({ ctx }) => {
    return ctx.db.query.products.findMany({
      where: and(eq(products.tenantId, ctx.tenantId), lowStockPredicate()),
      with: {
        category: true,
        productCategories: {
          with: {
            category: true,
          },
        },
      },
      limit: 20,
      orderBy: [asc(products.stockQuantity), asc(products.name)],
    });
  }),

  /**
   * Quick stock adjustment from the products list. Writes an inventory
   * movement alongside the new count (same ledger documents.approve uses), so
   * every change is attributable to a user and a reason.
   */
  updateStock: managerProcedure
    .input(
      z.object({
        id: z.string(),
        mode: z.enum(["receive", "remove", "set"]),
        amount: z.number().int().min(0).max(1_000_000),
        reason: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const product = await tx.query.products.findFirst({
          where: and(
            eq(products.id, input.id),
            eq(products.tenantId, ctx.tenantId),
          ),
          columns: { id: true, name: true, sku: true, barcode: true, price: true, costPrice: true, stockQuantity: true },
        });
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        }

        const result = computeStockAdjustment({
          current: product.stockQuantity,
          mode: input.mode,
          amount: input.amount,
        });
        if (!result.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        if (result.noop) {
          return { success: true, newQuantity: result.newQuantity, changed: false };
        }

        const variants = await tx.query.productVariants.findMany({
          where: and(
            eq(productVariants.productId, product.id),
            eq(productVariants.tenantId, ctx.tenantId),
          ),
          columns: { id: true, stockQuantity: true },
          limit: 2,
        });
        if (variants.length > 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This product has several variants. Adjust stock per variant instead.",
          });
        }

        let variant = variants[0];
        if (!variant) {
          // Products created before variants existed: give them the Default
          // variant now. Skip sku/barcode when another variant already holds
          // them (unique per tenant).
          const [skuClash, barcodeClash] = await Promise.all([
            product.sku
              ? tx.query.productVariants.findFirst({
                  where: and(eq(productVariants.tenantId, ctx.tenantId), eq(productVariants.sku, product.sku)),
                  columns: { id: true },
                })
              : undefined,
            product.barcode
              ? tx.query.productVariants.findFirst({
                  where: and(eq(productVariants.tenantId, ctx.tenantId), eq(productVariants.barcode, product.barcode)),
                  columns: { id: true },
                })
              : undefined,
          ]);
          const [created] = await tx
            .insert(productVariants)
            .values({
              tenantId: ctx.tenantId,
              productId: product.id,
              name: "Default",
              sku: skuClash ? null : product.sku,
              barcode: barcodeClash ? null : product.barcode,
              retailPrice: product.price,
              averageUnitCost: product.costPrice ?? "0",
              stockQuantity: Math.max(0, product.stockQuantity).toString(),
            })
            .returning({ id: productVariants.id, stockQuantity: productVariants.stockQuantity });
          if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          variant = created;
        }

        await tx
          .update(products)
          .set({ stockQuantity: result.newQuantity })
          .where(and(eq(products.id, product.id), eq(products.tenantId, ctx.tenantId)));
        await tx
          .update(productVariants)
          .set({ stockQuantity: nextVariantStock(variant.stockQuantity, result.delta) })
          .where(and(eq(productVariants.id, variant.id), eq(productVariants.tenantId, ctx.tenantId)));
        await tx.insert(inventoryMovements).values({
          tenantId: ctx.tenantId,
          productVariantId: variant.id,
          type: result.movementType,
          quantityDelta: result.delta.toString(),
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: product.id,
          reason: input.reason?.length ? input.reason : null,
          createdByUserId: ctx.session.user.id,
        });

        return { success: true, newQuantity: result.newQuantity, changed: true };
      });
    }),

  bulkCreateProducts: managerProcedure
    .input(
      z.object({
        products: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            image: z.string().url().optional().or(z.literal("")),
            images: z.array(z.string().url()).optional(),
            categoryId: z.number().optional(),
            categoryIds: z.array(z.number()).optional(),
            barcode: z.string().optional(),
            sku: z.string().optional(),
            price: z.number().min(0),
            salePrice: z.number().min(0).optional().nullable(),
            costPrice: z.number().min(0),
            stockQuantity: z.number().int().min(-1).default(0), // -1 = unknown quantity
            lowStockThreshold: z.number().int().default(5),
            condition: productConditionInput.default("NEW"),
            brand: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const productsToInsert = input.products.map((product) => ({
        name: product.name,
        slug: `${createSlug(product.name)}-${crypto.randomUUID().slice(0, 6)}`,
        description: product.description || null,
        image: product.image || null,
        images: product.images || null,
        categoryId: product.categoryId,
        barcode: product.barcode,
        sku: product.sku,
        price: product.price.toString(),
        salePrice: product.salePrice?.toString() ?? null,
        costPrice: product.costPrice.toString(),
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        condition: product.condition,
        brand: product.brand || null,
        tenantId: ctx.tenantId,
      }));

      const insertedProducts = await ctx.db
        .insert(products)
        .values(productsToInsert)
        .returning();

      if (insertedProducts.length > 0) {
        await ctx.db.insert(productVariants).values(
          insertedProducts.map((product, index) => {
            const source = input.products[index]!;
            return {
              tenantId: ctx.tenantId,
              productId: product.id,
              name: "Default",
              sku: source.sku,
              barcode: source.barcode,
              retailPrice: source.price.toString(),
              averageUnitCost: source.costPrice.toString(),
              stockQuantity: source.stockQuantity.toString(),
            };
          }),
        );
      }

      // Insert category associations for each product
      const categoryAssociations: { productId: string; categoryId: number }[] =
        [];

      insertedProducts.forEach((product, index) => {
        const inputProduct = input.products[index];
        if (!inputProduct) return;

        const categoryIdsToInsert = new Set<number>();

        if (inputProduct.categoryId) {
          categoryIdsToInsert.add(inputProduct.categoryId);
        }

        if (inputProduct.categoryIds) {
          inputProduct.categoryIds.forEach((id) => categoryIdsToInsert.add(id));
        }

        categoryIdsToInsert.forEach((categoryId) => {
          categoryAssociations.push({
            productId: product.id,
            categoryId,
          });
        });
      });

      if (categoryAssociations.length > 0) {
        await ctx.db.insert(productCategories).values(categoryAssociations);
      }

      return insertedProducts;
    }),

  // --- Product Categories Management ---

  addProductCategories: managerProcedure
    .input(
      z.object({
        productId: z.string(),
        categoryIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to tenant
      const product = await ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.productId),
          eq(products.tenantId, ctx.tenantId),
        ),
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // Insert new associations (ignore duplicates)
      const values = input.categoryIds.map((categoryId) => ({
        productId: input.productId,
        categoryId,
      }));

      await ctx.db
        .insert(productCategories)
        .values(values)
        .onConflictDoNothing();

      return { success: true };
    }),

  removeProductCategory: managerProcedure
    .input(
      z.object({
        productId: z.string(),
        categoryId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product belongs to tenant
      const product = await ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.productId),
          eq(products.tenantId, ctx.tenantId),
        ),
      });

      if (!product) {
        throw new Error("Product not found");
      }

      await ctx.db
        .delete(productCategories)
        .where(
          and(
            eq(productCategories.productId, input.productId),
            eq(productCategories.categoryId, input.categoryId),
          ),
        );

      return { success: true };
    }),

  getProductsByCategory: managerProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get product IDs in this category
      const productIdsInCategory = await ctx.db
        .selectDistinct({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, input.categoryId));

      const pIds = productIdsInCategory.map((p) => p.productId);

      if (pIds.length === 0) return [];

      return ctx.db.query.products.findMany({
        where: and(
          eq(products.tenantId, ctx.tenantId),
          inArray(products.id, pIds),
        ),
        with: {
          category: true,
          productCategories: {
            with: {
              category: true,
            },
          },
        },
        orderBy: desc(products.createdAt),
      });
    }),

  getDashboardStats: managerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Products
    const [totalProducts] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    // 1b. Products with unknown quantity
    const [unknownQuantityProducts] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(eq(products.tenantId, tenantId), eq(products.stockQuantity, -1)),
      );

    // 2. Low Stock (exclude unknown quantities)
    const [lowStock] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(eq(products.tenantId, tenantId), lowStockPredicate()),
      );

    // 3a. Confirmed Total Value (only products with known quantities >= 0)
    const [totalValueConfirmed] = await ctx.db
      .select({
        value: sql<number>`sum(${products.price} * ${products.stockQuantity})`,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          sql`${products.stockQuantity} >= 0`,
        ),
      );

    // 3b. Estimated Total Value (treating unknown as 0, so same as confirmed)
    // In the future, you could add logic to estimate unknown quantities
    const [totalValueEstimated] = await ctx.db
      .select({
        value: sql<number>`sum(${products.price} * CASE WHEN ${products.stockQuantity} = -1 THEN 0 ELSE ${products.stockQuantity} END)`,
      })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    // 4. Sales Today
    const [salesToday] = await ctx.db
      .select({
        amount: sql<number>`sum(${orders.totalAmount})`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql(), gte(orders.createdAt, today)));

    // 5. Recent Activity (Orders)
    const recentActivity = await ctx.db.query.orders.findMany({
      where: and(eq(orders.tenantId, tenantId), countsAsSaleSql()),
      orderBy: desc(orders.createdAt),
      limit: 5,
      with: {
        customer: true,
      },
    });

    // 6. Top Selling Items
    // This requires aggregation on orderItems
    const topSelling = await ctx.db
      .select({
        productId: orderItems.productId,
        name: products.name,
        category: categories.name,
        totalSold: sql<number>`sum(${orderItems.quantity})`,
        totalRevenue: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql()))
      .groupBy(orderItems.productId, products.name, categories.name)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    return {
      totalProducts: totalProducts?.count ?? 0,
      productsWithUnknownQuantity: unknownQuantityProducts?.count ?? 0,
      lowStock: lowStock?.count ?? 0,
      totalValueConfirmed: totalValueConfirmed?.value ?? 0,
      totalValueEstimated: totalValueEstimated?.value ?? 0,
      salesToday: salesToday?.amount ?? 0,
      recentActivity,
      topSelling,
    };
  }),

  // --- Duplicate Detection ---

  findSimilarProducts: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        threshold: z.number().min(0).max(1).default(0.7),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all products for this tenant
      const allProducts = await ctx.db.query.products.findMany({
        where: eq(products.tenantId, ctx.tenantId),
        with: {
          category: true,
        },
      });

      // Import fuzzy match utility
      const { similarityScore } = await import("~/lib/fuzzy-match");

      // Calculate similarity for each product
      const similarProducts = allProducts
        .map((product) => ({
          ...product,
          similarity: similarityScore(input.name, product.name),
        }))
        .filter((product) => product.similarity >= input.threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, input.limit);

      return similarProducts;
    }),

  checkDuplicates: managerProcedure
    .input(
      z.object({
        names: z.array(z.string()),
      }),
    )

    .query(async ({ ctx, input }) => {
      const allProducts = await ctx.db.query.products.findMany({
        where: eq(products.tenantId, ctx.tenantId),
      });

      // Create map of lowercase name -> product
      const duplicates: Record<
        string,
        {
          id: string;
          name: string;
          sku?: string | null;
          price: string;
          stockQuantity: number;
        }
      > = {};

      for (const inputName of input.names) {
        const normalizedInput = inputName.toLowerCase().trim();
        const match = allProducts.find(
          (p) => p.name.toLowerCase().trim() === normalizedInput,
        );
        if (match) {
          duplicates[inputName] = {
            id: match.id,
            name: match.name,
            sku: match.sku,
            price: match.price,
            stockQuantity: match.stockQuantity,
          };
        }
      }

      return duplicates;
    }),
  checkDuplicatesMutation: managerProcedure
    .input(
      z.object({
        names: z.array(z.string()),
      }),
    )

    .mutation(async ({ ctx, input }) => {
      const allProducts = await ctx.db.query.products.findMany({
        where: eq(products.tenantId, ctx.tenantId),
      });

      // Create map of lowercase name -> product
      const duplicates: Record<
        string,
        {
          id: string;
          name: string;
          sku?: string | null;
          price: string;
          stockQuantity: number;
        }
      > = {};

      for (const inputName of input.names) {
        const normalizedInput = inputName.toLowerCase().trim();
        const match = allProducts.find(
          (p) => p.name.toLowerCase().trim() === normalizedInput,
        );
        if (match) {
          duplicates[inputName] = {
            id: match.id,
            name: match.name,
            sku: match.sku,
            price: match.price,
            stockQuantity: match.stockQuantity,
          };
        }
      }

      return duplicates;
    }),
  mergeProduct: managerProcedure
    .input(
      z.object({
        existingId: z.string(),
        newData: z.object({
          price: z.number().min(0).optional(),
          costPrice: z.number().min(0).optional(),
          stockQuantity: z.number().int().min(-1).optional(),
          description: z.string().optional(),
          image: z.string().url().optional().or(z.literal("")),
          images: z.array(z.string().url()).optional(),
          categoryId: z.number().optional(),
          categoryIds: z.array(z.number()).optional(),
          sku: z.string().optional(),
          barcode: z.string().optional(),
        }),
        mergeStrategy: z
          .enum(["add_stock", "replace_all", "update_price_only"])
          .default("add_stock"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.products.findFirst({
        where: and(
          eq(products.id, input.existingId),
          eq(products.tenantId, ctx.tenantId),
        ),
      });

      if (!existing) {
        throw new Error("Product not found");
      }

      const updateData: Record<string, unknown> = {};

      if (input.mergeStrategy === "add_stock") {
        // Add to existing stock
        if (
          input.newData.stockQuantity !== undefined &&
          input.newData.stockQuantity >= 0
        ) {
          updateData.stockQuantity =
            existing.stockQuantity >= 0
              ? existing.stockQuantity + input.newData.stockQuantity
              : input.newData.stockQuantity;
        }
        // Update price if provided
        if (input.newData.price !== undefined) {
          updateData.price = input.newData.price.toString();
        }
        if (input.newData.costPrice !== undefined) {
          updateData.costPrice = input.newData.costPrice.toString();
        }
      } else if (input.mergeStrategy === "replace_all") {
        // Replace all fields
        if (input.newData.price !== undefined)
          updateData.price = input.newData.price.toString();
        if (input.newData.costPrice !== undefined)
          updateData.costPrice = input.newData.costPrice.toString();
        if (input.newData.stockQuantity !== undefined)
          updateData.stockQuantity = input.newData.stockQuantity;
        if (input.newData.description !== undefined)
          updateData.description = input.newData.description || null;
        if (input.newData.image !== undefined)
          updateData.image = input.newData.image || null;
        if (input.newData.images !== undefined)
          updateData.images = input.newData.images;
        if (input.newData.categoryId !== undefined)
          updateData.categoryId = input.newData.categoryId;
        if (input.newData.sku !== undefined) updateData.sku = input.newData.sku;
        if (input.newData.barcode !== undefined)
          updateData.barcode = input.newData.barcode;
      } else if (input.mergeStrategy === "update_price_only") {
        // Only update price
        if (input.newData.price !== undefined) {
          updateData.price = input.newData.price.toString();
        }
        if (input.newData.costPrice !== undefined) {
          updateData.costPrice = input.newData.costPrice.toString();
        }
      }

      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(products)
          .set(updateData)
          .where(eq(products.id, input.existingId));
      }

      // Handle category updates for replace_all strategy
      if (
        input.mergeStrategy === "replace_all" &&
        input.newData.categoryIds !== undefined
      ) {
        // Delete existing associations
        await ctx.db
          .delete(productCategories)
          .where(eq(productCategories.productId, input.existingId));

        // Insert new associations
        const categoryIdsToInsert = new Set<number>();

        if (input.newData.categoryId !== undefined) {
          categoryIdsToInsert.add(input.newData.categoryId);
        }

        input.newData.categoryIds.forEach((id) => categoryIdsToInsert.add(id));

        if (categoryIdsToInsert.size > 0) {
          await ctx.db.insert(productCategories).values(
            Array.from(categoryIdsToInsert).map((categoryId) => ({
              productId: input.existingId,
              categoryId,
            })),
          );
        }
      }

      return ctx.db.query.products.findFirst({
        where: eq(products.id, input.existingId),
        with: {
          category: true,
          productCategories: {
            with: {
              category: true,
            },
          },
        },
      });
    }),
});
