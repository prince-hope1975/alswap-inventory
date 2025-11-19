import { z } from "zod";

import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { products, categories } from "~/server/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";

export const inventoryRouter = createTRPCRouter({
    // --- Categories ---

    createCategory: tenantProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.insert(categories).values({
                name: input.name,
                tenantId: ctx.tenantId,
            });
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

    createProduct: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                image: z.string().url().optional().or(z.literal("")),
                categoryId: z.number().optional(),
                barcode: z.string().optional(),
                sku: z.string().optional(),
                price: z.number().min(0),
                costPrice: z.number().min(0).optional(),
                stockQuantity: z.number().int().default(0),
                lowStockThreshold: z.number().int().default(5),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.insert(products).values({
                name: input.name,
                image: input.image || null,
                categoryId: input.categoryId,
                barcode: input.barcode,
                sku: input.sku,
                price: input.price.toString(), // Decimal handling
                costPrice: input.costPrice?.toString(),
                stockQuantity: input.stockQuantity,
                lowStockThreshold: input.lowStockThreshold,
                tenantId: ctx.tenantId,
            });
        }),

    listProducts: tenantProcedure
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            const search = input?.search;
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

            return ctx.db.query.products.findMany({
                where: and(...whereConditions),
                with: {
                    category: true,
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
                },
            });
        }),

    updateProduct: tenantProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                image: z.string().url().optional().or(z.literal("")),
                categoryId: z.number().optional(),
                barcode: z.string().optional(),
                sku: z.string().optional(),
                price: z.number().min(0).optional(),
                costPrice: z.number().min(0).optional(),
                stockQuantity: z.number().int().optional(),
                lowStockThreshold: z.number().int().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: any = { ...input };
            delete updateData.id;
            if (input.price !== undefined) updateData.price = input.price.toString();
            if (input.costPrice !== undefined) updateData.costPrice = input.costPrice.toString();

            return ctx.db
                .update(products)
                .set(updateData)
                .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)));
        }),

    deleteProduct: tenantProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db
                .delete(products)
                .where(and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId)));
        }),

    getLowStockProducts: tenantProcedure.query(async ({ ctx }) => {
        return ctx.db.query.products.findMany({
            where: and(
                eq(products.tenantId, ctx.tenantId),
                lte(products.stockQuantity, products.lowStockThreshold ?? 5) // Handle null threshold
            ),
            with: {
                category: true,
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

    getDashboardStats: tenantProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.tenantId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Total Products
        const [totalProducts] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(eq(products.tenantId, tenantId));

        // 2. Low Stock
        const [lowStock] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(
                and(
                    eq(products.tenantId, tenantId),
                    lte(products.stockQuantity, products.lowStockThreshold ?? 5)
                )
            );

        // 3. Total Value
        // Note: price is decimal, cast to number for calculation if needed, or let SQL handle it
        const [totalValue] = await ctx.db
            .select({
                value: sql<number>`sum(${products.price} * ${products.stockQuantity})`
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
            lowStock: lowStock?.count ?? 0,
            totalValue: totalValue?.value ?? 0,
            salesToday: salesToday?.amount ?? 0,
            recentActivity,
            topSelling,
        };
    }),
});
