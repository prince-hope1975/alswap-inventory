import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { tenants, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
    register: publicProcedure
        .input(
            z.object({
                companyName: z.string().min(1),
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if email already exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            if (existingUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "User with this email already exists",
                });
            }

            // Create Tenant
            // We need a slug, let's generate one from the name or just use a random one for now.
            // For simplicity, we'll just use the ID as the slug or a timestamp-based one to ensure uniqueness if we don't want to enforce unique names yet.
            // But the schema says slug is unique. Let's just use a simple slugify for now or random.
            const slug = input.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();

            const [tenant] = await ctx.db
                .insert(tenants)
                .values({
                    name: input.companyName,
                    slug: slug,
                })
                .returning();

            if (!tenant) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create tenant",
                });
            }

            // Hash password
            const hashedPassword = await hash(input.password, 10);

            // Create User
            await ctx.db.insert(users).values({
                name: input.name,
                email: input.email,
                password: hashedPassword,
                tenantId: tenant.id,
                role: "ADMIN",
            });

            return { success: true };
        }),
});
