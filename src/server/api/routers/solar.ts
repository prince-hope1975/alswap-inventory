import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { canTransitionSolarLead, SOLAR_LEAD_STATUSES } from "~/lib/domain/solar-workflow";
import { createTRPCRouter, managerProcedure } from "~/server/api/trpc";
import { solarInstallers, solarLeads } from "~/server/db/schema";

export const solarRouter = createTRPCRouter({
  listLeads: managerProcedure.query(({ ctx }) =>
    ctx.db.query.solarLeads.findMany({
      where: eq(solarLeads.tenantId, ctx.tenantId),
      orderBy: desc(solarLeads.createdAt),
      limit: 100,
    }),
  ),

  listInstallers: managerProcedure.query(({ ctx }) =>
    ctx.db.query.solarInstallers.findMany({
      where: eq(solarInstallers.tenantId, ctx.tenantId),
      orderBy: desc(solarInstallers.createdAt),
    }),
  ),

  createInstaller: managerProcedure
    .input(z.object({ name: z.string().min(2), phone: z.string().min(7), email: z.string().email().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [installer] = await ctx.db.insert(solarInstallers).values({
        tenantId: ctx.tenantId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email,
      }).returning();
      return installer;
    }),

  updateLead: managerProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(SOLAR_LEAD_STATUSES).optional(),
      assignedInstallerId: z.string().nullable().optional(),
      notes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.solarLeads.findFirst({
        where: and(eq(solarLeads.id, input.id), eq(solarLeads.tenantId, ctx.tenantId)),
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Solar lead not found" });
      if (input.status && !canTransitionSolarLead(lead.status, input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move ${lead.status} to ${input.status}` });
      }
      if (input.assignedInstallerId) {
        const installer = await ctx.db.query.solarInstallers.findFirst({
          where: and(
            eq(solarInstallers.id, input.assignedInstallerId),
            eq(solarInstallers.tenantId, ctx.tenantId),
          ),
        });
        if (!installer) throw new TRPCError({ code: "BAD_REQUEST", message: "Installer not found" });
      }
      const [updated] = await ctx.db.update(solarLeads).set({
        status: input.status,
        assignedInstallerId: input.assignedInstallerId,
        notes: input.notes,
      }).where(and(eq(solarLeads.id, input.id), eq(solarLeads.tenantId, ctx.tenantId))).returning();
      return updated;
    }),
});
