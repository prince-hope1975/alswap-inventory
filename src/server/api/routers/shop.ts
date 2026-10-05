import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { products, orders, orderItems, tenants, users } from "~/server/db/schema";
import { eq, and, or, sql, inArray, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { db } from "~/server/db";
import { resolvePublicTenant } from "~/server/tenant";
import { newPaymentReference, orderNumber, paystackEmailFor, toKobo } from "~/lib/domain/checkout";
import { notifyOrderPlaced } from "~/server/orders/notify";
import {
    finalizePaystackOrder,
    initializePaystackTransaction,
    PaymentNotFoundError,
    PaymentVerificationError,
    tenantPaystackSecret,
} from "~/server/payments/paystack";
import { SHOP_PAGE_SIZE, SHOP_SORT_OPTIONS } from "~/lib/domain/shop-filters";
import { browseStorefrontProducts, emptyBrowseResult, listStorefrontCategories } from "~/server/shop/browse";

/** Storefront checkout honors salePrice, same rule as the POS (`prepareSale` in `~/lib/domain/sale.ts`). */
function effectiveUnitPrice(product: { price: string; salePrice: string | null }): number {
    const salePrice = product.salePrice == null ? null : Number(product.salePrice);
    return salePrice != null && salePrice >= 0 ? salePrice : Number(product.price);
}

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

const checkoutItemsInput = z
    .array(
        z.object({
            productId: z.string().min(1),
            quantity: z.number().int().min(1).max(999),
        })
    )
    .min(1, "Your cart is empty.")
    .max(100);

/** Phone is how the store reaches the shopper; email is optional. */
const customerDetailsInput = z.object({
    name: z.string().trim().min(1, "Name is required").max(255),
    phone: z.string().trim().min(7, "Phone number is required").max(50),
    email: z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z.string().trim().email().max(255).optional(),
    ),
});

type CheckoutLine = {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unlimitedStock: boolean;
};

/**
 * Re-price the cart on the server and refuse it outright if anything is gone,
 * unpublished or short — the shopper must see which item, not pay for a
 * silently smaller order.
 */
async function loadCheckoutLines(
    database: typeof db,
    tenantId: string,
    items: { productId: string; quantity: number }[],
): Promise<CheckoutLine[]> {
    const wanted = new Map<string, number>();
    for (const item of items) {
        wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
    }

    const found = await database.query.products.findMany({
        where: and(eq(products.tenantId, tenantId), inArray(products.id, [...wanted.keys()])),
        columns: { id: true, name: true, price: true, salePrice: true, stockQuantity: true, visibility: true },
    });
    const byId = new Map(found.map((product) => [product.id, product]));

    const problems: string[] = [];
    const lines: CheckoutLine[] = [];
    for (const [productId, quantity] of wanted) {
        const product = byId.get(productId);
        if (!product) {
            problems.push("An item in your cart is no longer available");
            continue;
        }
        if (product.visibility !== "PUBLISHED") {
            problems.push(`${product.name} is no longer available`);
            continue;
        }
        // stockQuantity === -1 means untracked (see inventory.ts).
        if (product.stockQuantity !== -1 && product.stockQuantity < quantity) {
            problems.push(
                product.stockQuantity <= 0
                    ? `${product.name} is out of stock`
                    : `${product.name}: only ${product.stockQuantity} left`,
            );
            continue;
        }
        lines.push({
            productId,
            name: product.name,
            quantity,
            unitPrice: effectiveUnitPrice(product),
            unlimitedStock: product.stockQuantity === -1,
        });
    }

    if (problems.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: `${problems.join("; ")}. Please update your cart.` });
    }
    return lines;
}

