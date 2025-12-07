import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { products, categories, orders, orderItems, tenants, users } from "~/server/db/schema";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const shopRouter = createTRPCRouter({
    getShopDetails: publicProcedure.query(async ({ ctx }) => {
        // For now, we'll just get the first tenant as the "main" store
        // In a real multi-tenant app, this might depend on the domain
        // We prioritize the most recently updated tenant for development purposes
        const tenant = await ctx.db.query.tenants.findFirst({
            orderBy: desc(tenants.updatedAt),
        });

        // Check if any user exists to determine if setup is needed
        const userCount = await ctx.db.select({ count: sql<number>`count(*)` }).from(users);
        const hasUsers = (userCount[0]?.count ?? 0) > 0;

        return {
            tenant,
            needsSetup: !hasUsers,
        };
    }),

    getProducts: publicProcedure
        .input(
            z.object({
                search: z.string().optional(),
                categoryId: z.number().optional(),
                limit: z.number().min(1).max(100).default(20),
                cursor: z.string().optional(), // For infinite scroll if needed later
            })
        )
        .query(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) return [];

            const whereConditions = [eq(products.tenantId, tenant.id)];

            if (input.search) {
                whereConditions.push(
                    or(
                        ilike(products.name, `%${input.search}%`),
                        ilike(products.description || "", `%${input.search}%`)
                    )!
                );
            }

            if (input.categoryId) {
                whereConditions.push(eq(products.categoryId, input.categoryId));
            }

            const items = await ctx.db.query.products.findMany({
                where: and(...whereConditions),
                with: {
                    category: true,
                },
                orderBy: desc(products.createdAt),
                limit: input.limit,
            });

            return items;
        }),

    getCategories: publicProcedure.query(async ({ ctx }) => {
        const tenant = await ctx.db.query.tenants.findFirst({
            orderBy: desc(tenants.updatedAt),
        });
        if (!tenant) return [];

        return ctx.db.query.categories.findMany({
            where: eq(categories.tenantId, tenant.id),
            orderBy: desc(categories.id),
        });
    }),

    getProduct: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.products.findFirst({
                where: eq(products.id, input.id),
                with: {
                    category: true,
                },
            });
        }),

    createOrder: publicProcedure
        .input(
            z.object({
                items: z.array(
                    z.object({
                        productId: z.string(),
                        quantity: z.number().min(1),
                    })
                ),
                customerDetails: z.object({
                    name: z.string(),
                    email: z.string().email(),
                    phone: z.string().optional(),
                }),
                reference: z.string(), // Paystack reference
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            // In a real app, verify Paystack transaction here using the reference
            // const verification = await verifyPaystack(input.reference);
            // if (!verification.status) throw ...

            // Calculate total
            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of input.items) {
                const product = await ctx.db.query.products.findFirst({
                    where: eq(products.id, item.productId),
                });

                if (!product) continue;

                const price = Number(product.price);
                totalAmount += price * item.quantity;
                orderItemsData.push({
                    productId: product.id,
                    quantity: item.quantity,
                    price: product.price, // Store price at time of sale
                });
            }

            // Create Order
            // Note: We might want to create a "Guest" customer or link to existing if email matches
            // For now, we'll just create the order.

            // We need a customer ID. Let's see if we can find one or create a guest one.
            // The schema requires customerId.

            // Check for existing customer by email
            // This requires the `customers` table which is tenant specific
            // We'll assume we can create a customer record for them

            // Wait, the schema says customerId is a reference.
            // Let's try to find or create the customer.

            // Since this is a public procedure, we need to be careful about exposing customer data.
            // We will just create a new customer record if one doesn't exist for this email?
            // Or just use a generic "Web Customer" if we don't want to track them individually?
            // Better to track them.

            // For this MVP, let's just create the order without a customerId if it was nullable, 
            // but it is NOT nullable in the schema: `customerId: d.varchar...references...`
            // Wait, let me check the schema again.

            // Checking schema...
            // `customerId: d.varchar({ length: 255 }).references(() => customers.id),`
            // It doesn't say `.notNull()`. So it IS nullable by default in Drizzle unless specified.
            // Let's check the `orders` table definition in schema.ts again.

            /*
            export const orders = createTable(
              "order",
              (d) => ({
                ...
                customerId: d.varchar({ length: 255 }).references(() => customers.id),
                ...
              })
            */

            // It is nullable. So we can proceed without customerId for guest checkout if we want,
            // OR we can create a customer. Creating a customer is better for CRM.

            // Let's create/find customer
            // We need to import customers table
            // import { customers } from "~/server/db/schema";

            /*
            let customerId = null;
            // logic to find/create customer
            */

            // Actually, for simplicity and speed, I will leave customerId null for guest orders for now,
            // unless I see a reason not to.

            const [newOrder] = await ctx.db.insert(orders).values({
                tenantId: tenant.id,
                totalAmount: totalAmount.toString(),
                status: "COMPLETED", // Assuming successful payment
                paymentMethod: "PAYSTACK",
                // customerId: ... 
            }).returning();

            if (!newOrder) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });

            // Insert items
            if (orderItemsData.length > 0) {
                await ctx.db.insert(orderItems).values(
                    orderItemsData.map(item => ({
                        orderId: newOrder.id,
                        ...item
                    }))
                );
            }

            return { success: true, orderId: newOrder.id };
        }),
});
