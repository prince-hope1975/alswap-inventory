import { z } from "zod";

import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { products, categories } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

    // --- Products ---

    createProduct: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
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

    listProducts: tenantProcedure.query(async ({ ctx }) => {
        return ctx.db.query.products.findMany({
            where: eq(products.tenantId, ctx.tenantId),
            with: {
                category: true,
            },
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
});
