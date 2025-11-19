import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { customers } from "~/server/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";

export const crmRouter = createTRPCRouter({
    createCustomer: tenantProcedure
        .input(z.object({
            name: z.string().min(1),
            email: z.string().email().optional().or(z.literal("")),
            phone: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.insert(customers).values({
                tenantId: ctx.tenantId,
                name: input.name,
                email: input.email || null,
                phone: input.phone,
            });
        }),

    listCustomers: tenantProcedure
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            const search = input?.search;
            const whereConditions = [eq(customers.tenantId, ctx.tenantId)];

            if (search) {
                 whereConditions.push(
                    or(
                        ilike(customers.name, `%${search}%`),
                        ilike(customers.email, `%${search}%`),
                        ilike(customers.phone, `%${search}%`)
                    )!
                );
            }

            return ctx.db.query.customers.findMany({
                where: and(...whereConditions),
                orderBy: desc(customers.createdAt),
                limit: 100
            });
        }),

    updateCustomer: tenantProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1),
            email: z.string().email().optional().or(z.literal("")),
            phone: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.update(customers)
                .set({
                    name: input.name,
                    email: input.email || null,
                    phone: input.phone,
                })
                .where(and(eq(customers.id, input.id), eq(customers.tenantId, ctx.tenantId)));
        }),

    deleteCustomer: tenantProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.delete(customers)
                .where(and(eq(customers.id, input.id), eq(customers.tenantId, ctx.tenantId)));
        }),
        
    getCustomer: tenantProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.customers.findFirst({
                where: and(eq(customers.id, input.id), eq(customers.tenantId, ctx.tenantId)),
                with: {
                    orders: {
                        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
                        limit: 10,
                        with: {
                            shift: {
                                with: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            });
        })
});

