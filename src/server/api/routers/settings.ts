import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { tenants } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { generateColorVariants } from "~/lib/color-utils";

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

        return {
            ...tenant,
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
                brandColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                primaryColorLight: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                primaryColorDark: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
                logo: z.string().url().optional().or(z.literal("")),
                currency: z.string().max(10).optional(),
                location: z.string().max(255).optional(),
                address: z.string().optional(),
                phone: z.string().max(50).optional(),
                receiptTemplate: z.string().max(50).optional(),
                receiptFooter: z.string().optional(),
                storeConfig: z.object({
                    template: z.enum(["modern", "classic", "marketplace", "minimal", "boutique"]),
                    themeMode: z.enum(["system", "light", "dark"]),
                    showHero: z.boolean(),
                    showArticles: z.boolean(),
                    primaryColor: z.string().optional(),
                    heroTitle: z.string().optional(),
                    heroDescription: z.string().optional(),
                }).nullable().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: {
                name: string;
                brandColor?: string | null;
                primaryColorLight?: string | null;
                primaryColorDark?: string | null;
                logo?: string | null;
                currency?: string | null;
                location?: string | null;
                address?: string | null;
                phone?: string | null;
                receiptTemplate?: string | null;
                receiptFooter?: string | null;
                storeConfig?: {
                    template: "modern" | "classic" | "marketplace" | "minimal" | "boutique";
                    themeMode: "system" | "light" | "dark";
                    showHero: boolean;
                    showArticles: boolean;
                    primaryColor?: string;
                    heroTitle?: string;
                    heroDescription?: string;
                } | null;
            } = {
                name: input.name,
            };

            if (input.brandColor !== undefined) updateData.brandColor = input.brandColor;
            if (input.primaryColorLight !== undefined) updateData.primaryColorLight = input.primaryColorLight || null;
            if (input.primaryColorDark !== undefined) updateData.primaryColorDark = input.primaryColorDark || null;
            if (input.logo !== undefined) updateData.logo = input.logo || null;
            if (input.currency !== undefined) updateData.currency = input.currency || null;
            if (input.location !== undefined) updateData.location = input.location || null;
            if (input.address !== undefined) updateData.address = input.address || null;
            if (input.phone !== undefined) updateData.phone = input.phone || null;
            if (input.receiptTemplate !== undefined) updateData.receiptTemplate = input.receiptTemplate || null;
            if (input.receiptFooter !== undefined) updateData.receiptFooter = input.receiptFooter || null;
            if (input.storeConfig !== undefined) updateData.storeConfig = input.storeConfig;

            await ctx.db
                .update(tenants)
                .set(updateData)
                .where(eq(tenants.id, ctx.tenantId));

            return { success: true };
        }),
});