export const shopRouter = createTRPCRouter({
    getShopDetails: publicProcedure.query(async ({ ctx }) => {
        // For now, we'll just get the first tenant as the "main" store
        // In a real multi-tenant app, this might depend on the domain
        // We prioritize the most recently updated tenant for development purposes
        const tenant = await resolvePublicTenant(ctx.db, ctx.headers);

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
                // Drives the `used.` surface, which pre-filters to non-new stock.
                condition: z.array(z.enum(["NEW", "USED", "REFURBISHED"])).min(1).optional(),
                sort: z.enum(SHOP_SORT_OPTIONS).optional(),
                minPrice: z.number().min(0).optional(),
                maxPrice: z.number().min(0).optional(),
                inStockOnly: z.boolean().optional(),
                limit: z.number().min(1).max(100).default(SHOP_PAGE_SIZE),
                // Offset of the page to load (useInfiniteQuery's page param).
                cursor: z.number().int().min(0).nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
            if (!tenant) return emptyBrowseResult();
            return browseStorefrontProducts(ctx.db, tenant.id, input);
        }),

    getCategories: publicProcedure.query(async ({ ctx }) => {
        const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
        if (!tenant) return [];
        return listStorefrontCategories(ctx.db, tenant.id);
    }),

    getProduct: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
            if (!tenant) return null;
            return ctx.db.query.products.findFirst({
                where: and(
                    eq(products.id, input.id),
                    eq(products.tenantId, tenant.id),
                    eq(products.visibility, "PUBLISHED"),
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

    /**
     * Look a product up by its canonical slug, falling back to the id so that
     * links minted before slugs were required keep resolving.
     */
    getProductBySlug: publicProcedure
        .input(z.object({ slug: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
            if (!tenant) return null;
            return ctx.db.query.products.findFirst({
                where: and(
                    eq(products.tenantId, tenant.id),
                    eq(products.visibility, "PUBLISHED"),
                    or(eq(products.slug, input.slug), eq(products.id, input.slug)),
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

    estimateDeliveryFee: publicProcedure
        .input(z.object({ deliveryAddress: z.string().min(5) }))
        .query(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
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
                items: checkoutItemsInput,
                customerDetails: customerDetailsInput,
                deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).optional(),
                deliveryAddress: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            const secretKey = tenantPaystackSecret(tenant);
            if (!secretKey || !tenant.paystackPublicKey) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Paystack is not configured for this store.",
                });
            }

            const deliveryMethod = input.deliveryMethod ?? "PICKUP";
            const deliveryAddress = deliveryMethod === "DELIVERY" ? input.deliveryAddress?.trim() : undefined;
            if (deliveryMethod === "DELIVERY" && !deliveryAddress) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is required." });
            }

            const lines = await loadCheckoutLines(ctx.db, tenant.id, input.items);
            const deliveryFeeOut = await computeDeliveryFee({ tenant, deliveryMethod, deliveryAddress });
            const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
            const totalAmount = subtotal + deliveryFeeOut.fee;

            const amountKobo = toKobo(totalAmount);
            if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid order total." });
            }

            const reference = newPaymentReference(crypto.randomUUID());
            const email = paystackEmailFor(input.customerDetails.email, reference);

            // The order exists (PENDING, server prices) before the shopper
            // pays, so the webhook can always find it by reference — even if
            // the browser closes right after payment.
            const order = await ctx.db.transaction(async (tx) => {
                const [created] = await tx.insert(orders).values({
                    tenantId: tenant.id,
                    // Store exactly what Paystack will charge so the
                    // finalizer's kobo comparison can't drift on rounding.
                    totalAmount: (amountKobo / 100).toFixed(2),
                    status: "PENDING",
                    paymentMethod: "PAYSTACK",
                    paymentReference: reference,
                    deliveryMethod,
                    deliveryAddress: deliveryAddress ?? null,
                    deliveryFee: deliveryMethod === "DELIVERY" ? deliveryFeeOut.fee.toString() : null,
                    customerName: input.customerDetails.name,
                    // The placeholder address is only for Paystack, never shown to staff.
                    customerEmail: input.customerDetails.email ?? null,
                    customerPhone: input.customerDetails.phone,
                }).returning({ id: orders.id });
                if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });

                await tx.insert(orderItems).values(
                    lines.map((line) => ({
                        orderId: created.id,
                        productId: line.productId,
                        quantity: line.quantity,
                        price: line.unitPrice.toString(),
                    })),
                );
                return created;
            });

            const init = await initializePaystackTransaction({
                secretKey,
                email,
                amountKobo,
                reference,
                metadata: {
                    orderId: order.id,
                    deliveryMethod,
                    deliveryFee: deliveryFeeOut.fee,
                    distanceKm: deliveryFeeOut.distanceKm,
                },
            });

            if (!init.ok) {
                // No payment can arrive for a reference Paystack never accepted.
                await ctx.db.update(orders)
                    .set({ status: "CANCELLED" })
                    .where(and(eq(orders.id, order.id), eq(orders.status, "PENDING")));
                throw new TRPCError({ code: "BAD_GATEWAY", message: init.message });
            }

            return {
                accessCode: init.accessCode,
                reference,
                orderId: order.id,
                orderNumber: orderNumber(order.id),
                email,
                total: amountKobo / 100,
                subtotal,
                deliveryFee: deliveryFeeOut.fee,
                lines: lines.map(({ productId, name, quantity, unitPrice }) => ({ productId, name, quantity, unitPrice })),
            };
        }),

    createOrder: publicProcedure
        .input(
            z.discriminatedUnion("paymentMethod", [
                // Online payment: the PENDING order was created by
                // initPaystackPayment; this only verifies and completes it.
                z.object({
                    paymentMethod: z.literal("PAYSTACK"),
                    reference: z.string().min(1).max(100),
                }),
                z.object({
                    paymentMethod: z.literal("PAY_ON_PICKUP"),
                    items: checkoutItemsInput,
                    customerDetails: customerDetailsInput,
                }),
            ])
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await resolvePublicTenant(ctx.db, ctx.headers);
            if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

            if (input.paymentMethod === "PAYSTACK") {
                try {
                    const result = await finalizePaystackOrder({ db: ctx.db, tenant, reference: input.reference });
                    return {
                        success: true,
                        orderId: result.orderId,
                        orderNumber: orderNumber(result.orderId),
                        total: Number(result.totalAmount),
                        needsAttention: result.outcome === "needs_attention",
                    };
                } catch (error) {
                    if (error instanceof PaymentNotFoundError) {
                        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
                    }
                    if (error instanceof PaymentVerificationError) {
                        throw new TRPCError({ code: "PAYMENT_REQUIRED", message: error.message });
                    }
                    throw error;
                }
            }

            // Pay on pickup: a direct PENDING order; stock is held now.
            const lines = await loadCheckoutLines(ctx.db, tenant.id, input.items);
            const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

            const newOrder = await ctx.db.transaction(async (tx) => {
                const [order] = await tx.insert(orders).values({
                    tenantId: tenant.id,
                    totalAmount: totalAmount.toString(),
                    status: "PENDING",
                    paymentMethod: "PAY_ON_PICKUP",
                    deliveryMethod: "PICKUP",
                    customerName: input.customerDetails.name,
                    customerEmail: input.customerDetails.email ?? null,
                    customerPhone: input.customerDetails.phone,
                }).returning();

                if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create order" });

                for (const line of lines) {
                    await tx.insert(orderItems).values({
                        orderId: order.id,
                        productId: line.productId,
                        quantity: line.quantity,
                        price: line.unitPrice.toString(),
                    });

                    if (line.unlimitedStock) continue;

                    const [updated] = await tx.update(products)
                        .set({ stockQuantity: sql`${products.stockQuantity} - ${line.quantity}` })
                        .where(and(
                            eq(products.id, line.productId),
                            eq(products.tenantId, tenant.id),
                            gte(products.stockQuantity, line.quantity),
                        ))
                        .returning({ id: products.id });

                    if (!updated) {
                        throw new TRPCError({
                            code: "CONFLICT",
                            message: `${line.name} sold out while you were checking out; please review your cart.`,
                        });
                    }
                }

                return order;
            });

            await notifyOrderPlaced({ db: ctx.db, tenant, orderId: newOrder.id });

            return {
                success: true,
                orderId: newOrder.id,
                orderNumber: orderNumber(newOrder.id),
                total: totalAmount,
                needsAttention: false,
            };
        }),
});
