import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import { shifts, orders, orderItems, products, customers } from "~/server/db/schema";
import { eq, and, desc, or, ilike, inArray, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { PAYMENT_METHODS } from "~/lib/constants";
import { prepareSale } from "~/lib/domain/sale";

export const posRouter = createTRPCRouter({
    // Shift Management
    openShift: staffProcedure
        .input(
            z.object({
                startCash: z.number().min(0),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.session.user.tenantId;
            if (!tenantId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "No tenant associated with user",
                });
            }

            // Check if there's already an open shift for this user
            const existingShift = await ctx.db.query.shifts.findFirst({
                where: and(
                    eq(shifts.userId, ctx.session.user.id),
                    eq(shifts.status, "OPEN"),
                ),
            });

            if (existingShift) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "You already have an open shift",
                });
            }

            const [shift] = await ctx.db
                .insert(shifts)
                .values({
                    tenantId,
                    userId: ctx.session.user.id,
                    startCash: input.startCash.toString(),
                    status: "OPEN",
                })
                .returning();

            return shift;
        }),

    closeShift: staffProcedure
        .input(
            z.object({
                shiftId: z.string(),
                endCash: z.number().min(0),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const shift = await ctx.db.query.shifts.findFirst({
                where: and(
                    eq(shifts.id, input.shiftId),
                    eq(shifts.userId, ctx.session.user.id),
                ),
            });

            if (!shift) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shift not found",
                });
            }

            if (shift.status === "CLOSED") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Shift is already closed",
                });
            }

            const [updatedShift] = await ctx.db
                .update(shifts)
                .set({
                    endCash: input.endCash.toString(),
                    endTime: new Date(),
                    status: "CLOSED",
                })
                .where(eq(shifts.id, input.shiftId))
                .returning();

            return updatedShift;
        }),

    getCurrentShift: staffProcedure.query(async ({ ctx }) => {
        const shift = await ctx.db.query.shifts.findFirst({
            where: and(
                eq(shifts.userId, ctx.session.user.id),
                eq(shifts.status, "OPEN"),
            ),
        });

        return shift;
    }),

    listShifts: staffProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.session.user.tenantId;
        if (!tenantId) return [];

        const allShifts = await ctx.db.query.shifts.findMany({
            where: eq(shifts.tenantId, tenantId),
            orderBy: [desc(shifts.startTime)],
            limit: 50,
        });

        return allShifts;
    }),

    // Order Management
    createOrder: staffProcedure
        .input(
            z.object({
                shiftId: z.string().optional(),
                clientOrderId: z.string().uuid().optional(),
                customerId: z.string().optional(),
                items: z.array(
                    z.object({
                        productId: z.string(),
                        quantity: z.number().int().min(1),
                        price: z.number().min(0),
                    }),
                ),
                paymentMethod: z.enum([
                    PAYMENT_METHODS.CASH,
                    PAYMENT_METHODS.CARD,
                    PAYMENT_METHODS.TRANSFER,
                    PAYMENT_METHODS.OTHER
                ]).default(PAYMENT_METHODS.CASH),
                amountPaid: z.number().min(0).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.session.user.tenantId;
            if (!tenantId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "No tenant associated with user",
                });
            }

            const clientOrderId = input.clientOrderId ?? crypto.randomUUID();
            return ctx.db.transaction(async (tx) => {
                const existing = await tx.query.orders.findFirst({
                    where: and(eq(orders.tenantId, tenantId), eq(orders.clientOrderId, clientOrderId)),
                });
                if (existing) return existing;

                const productRows = await tx.query.products.findMany({
                    where: and(
                        eq(products.tenantId, tenantId),
                        inArray(products.id, input.items.map((item) => item.productId)),
                    ),
                });
                let sale;
                try {
                    sale = prepareSale({
                        requested: input.items.map((item) => ({ ...item, clientPrice: item.price })),
                        products: productRows.map((product) => ({
                            id: product.id,
                            price: Number(product.price),
                            salePrice: product.salePrice == null ? null : Number(product.salePrice),
                            stockQuantity: product.stockQuantity,
                        })),
                    });
                } catch (error) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: error instanceof Error ? error.message : "Sale could not be prepared",
                    });
                }

                const [order] = await tx.insert(orders).values({
                    tenantId,
                    clientOrderId,
                    createdByUserId: ctx.session.user.id,
                    shiftId: input.shiftId,
                    customerId: input.customerId,
                    totalAmount: sale.total.toString(),
                    paymentMethod: input.paymentMethod,
                    status: "COMPLETED",
                }).returning();
                if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });

                for (const line of sale.lines) {
                    const [updated] = await tx.update(products)
                        .set({ stockQuantity: sql`${products.stockQuantity} - ${line.quantity}` })
                        .where(and(
                            eq(products.id, line.productId),
                            eq(products.tenantId, tenantId),
                            gte(products.stockQuantity, line.quantity),
                        ))
                        .returning({ id: products.id });
                    if (!updated) throw new TRPCError({ code: "CONFLICT", message: `Stock changed for ${line.productId}; review the cart.` });
                    await tx.insert(orderItems).values({
                        orderId: order.id,
                        productId: line.productId,
                        quantity: line.quantity,
                        price: line.unitPrice.toString(),
                    });
                }

                if (input.customerId) {
                    await tx.update(customers).set({
                        loyaltyPoints: sql`coalesce(${customers.loyaltyPoints}, 0) + ${Math.floor(sale.total)}`,
                    }).where(and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)));
                }
                return order;
            });
        }),

    searchProducts: staffProcedure
        .input(
            z.object({
                query: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.session.user.tenantId;
            if (!tenantId) return [];

            return ctx.db.query.products.findMany({
                where: and(
                    eq(products.tenantId, tenantId),
                    or(
                        ilike(products.name, `%${input.query}%`),
                        ilike(products.barcode, `%${input.query}%`),
                        ilike(products.sku, `%${input.query}%`)
                    )
                ),
                limit: 20,
            });
        }),

    getOrder: staffProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.orders.findFirst({
                where: and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId)),
                with: {
                    items: {
                        with: {
                            product: true,
                        },
                    },
                    customer: true,
                    shift: {
                        with: {
                            user: true,
                        },
                    },
                },
            });
        }),

    listOrders: staffProcedure
        .input(
            z.object({
                limit: z.number().default(50),
                offset: z.number().default(0),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            return ctx.db.query.orders.findMany({
                where: eq(orders.tenantId, ctx.tenantId),
                with: {
                    customer: true,
                    items: {
                        with: {
                            product: true,
                        },
                    },
                },
                orderBy: desc(orders.createdAt),
                limit: input?.limit ?? 50,
                offset: input?.offset ?? 0,
            });
        }),

    searchCustomers: staffProcedure
        .input(z.object({ query: z.string() }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.session.user.tenantId;
            if (!tenantId) return [];

            return ctx.db.query.customers.findMany({
                where: and(
                    eq(customers.tenantId, tenantId),
                    or(
                        ilike(customers.name, `%${input.query}%`),
                        ilike(customers.email, `%${input.query}%`),
                        ilike(customers.phone, `%${input.query}%`)
                    )
                ),
                limit: 10,
            });
        }),

    getOfflineData: staffProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.session.user.tenantId;
        if (!tenantId) return { products: [], customers: [] };

        const allProducts = await ctx.db.query.products.findMany({
            where: eq(products.tenantId, tenantId),
        });

        const allCustomers = await ctx.db.query.customers.findMany({
            where: eq(customers.tenantId, tenantId),
        });

        return {
            products: allProducts,
            customers: allCustomers,
        };
    }),
});
