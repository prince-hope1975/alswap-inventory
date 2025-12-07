import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userManagementRouter = createTRPCRouter({
    listUsers: tenantProcedure.query(async ({ ctx }) => {
        return ctx.db.query.users.findMany({
            where: eq(users.tenantId, ctx.tenantId),
            orderBy: desc(users.createdAt),
        });
    }),

    createUser: tenantProcedure
        .input(
            z.object({
                name: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
                role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).default("CASHIER"),
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

            const hashedPassword = await hash(input.password, 10);

            await ctx.db.insert(users).values({
                name: input.name,
                email: input.email,
                password: hashedPassword,
                tenantId: ctx.tenantId,
                role: input.role,
            });

            return { success: true };
        }),

    updateUser: tenantProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
                role: z.enum(["ADMIN", "MANAGER", "CASHIER"]).optional(),
                password: z.string().min(6).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.query.users.findFirst({
                where: and(eq(users.id, input.id), eq(users.tenantId, ctx.tenantId)),
            });

            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            const updateData: any = {};
            if (input.name) updateData.name = input.name;
            if (input.email) updateData.email = input.email;
            if (input.role) updateData.role = input.role;
            if (input.password) {
                updateData.password = await hash(input.password, 10);
            }

            await ctx.db
                .update(users)
                .set(updateData)
                .where(and(eq(users.id, input.id), eq(users.tenantId, ctx.tenantId)));

            return { success: true };
        }),

    deleteUser: tenantProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Prevent deleting yourself
            if (input.id === ctx.session.user.id) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You cannot delete your own account",
                });
            }

            const user = await ctx.db.query.users.findFirst({
                where: and(eq(users.id, input.id), eq(users.tenantId, ctx.tenantId)),
            });

            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            await ctx.db
                .delete(users)
                .where(and(eq(users.id, input.id), eq(users.tenantId, ctx.tenantId)));

            return { success: true };
        }),
});




