import { z } from "zod";

import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { products, categories, orders, orderItems, productCategories } from "~/server/db/schema";
import { eq, and, desc, or, ilike, lte, sql, gte, inArray } from "drizzle-orm";

export const inventoryRouter = createTRPCRouter({
    // --- Categories ---

    createCategory: tenantProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.insert(categories).values({
                name: input.name,
                tenantId: ctx.tenantId,
            }).returning();
        }),

    listCategories: tenantProcedure.query(async ({ ctx }) => {
        return ctx.db.query.categories.findMany({
            where: eq(categories.tenantId, ctx.tenantId),
            orderBy: desc(categories.id),
        });
    }),

    updateCategory: tenantProcedure
        .input(z.object({ id: z.number(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db
                .update(categories)
                .set({ name: input.name })
                .where(and(eq(categories.id, input.id), eq(categories.tenantId, ctx.tenantId)));
        }),

    deleteCategory: tenantProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db
                .delete(categories)
                .where(and(eq(categories.id, input.id), eq(categories.tenantId, ctx.tenantId)));
        }),

    // --- Products ---

    validateImageUrl: tenantProcedure
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
            } catch (error) {
                return { isValid: false, error: "Failed to validate URL" };
            }
        }),

    createProduct: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                image: z.string().url().optional().or(z.literal("")),
                images: z.array(z.string().url()).optional(),
                categoryId: z.number().optional(), // Primary category (backward compat)
                categoryIds: z.array(z.number()).optional(), // Multiple categories
                barcode: z.string().optional(),
                sku: z.string().optional(),
                price: z.number().min(0),
                costPrice: z.number().min(0),
                stockQuantity: z.number().int().min(-1).default(0), // -1 = unknown quantity
                lowStockThreshold: z.number().int().default(5),
            }).refine(
                (data) => {
                    // Skip validation if quantity is unknown (-1)
                    if (data.stockQuantity === -1) {
                        return true;
                    }
                    // If stockQuantity is 0, allow any threshold >= 0
                    // Otherwise, threshold must be less than stockQuantity
                    if (data.stockQuantity === 0) {
                        return data.lowStockThreshold >= 0;
                    }
                    return data.lowStockThreshold < data.stockQuantity;
                },
                {
                    message: "Low stock threshold must be less than current stock quantity",
                    path: ["lowStockThreshold"],
                }
            ),
        )
        .mutation(async ({ ctx, input }) => {
            // Insert product
            const [newProduct] = await ctx.db.insert(products).values({
                name: input.name,
                description: input.description || null,
                image: input.image || null,
                images: input.images || null,
                categoryId: input.categoryId, // Keep for backward compatibility
                barcode: input.barcode,
                sku: input.sku,
                price: input.price.toString(),
                costPrice: input.costPrice.toString(),
                stockQuantity: input.stockQuantity,
                lowStockThreshold: input.lowStockThreshold,
                tenantId: ctx.tenantId,
            }).returning();

            if (!newProduct) {
                throw new Error("Failed to create product");
            }

            // Insert category associations (many-to-many)
            const categoryIdsToInsert = new Set<number>();

            // Add primary category if provided
            if (input.categoryId) {
                categoryIdsToInsert.add(input.categoryId);
            }

            // Add additional categories
            if (input.categoryIds && input.categoryIds.length > 0) {
                input.categoryIds.forEach(id => categoryIdsToInsert.add(id));
            }

            if (categoryIdsToInsert.size > 0) {
                await ctx.db.insert(productCategories).values(
                    Array.from(categoryIdsToInsert).map(categoryId => ({
                        productId: newProduct.id,
                        categoryId,
                    }))
                );
            }

            return newProduct;
        }),

    listProducts: tenantProcedure
        .input(z.object({
            search: z.string().optional(),
            hasImage: z.boolean().optional()
        }).optional())
        .query(async ({ ctx, input }) => {
            const search = input?.search;
            const hasImage = input?.hasImage;
            const whereConditions = [eq(products.tenantId, ctx.tenantId)];

            if (search) {
                whereConditions.push(
                    or(
                        ilike(products.name, `%${search}%`),
                        ilike(products.sku, `%${search}%`),
                        ilike(products.barcode, `%${search}%`)
                    )!
                );
            }

            if (hasImage !== undefined) {
                if (hasImage) {
                    whereConditions.push(
                        and(
                            sql`${products.image} IS NOT NULL`,
                            sql`${products.image} != ''`
                        )!
                    );
                } else {
                    whereConditions.push(
                        or(
                            sql`${products.image} IS NULL`,
                            eq(products.image, '')
                        )!
                    );
                }
            }

            return ctx.db.query.products.findMany({
                where: and(...whereConditions),
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

    getProduct: tenantProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
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

    updateProduct: tenantProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                image: z.string().url().optional().or(z.literal("")),
                images: z.array(z.string().url()).optional(),
                categoryId: z.number().optional(), // Primary category (backward compat)
                categoryIds: z.array(z.number()).optional(), // Multiple categories - replaces existing
                barcode: z.string().optional(),
                sku: z.string().optional(),
                price: z.number().min(0).optional(),
                costPrice: z.number().min(0).optional(),
                stockQuantity: z.number().int().min(-1).optional(), // -1 = unknown quantity
                lowStockThreshold: z.number().int().optional(),
            }).refine(
                (data) => {
                    // Only validate if both fields are provided
                    if (data.stockQuantity !== undefined && data.lowStockThreshold !== undefined) {
                        // Skip validation if quantity is unknown (-1)
                        if (data.stockQuantity === -1) {
                            return true;
                        }
                        // If stockQuantity is 0, allow any threshold >= 0
                        // Otherwise, threshold must be less than stockQuantity
                        if (data.stockQuantity === 0) {
                            return data.lowStockThreshold >= 0;
                        }
                        return data.lowStockThreshold < data.stockQuantity;
                    }
                    return true;
                },
                {
                    message: "Low stock threshold must be less than current stock quantity",
                    path: ["lowStockThreshold"],
                }
            ),
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: Record<string, unknown> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description || null;
            if (input.image !== undefined) updateData.image = input.image || null;
            if (input.images !== undefined) updateData.images = input.images;
            if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
            if (input.barcode !== undefined) updateData.barcode = input.barcode;
            if (input.sku !== undefined) updateData.sku = input.sku;
            if (input.price !== undefined) updateData.price = input.price.toString();
            if (input.costPrice !== undefined) updateData.costPrice = input.costPrice.toString();
            if (input.stockQuantity !== undefined) updateData.stockQuantity = input.stockQuantity;
            if (input.lowStockThreshold !== undefined) updateData.lowStockThreshold = input.lowStockThreshold;

            // Update product
            if (Object.keys(updateData).length > 0) {
                await ctx.db
                    .update(products)
                    .set(updateData)
                    .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)));
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
                input.categoryIds.forEach(id => categoryIdsToInsert.add(id));

                if (categoryIdsToInsert.size > 0) {
                    await ctx.db.insert(productCategories).values(
                        Array.from(categoryIdsToInsert).map(categoryId => ({
                            productId: input.id,
                            categoryId,
                        }))
                    );
                }
            }

            return ctx.db.query.products.findFirst({
                where: eq(products.id, input.id),
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
                .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)));
        }),

    getLowStockProducts: tenantProcedure.query(async ({ ctx }) => {
        return ctx.db.query.products.findMany({
            where: and(
                eq(products.tenantId, ctx.tenantId),
                lte(products.stockQuantity, products.lowStockThreshold ?? 5), // Handle null threshold
                sql`${products.stockQuantity} >= 0` // Exclude unknown quantities (-1)
            ),
            with: {
                category: true,
                productCategories: {
                    with: {
                        category: true,
                    },
                },
            },
            limit: 20,
            orderBy: desc(products.createdAt),
        });
    }),

    updateStock: tenantProcedure
        .input(
            z.object({
                id: z.string(),
                quantity: z.number().int(), // Can be negative for deduction
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // In a real app, we should use a transaction and check for sufficient stock if deducting
            const product = await ctx.db.query.products.findFirst({
                where: and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)),
            });

            if (!product) {
                throw new Error("Product not found");
            }

            const newQuantity = product.stockQuantity + input.quantity;

            await ctx.db
                .update(products)
                .set({ stockQuantity: newQuantity })
                .where(eq(products.id, input.id));

            return { success: true, newQuantity };
        }),

    bulkCreateProducts: tenantProcedure
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
                        costPrice: z.number().min(0),
                        stockQuantity: z.number().int().min(-1).default(0), // -1 = unknown quantity
                        lowStockThreshold: z.number().int().default(5),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const productsToInsert = input.products.map((product) => ({
                name: product.name,
                description: product.description || null,
                image: product.image || null,
                images: product.images || null,
                categoryId: product.categoryId,
                barcode: product.barcode,
                sku: product.sku,
                price: product.price.toString(),
                costPrice: product.costPrice.toString(),
                stockQuantity: product.stockQuantity,
                lowStockThreshold: product.lowStockThreshold,
                tenantId: ctx.tenantId,
            }));

            const insertedProducts = await ctx.db.insert(products).values(productsToInsert).returning();

            // Insert category associations for each product
            const categoryAssociations: { productId: string; categoryId: number }[] = [];

            insertedProducts.forEach((product, index) => {
                const inputProduct = input.products[index];
                if (!inputProduct) return;

                const categoryIdsToInsert = new Set<number>();

                if (inputProduct.categoryId) {
                    categoryIdsToInsert.add(inputProduct.categoryId);
                }

                if (inputProduct.categoryIds) {
                    inputProduct.categoryIds.forEach(id => categoryIdsToInsert.add(id));
                }

                categoryIdsToInsert.forEach(categoryId => {
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

    addProductCategories: tenantProcedure
        .input(z.object({
            productId: z.string(),
            categoryIds: z.array(z.number()),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify product belongs to tenant
            const product = await ctx.db.query.products.findFirst({
                where: and(eq(products.id, input.productId), eq(products.tenantId, ctx.tenantId)),
            });

            if (!product) {
                throw new Error("Product not found");
            }

            // Insert new associations (ignore duplicates)
            const values = input.categoryIds.map(categoryId => ({
                productId: input.productId,
                categoryId,
            }));

            await ctx.db.insert(productCategories)
                .values(values)
                .onConflictDoNothing();

            return { success: true };
        }),

    removeProductCategory: tenantProcedure
        .input(z.object({
            productId: z.string(),
            categoryId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify product belongs to tenant
            const product = await ctx.db.query.products.findFirst({
                where: and(eq(products.id, input.productId), eq(products.tenantId, ctx.tenantId)),
            });

            if (!product) {
                throw new Error("Product not found");
            }

            await ctx.db
                .delete(productCategories)
                .where(and(
                    eq(productCategories.productId, input.productId),
                    eq(productCategories.categoryId, input.categoryId)
                ));

            return { success: true };
        }),

    getProductsByCategory: tenantProcedure
        .input(z.object({ categoryId: z.number() }))
        .query(async ({ ctx, input }) => {
            // Get product IDs in this category
            const productIdsInCategory = await ctx.db
                .selectDistinct({ productId: productCategories.productId })
                .from(productCategories)
                .where(eq(productCategories.categoryId, input.categoryId));

            const pIds = productIdsInCategory.map(p => p.productId);

            if (pIds.length === 0) return [];

            return ctx.db.query.products.findMany({
                where: and(
                    eq(products.tenantId, ctx.tenantId),
                    inArray(products.id, pIds)
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

    getDashboardStats: tenantProcedure.query(async ({ ctx }) => {
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
                and(
                    eq(products.tenantId, tenantId),
                    eq(products.stockQuantity, -1)
                )
            );

        // 2. Low Stock (exclude unknown quantities)
        const [lowStock] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(
                and(
                    eq(products.tenantId, tenantId),
                    lte(products.stockQuantity, products.lowStockThreshold ?? 5),
                    sql`${products.stockQuantity} >= 0` // Exclude unknown quantities
                )
            );

        // 3a. Confirmed Total Value (only products with known quantities >= 0)
        const [totalValueConfirmed] = await ctx.db
            .select({
                value: sql<number>`sum(${products.price} * ${products.stockQuantity})`
            })
            .from(products)
            .where(
                and(
                    eq(products.tenantId, tenantId),
                    sql`${products.stockQuantity} >= 0`
                )
            );

        // 3b. Estimated Total Value (treating unknown as 0, so same as confirmed)
        // In the future, you could add logic to estimate unknown quantities
        const [totalValueEstimated] = await ctx.db
            .select({
                value: sql<number>`sum(${products.price} * CASE WHEN ${products.stockQuantity} = -1 THEN 0 ELSE ${products.stockQuantity} END)`
            })
            .from(products)
            .where(eq(products.tenantId, tenantId));

        // 4. Sales Today
        const [salesToday] = await ctx.db
            .select({
                amount: sql<number>`sum(${orders.totalAmount})`
            })
            .from(orders)
            .where(
                and(
                    eq(orders.tenantId, tenantId),
                    gte(orders.createdAt, today)
                )
            );

        // 5. Recent Activity (Orders)
        const recentActivity = await ctx.db.query.orders.findMany({
            where: eq(orders.tenantId, tenantId),
            orderBy: desc(orders.createdAt),
            limit: 5,
            with: {
                customer: true,
            }
        });

        // 6. Top Selling Items
        // This requires aggregation on orderItems
        const topSelling = await ctx.db
            .select({
                productId: orderItems.productId,
                name: products.name,
                category: categories.name,
                totalSold: sql<number>`sum(${orderItems.quantity})`,
                totalRevenue: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})`
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(eq(orders.tenantId, tenantId))
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

    findSimilarProducts: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                threshold: z.number().min(0).max(1).default(0.7),
                limit: z.number().int().min(1).max(20).default(10),
            })
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

    checkDuplicates: tenantProcedure
        .input(
            z.object({
                names: z.array(z.string()),
            })
        )

        .query(async ({ ctx, input }) => {
            const allProducts = await ctx.db.query.products.findMany({
                where: eq(products.tenantId, ctx.tenantId),
            });

            // Create map of lowercase name -> product
            const duplicates: Record<string, { id: string; name: string; sku?: string | null; price: string; stockQuantity: number }> = {};

            for (const inputName of input.names) {
                const normalizedInput = inputName.toLowerCase().trim();
                const match = allProducts.find(
                    (p) => p.name.toLowerCase().trim() === normalizedInput
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
        })
    ,
    checkDuplicatesMutation: tenantProcedure
        .input(
            z.object({
                names: z.array(z.string()),
            })
        )

        .mutation(async ({ ctx, input }) => {
            const allProducts = await ctx.db.query.products.findMany({
                where: eq(products.tenantId, ctx.tenantId),
            });

            // Create map of lowercase name -> product
            const duplicates: Record<string, { id: string; name: string; sku?: string | null; price: string; stockQuantity: number }> = {};

            for (const inputName of input.names) {
                const normalizedInput = inputName.toLowerCase().trim();
                const match = allProducts.find(
                    (p) => p.name.toLowerCase().trim() === normalizedInput
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
        })
    ,

    mergeProduct: tenantProcedure
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
                mergeStrategy: z.enum(["add_stock", "replace_all", "update_price_only"]).default("add_stock"),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.db.query.products.findFirst({
                where: and(
                    eq(products.id, input.existingId),
                    eq(products.tenantId, ctx.tenantId)
                ),
            });

            if (!existing) {
                throw new Error("Product not found");
            }

            const updateData: Record<string, unknown> = {};

            if (input.mergeStrategy === "add_stock") {
                // Add to existing stock
                if (input.newData.stockQuantity !== undefined && input.newData.stockQuantity >= 0) {
                    updateData.stockQuantity = existing.stockQuantity >= 0
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
                if (input.newData.price !== undefined) updateData.price = input.newData.price.toString();
                if (input.newData.costPrice !== undefined) updateData.costPrice = input.newData.costPrice.toString();
                if (input.newData.stockQuantity !== undefined) updateData.stockQuantity = input.newData.stockQuantity;
                if (input.newData.description !== undefined) updateData.description = input.newData.description || null;
                if (input.newData.image !== undefined) updateData.image = input.newData.image || null;
                if (input.newData.images !== undefined) updateData.images = input.newData.images;
                if (input.newData.categoryId !== undefined) updateData.categoryId = input.newData.categoryId;
                if (input.newData.sku !== undefined) updateData.sku = input.newData.sku;
                if (input.newData.barcode !== undefined) updateData.barcode = input.newData.barcode;
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
            if (input.mergeStrategy === "replace_all" && input.newData.categoryIds !== undefined) {
                // Delete existing associations
                await ctx.db
                    .delete(productCategories)
                    .where(eq(productCategories.productId, input.existingId));

                // Insert new associations
                const categoryIdsToInsert = new Set<number>();

                if (input.newData.categoryId !== undefined) {
                    categoryIdsToInsert.add(input.newData.categoryId);
                }

                input.newData.categoryIds.forEach(id => categoryIdsToInsert.add(id));

                if (categoryIdsToInsert.size > 0) {
                    await ctx.db.insert(productCategories).values(
                        Array.from(categoryIdsToInsert).map(categoryId => ({
                            productId: input.existingId,
                            categoryId,
                        }))
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
