import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { tenants, users, verificationTokens } from "~/server/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendPasswordResetEmail } from "~/server/email";

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

    forgotPassword: publicProcedure
        .input(z.object({ email: z.string().email() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email),
            });

            if (!user) {
                // Determine whether to reveal user existence or not.
                // For security, it's often better not to, but for UX it can be helpful.
                // We'll return success: true even if user doesn't exist to prevent enumeration.
                return { success: true };
            }

            const token = crypto.randomUUID();
            const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

            // Delete existing tokens for this user/email if any?
            // The schema has composite PK (identifier, token), so we can just insert a new one.
            // But good practice to clean up old ones? We'll just insert.
            // Actually, we should probably delete old tokens for this email to keep table clean.
            await ctx.db.delete(verificationTokens).where(eq(verificationTokens.identifier, input.email));

            await ctx.db.insert(verificationTokens).values({
                identifier: input.email,
                token,
                expires,
            });

            await sendPasswordResetEmail(input.email, token);

            return { success: true };
        }),

    resetPassword: publicProcedure
        .input(
            z.object({
                token: z.string(),
                password: z.string().min(6),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const tokenRecord = await ctx.db.query.verificationTokens.findFirst({
                where: and(
                    eq(verificationTokens.token, input.token),
                    gt(verificationTokens.expires, new Date())
                ),
            });

            if (!tokenRecord) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid or expired token",
                });
            }

            const hashedPassword = await hash(input.password, 10);

            await ctx.db
                .update(users)
                .set({ password: hashedPassword })
                .where(eq(users.email, tokenRecord.identifier));

            await ctx.db
                .delete(verificationTokens)
                .where(eq(verificationTokens.identifier, tokenRecord.identifier));

            return { success: true };
        }),
});
