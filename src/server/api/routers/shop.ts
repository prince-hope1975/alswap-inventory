import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { adminNotifications, products, categories, orders, orderItems, tenants, users, productCategories } from "~/server/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendDeliveryOrderEmail } from "~/server/email";

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

        if (!tenant) {
            return {
                tenant: null,
                needsSetup: !hasUsers,
            };
        }

        // Never expose encrypted secrets to the client.
        const { paystackSecretKey: _paystackSecretKey, ...tenantSafe } = tenant;

        return {
            tenant: tenantSafe,
            needsSetup: !hasUsers,
        };
    }),

    getProducts: publicProcedure
        .input(
            z.object({
                search: z.string().optional(),
                categoryId: z.number().optional(),
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) return [];

            const searchTerm = input.search?.trim();

            // If there's a search term, use fuzzy search with pg_trgm
            if (searchTerm && searchTerm.length > 0) {
                // Use raw SQL for fuzzy search with pg_trgm
                // This searches product name, description, and associated category names
                const results = await ctx.db.execute(sql`
                    WITH product_search AS (
                        SELECT DISTINCT ON (p.id)
                            p.id,
                            p."tenantId",
                            p."categoryId",
                            p."supplierId",
                            p.name,
                            p.description,
                            p.image,
                            p.images,
                            p.barcode,
                            p.sku,
                            p.price,
                            p."cost_price" as "costPrice",
                            p."stockQuantity",
                            p."lowStockThreshold",
                            p."createdAt",
                            p."updatedAt",
                            GREATEST(
                                COALESCE(similarity(p.name, ${searchTerm}), 0),
                                COALESCE(similarity(COALESCE(p.description, ''), ${searchTerm}), 0),
                                COALESCE((
                                    SELECT MAX(similarity(c.name, ${searchTerm}))
                                    FROM "alswap-inventory_product_category" pc
                                    JOIN "alswap-inventory_category" c ON pc."categoryId" = c.id
                                    WHERE pc."productId" = p.id
                                ), 0)
                            ) as relevance
                        FROM "alswap-inventory_product" p
                        LEFT JOIN "alswap-inventory_product_category" pc ON p.id = pc."productId"
                        LEFT JOIN "alswap-inventory_category" c ON pc."categoryId" = c.id
                        WHERE 
                            p."tenantId" = ${tenant.id}
                            AND (
                                -- Trigram similarity match (fuzzy)
                                p.name % ${searchTerm}
                                OR COALESCE(p.description, '') % ${searchTerm}
                                OR c.name % ${searchTerm}
                                -- ILIKE fallback for partial matches
                                OR p.name ILIKE ${'%' + searchTerm + '%'}
                                OR COALESCE(p.description, '') ILIKE ${'%' + searchTerm + '%'}
                                OR c.name ILIKE ${'%' + searchTerm + '%'}
                            )
                    )
                    SELECT * FROM product_search
                    ORDER BY relevance DESC, "createdAt" DESC
                    LIMIT ${input.limit}
                `);

                // Get product IDs from results (results is an array of rows)
                const rows = results as unknown as { id: string }[];
                const productIds = rows.map((r) => r.id);
                
                if (productIds.length === 0) return [];

                // Fetch products with relations using Drizzle for proper typing
                const productsWithRelations = await ctx.db.query.products.findMany({
                    where: inArray(products.id, productIds),
                    with: {
                        category: true,
                        productCategories: {
                            with: {
                                category: true,
                            },
                        },
                    },
                });

                // Sort by the original relevance order
                const productMap = new Map(productsWithRelations.map(p => [p.id, p]));
                return productIds
                    .map((id: string) => productMap.get(id))
                    .filter((p): p is NonNullable<typeof p> => p !== undefined);
            }

            // Non-search query with optional category filter
            if (input.categoryId) {
                // Filter by category using the junction table (many-to-many)
                const productIdsInCategory = await ctx.db
                    .selectDistinct({ productId: productCategories.productId })
                    .from(productCategories)
                    .where(eq(productCategories.categoryId, input.categoryId));

                const pIds = productIdsInCategory.map(p => p.productId);
                
                if (pIds.length === 0) return [];

                return ctx.db.query.products.findMany({
                    where: and(
                        eq(products.tenantId, tenant.id),
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
                    limit: input.limit,
                });
            }

            // Default: return all products for tenant
            return ctx.db.query.products.findMany({
                where: eq(products.tenantId, tenant.id),
                with: {
                    category: true,
                    productCategories: {
                        with: {
                            category: true,
                        },
                    },
                },
                orderBy: desc(products.createdAt),
                limit: input.limit,
            });
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
                    productCategories: {
                        with: {
                            category: true,
                        },
                    },
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
                deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
                deliveryAddress: z.string().optional(),
                paymentMethod: z.enum(["PAYSTACK", "PAY_ON_PICKUP"]).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            const deliveryMethod = input.deliveryMethod ?? "PICKUP";
            const paymentMethod = input.paymentMethod ?? "PAYSTACK";

            if (deliveryMethod === "DELIVERY") {
                if (!input.deliveryAddress?.trim()) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is required." });
                }
                if (paymentMethod !== "PAYSTACK") {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery orders must be paid online." });
                }
            }

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
                    price: product.price,
                });
            }

            // Delivery fee from store config (if configured)
            const storeConfig = tenant.storeConfig as unknown as { deliveryFee?: number } | null;
            const deliveryFee = deliveryMethod === "DELIVERY" ? Number(storeConfig?.deliveryFee ?? 0) : 0;
            if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid delivery fee configuration." });
            }
            totalAmount += deliveryFee;

            const [newOrder] = await ctx.db.insert(orders).values({
                tenantId: tenant.id,
                totalAmount: totalAmount.toString(),
                status: paymentMethod === "PAYSTACK" ? "COMPLETED" : "PENDING",
                paymentMethod,
                deliveryMethod,
                deliveryAddress: deliveryMethod === "DELIVERY" ? input.deliveryAddress?.trim() : null,
            }).returning();

            if (!newOrder) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });

            if (orderItemsData.length > 0) {
                await ctx.db.insert(orderItems).values(
                    orderItemsData.map(item => ({
                        orderId: newOrder.id,
                        ...item
                    }))
                );
            }

            // Notify admins if this is a delivery order
            if (deliveryMethod === "DELIVERY") {
                // In-app notification
                await ctx.db.insert(adminNotifications).values({
                    tenantId: tenant.id,
                    type: "DELIVERY_ORDER",
                    title: "New delivery order",
                    message: `Delivery order from ${input.customerDetails.name}`,
                    data: {
                        orderId: newOrder.id,
                        customer: input.customerDetails,
                        deliveryAddress: input.deliveryAddress?.trim(),
                        paymentMethod,
                        totalAmount: totalAmount.toString(),
                    },
                });

                // Email notification to tenant admins
                const admins = await ctx.db.query.users.findMany({
                    where: and(eq(users.tenantId, tenant.id), eq(users.role, "ADMIN")),
                    columns: { email: true },
                });
                const emails = admins.map((a) => a.email).filter(Boolean);
                if (emails.length > 0) {
                    try {
                        await sendDeliveryOrderEmail({
                            to: emails,
                            tenantName: tenant.name,
                            orderId: newOrder.id,
                            customerName: input.customerDetails.name,
                            customerEmail: input.customerDetails.email,
                            customerPhone: input.customerDetails.phone,
                            totalAmount: totalAmount.toString(),
                            deliveryAddress: input.deliveryAddress?.trim() ?? "",
                        });
                    } catch (e) {
                        // Don't fail checkout if email fails
                        console.error("Failed to send delivery order email:", e);
                    }
                }
            }

            return { success: true, orderId: newOrder.id };
        }),
});
