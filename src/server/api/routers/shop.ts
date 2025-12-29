import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { adminNotifications, products, categories, orders, orderItems, tenants, users, productCategories } from "~/server/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendDeliveryOrderEmail } from "~/server/email";
import { decryptString } from "~/server/utils/encryption";

type DeliveryPricingConfig =
    | {
        type: "flat";
      }
    | {
        type: "distance";
        baseFee: number;
        perKmFee: number;
        maxKm?: number;
      };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", address);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
        headers: {
            Accept: "application/json",
            "User-Agent": "alswap-inventory/1.0",
        },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
}

async function computeDeliveryFee(input: {
    tenant: typeof tenants.$inferSelect;
    deliveryMethod: "PICKUP" | "DELIVERY";
    deliveryAddress?: string;
}): Promise<{ fee: number; distanceKm?: number }> {
    if (input.deliveryMethod !== "DELIVERY") return { fee: 0 };
    if (!input.deliveryAddress?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is required." });
    }

    const storeConfig = input.tenant.storeConfig as unknown as {
        deliveryFee?: number;
        deliveryPricing?: DeliveryPricingConfig;
    } | null;

    const pricing = storeConfig?.deliveryPricing;

    // Default / backward-compatible flat fee:
    if (!pricing || pricing.type === "flat") {
        const fee = Number(storeConfig?.deliveryFee ?? 0);
        if (!Number.isFinite(fee) || fee < 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid delivery fee configuration." });
        }
        return { fee };
    }

    // Distance-based:
    const lat = input.tenant.latitude ? Number(input.tenant.latitude) : NaN;
    const lng = input.tenant.longitude ? Number(input.tenant.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Store pickup location (lat/lng) must be configured for distance-based delivery pricing.",
        });
    }

    const dest = await geocodeAddress(input.deliveryAddress.trim());
    if (!dest) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not geocode delivery address." });
    }

    const distanceKm = haversineKm({ lat, lng }, dest);
    const baseFee = Number(pricing.baseFee);
    const perKmFee = Number(pricing.perKmFee);
    const maxKm = pricing.maxKm == null ? undefined : Number(pricing.maxKm);

    if (!Number.isFinite(baseFee) || baseFee < 0 || !Number.isFinite(perKmFee) || perKmFee < 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid distance-based delivery pricing configuration." });
    }
    if (maxKm != null && Number.isFinite(maxKm) && distanceKm > maxKm) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is outside delivery range." });
    }

    const fee = Math.round(baseFee + perKmFee * distanceKm);
    return { fee, distanceKm };
}

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

    estimateDeliveryFee: publicProcedure
        .input(z.object({ deliveryAddress: z.string().min(5) }))
        .query(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            const out = await computeDeliveryFee({
                tenant,
                deliveryMethod: "DELIVERY",
                deliveryAddress: input.deliveryAddress,
            });
            return out;
        }),

    initPaystackPayment: publicProcedure
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
                deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
                deliveryAddress: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.db.query.tenants.findFirst({
                orderBy: desc(tenants.updatedAt),
            });
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            if (!tenant.paystackSecretKey || !tenant.paystackPublicKey) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Paystack is not configured for this store.",
                });
            }

            const deliveryMethod = input.deliveryMethod ?? "PICKUP";

            // Compute expected total (same logic as createOrder)
            let totalAmount = 0;
            for (const item of input.items) {
                const product = await ctx.db.query.products.findFirst({
                    where: eq(products.id, item.productId),
                });
                if (!product) continue;
                totalAmount += Number(product.price) * item.quantity;
            }
            const deliveryFeeOut = await computeDeliveryFee({
                tenant,
                deliveryMethod,
                deliveryAddress: deliveryMethod === "DELIVERY" ? input.deliveryAddress : undefined,
            });
            totalAmount += deliveryFeeOut.fee;

            const amountKobo = Math.round(totalAmount * 100);
            if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid order total." });
            }

            const secretKey = decryptString(tenant.paystackSecretKey);
            const reference = `ps_${tenant.id}_${Date.now()}`;

            const resp = await fetch("https://api.paystack.co/transaction/initialize", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    email: input.customerDetails.email,
                    amount: amountKobo,
                    reference,
                    metadata: {
                        tenantId: tenant.id,
                        deliveryMethod,
                        deliveryFee: deliveryFeeOut.fee,
                        distanceKm: deliveryFeeOut.distanceKm,
                    },
                }),
            });

            const payload = (await resp.json()) as {
                status: boolean;
                message?: string;
                data?: { access_code: string; reference: string };
            };

            if (!resp.ok || !payload.status || !payload.data?.access_code || !payload.data?.reference) {
                throw new TRPCError({
                    code: "BAD_GATEWAY",
                    message: payload.message ?? "Failed to initialize Paystack transaction.",
                });
            }

            return {
                reference: payload.data.reference,
                accessCode: payload.data.access_code,
            };
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
            const deliveryFeeOut = await computeDeliveryFee({
                tenant,
                deliveryMethod,
                deliveryAddress: deliveryMethod === "DELIVERY" ? input.deliveryAddress : undefined,
            });
            totalAmount += deliveryFeeOut.fee;

            // If PAYSTACK, verify transaction before creating a completed order
            if (paymentMethod === "PAYSTACK") {
                if (!tenant.paystackSecretKey) {
                    throw new TRPCError({
                        code: "PRECONDITION_FAILED",
                        message: "Paystack secret key is not configured for this store.",
                    });
                }

                const expectedAmountKobo = Math.round(totalAmount * 100);
                const secretKey = decryptString(tenant.paystackSecretKey);

                const verifyResp = await fetch(
                    `https://api.paystack.co/transaction/verify/${encodeURIComponent(input.reference)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${secretKey}`,
                            Accept: "application/json",
                        },
                    },
                );

                const verifyPayload = (await verifyResp.json()) as {
                    status: boolean;
                    message?: string;
                    data?: { status?: string; amount?: number; reference?: string };
                };

                const status = verifyPayload.data?.status;
                const amount = verifyPayload.data?.amount;
                const ref = verifyPayload.data?.reference;

                if (!verifyResp.ok || !verifyPayload.status || status !== "success") {
                    throw new TRPCError({
                        code: "PAYMENT_REQUIRED",
                        message: verifyPayload.message ?? "Payment verification failed.",
                    });
                }

                if (ref && ref !== input.reference) {
                    throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "Payment reference mismatch." });
                }

                if (typeof amount !== "number" || amount !== expectedAmountKobo) {
                    throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "Payment amount mismatch." });
                }
            }

            const [newOrder] = await ctx.db.insert(orders).values({
                tenantId: tenant.id,
                totalAmount: totalAmount.toString(),
                status: paymentMethod === "PAYSTACK" ? "COMPLETED" : "PENDING",
                paymentMethod,
                deliveryMethod,
                deliveryAddress: deliveryMethod === "DELIVERY" ? input.deliveryAddress?.trim() : null,
                deliveryFee: deliveryMethod === "DELIVERY" ? deliveryFeeOut.fee.toString() : null,
                customerName: input.customerDetails.name,
                customerEmail: input.customerDetails.email,
                customerPhone: input.customerDetails.phone ?? null,
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
                        deliveryFee: deliveryFeeOut.fee,
                        distanceKm: deliveryFeeOut.distanceKm,
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
