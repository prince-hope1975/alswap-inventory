import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { shifts, orders, orderItems, products, customers } from "~/server/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const posRouter = createTRPCRouter({
    // Shift Management
    openShift: tenantProcedure
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

    closeShift: tenantProcedure
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

    getCurrentShift: tenantProcedure.query(async ({ ctx }) => {
        const shift = await ctx.db.query.shifts.findFirst({
            where: and(
                eq(shifts.userId, ctx.session.user.id),
                eq(shifts.status, "OPEN"),
            ),
        });

        return shift;
    }),

    listShifts: tenantProcedure.query(async ({ ctx }) => {
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
    createOrder: tenantProcedure
        .input(
            z.object({
                shiftId: z.string().optional(),
                customerId: z.string().optional(),
                items: z.array(
                    z.object({
                        productId: z.string(),
                        quantity: z.number().int().min(1),
                        price: z.number().min(0),
                    }),
                ),
                paymentMethod: z.string().default("CASH"),
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

            // Calculate total
            const totalAmount = input.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0,
            );

            // Create order
            const [order] = await ctx.db
                .insert(orders)
                .values({
                    tenantId,
                    shiftId: input.shiftId,
                    customerId: input.customerId,
                    totalAmount: totalAmount.toString(),
                    paymentMethod: input.paymentMethod,
                    status: "COMPLETED",
                })
                .returning();

            if (!order) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create order",
                });
            }

            // Create order items and update stock
            for (const item of input.items) {
                await ctx.db.insert(orderItems).values({
                    orderId: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price.toString(),
                });

                // Deduct stock
                const product = await ctx.db.query.products.findFirst({
                    where: eq(products.id, item.productId),
                });

                if (product) {
                    await ctx.db
                        .update(products)
                        .set({
                            stockQuantity: Math.max(0, product.stockQuantity - item.quantity),
                        })
                        .where(eq(products.id, item.productId));
                }
            }

            // Award loyalty points if customer exists (1 point per dollar spent, rounded)
            if (input.customerId) {
                const customer = await ctx.db.query.customers.findFirst({
                    where: and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)),
                });

                if (customer) {
                    const pointsToAward = Math.floor(totalAmount);
                    await ctx.db
                        .update(customers)
                        .set({
                            loyaltyPoints: (customer.loyaltyPoints ?? 0) + pointsToAward,
                        })
                        .where(eq(customers.id, input.customerId));
                }
            }

            return order;
        }),

    searchProducts: tenantProcedure
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

    getOrder: tenantProcedure
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

    listOrders: tenantProcedure
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

    searchCustomers: tenantProcedure
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
});
