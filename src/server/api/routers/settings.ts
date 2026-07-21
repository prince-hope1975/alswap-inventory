import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { tenants } from "~/server/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { generateColorVariants } from "~/lib/color-utils";
import { normalizeConfiguredDomain } from "~/lib/domain/tenant-resolution";
import { encryptString } from "~/server/utils/encryption";

export const settingsRouter = createTRPCRouter({
    getTenantSettings: tenantProcedure.query(async ({ ctx }) => {
        const tenant = await ctx.db.query.tenants.findFirst({
            where: eq(tenants.id, ctx.tenantId),
        });

        if (!tenant) {
            throw new Error("Tenant not found");
        }

        // Generate color variants
        const primaryLight = tenant.primaryColorLight ?? "#9333EA";
        const primaryDark = tenant.primaryColorDark ?? "#A855F7";

        const lightVariants = generateColorVariants(primaryLight);
        const darkVariants = generateColorVariants(primaryDark);

        // Never return encrypted secrets to the client.
        const { paystackSecretKey: _paystackSecretKey, ...tenantSafe } = tenant;

        return {
            ...tenantSafe,
            hasPaystackSecretKey: !!tenant.paystackSecretKey,
            colorVariants: {
                light: lightVariants,
                dark: darkVariants,
            },
        };
    }),

    updateTenantSettings: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                customDomain: z.string().trim().max(255).refine(
                    (value) => value === "" || normalizeConfiguredDomain(value) !== null,
                    "Enter a hostname only, for example shop.example.com",
                ).optional(),
                brandColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                primaryColorLight: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                primaryColorDark: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                logo: z.string().url().optional().or(z.literal("")),
                currency: z.string().max(10).optional(),
                location: z.string().max(255).optional(),
                address: z.string().optional(),
                latitude: z.number().min(-90).max(90).nullable().optional(),
                longitude: z.number().min(-180).max(180).nullable().optional(),
                phone: z.string().max(50).optional(),
                receiptTemplate: z.string().max(50).optional(),
                receiptFooter: z.string().optional(),
                paystackPublicKey: z.string().optional(),
                // If provided and non-empty, will be encrypted before storing.
                // Send undefined/omit to keep existing value.
                paystackSecretKey: z.string().optional(),
                storeConfig: z.object({
                    template: z.enum(["modern", "classic", "marketplace", "minimal", "boutique", "conversion", "beauty"]),
                    themeMode: z.enum(["system", "light", "dark"]),
                    showHero: z.boolean(),
                    showArticles: z.boolean(),
                    primaryColor: z.string().optional(),
                    heroTitle: z.string().optional(),
                    heroDescription: z.string().optional(),
                    deliveryFee: z.number().min(0).optional(),
                    deliveryPricing: z.object({
                        type: z.enum(["flat", "distance"]),
                        baseFee: z.number().min(0).optional(),
                        perKmFee: z.number().min(0).optional(),
                        maxKm: z.number().min(0).optional(),
                    }).optional(),
                }).nullable().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: {
                name: string;
                customDomain?: string | null;
                brandColor?: string | null;
                primaryColorLight?: string | null;
                primaryColorDark?: string | null;
                logo?: string | null;
                currency?: string | null;
                location?: string | null;
                address?: string | null;
                latitude?: string | null;
                longitude?: string | null;
                phone?: string | null;
                receiptTemplate?: string | null;
                receiptFooter?: string | null;
                paystackPublicKey?: string | null;
                paystackSecretKey?: string | null;
                storeConfig?: {
                    template: "modern" | "classic" | "marketplace" | "minimal" | "boutique" | "conversion" | "beauty";
                    themeMode: "system" | "light" | "dark";
                    showHero: boolean;
                    showArticles: boolean;
                    primaryColor?: string;
                    heroTitle?: string;
                    heroDescription?: string;
                    deliveryFee?: number;
                    deliveryPricing?: {
                        type: "flat" | "distance";
                        baseFee?: number;
                        perKmFee?: number;
                        maxKm?: number;
                    };
                } | null;
            } = {
                name: input.name,
            };

            if (input.customDomain !== undefined) {
                const customDomain = normalizeConfiguredDomain(input.customDomain);
                if (customDomain) {
                    const existingDomain = await ctx.db.query.tenants.findFirst({
                        where: and(eq(tenants.customDomain, customDomain), ne(tenants.id, ctx.tenantId)),
                        columns: { id: true },
                    });
                    if (existingDomain) {
                        throw new TRPCError({
                            code: "CONFLICT",
                            message: "That storefront domain is already assigned to another store.",
                        });
                    }
                }
                updateData.customDomain = customDomain;
            }

            if (input.brandColor !== undefined) updateData.brandColor = input.brandColor;
            if (input.primaryColorLight !== undefined) updateData.primaryColorLight = input.primaryColorLight || null;
            if (input.primaryColorDark !== undefined) updateData.primaryColorDark = input.primaryColorDark || null;
            if (input.logo !== undefined) updateData.logo = input.logo || null;
            if (input.currency !== undefined) updateData.currency = input.currency || null;
            if (input.location !== undefined) updateData.location = input.location || null;
            if (input.address !== undefined) updateData.address = input.address || null;
            if (input.latitude !== undefined) updateData.latitude = input.latitude == null ? null : input.latitude.toString();
            if (input.longitude !== undefined) updateData.longitude = input.longitude == null ? null : input.longitude.toString();
            if (input.phone !== undefined) updateData.phone = input.phone || null;
            if (input.receiptTemplate !== undefined) updateData.receiptTemplate = input.receiptTemplate || null;
            if (input.receiptFooter !== undefined) updateData.receiptFooter = input.receiptFooter || null;
            if (input.paystackPublicKey !== undefined) updateData.paystackPublicKey = input.paystackPublicKey || null;
            if (input.paystackSecretKey !== undefined) {
                updateData.paystackSecretKey =
                    input.paystackSecretKey === ""
                        ? null
                        : encryptString(input.paystackSecretKey);
            }
            if (input.storeConfig !== undefined) updateData.storeConfig = input.storeConfig;

            await ctx.db
                .update(tenants)
                .set(updateData)
                .where(eq(tenants.id, ctx.tenantId));

            return { success: true };
        }),
});
