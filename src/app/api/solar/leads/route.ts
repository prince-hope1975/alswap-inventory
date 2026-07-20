import { NextResponse } from "next/server";
import { z } from "zod";

import { estimateSolarSystem } from "~/lib/domain/solar";
import { db } from "~/server/db";
import { solarLeads } from "~/server/db/schema";
import { resolvePublicTenant } from "~/server/tenant";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  location: z.string().trim().min(3).max(500),
  website: z.string().max(0).optional(),
  appliances: z.array(
    z.object({
      name: z.string().min(1).max(120),
      watts: z.number().positive().max(20_000),
      quantity: z.number().int().positive().max(100),
      hoursPerDay: z.number().min(0).max(24),
      surgeMultiplier: z.number().min(1).max(10).optional(),
    }),
  ).min(1).max(50),
  attribution: z.record(z.string(), z.string().max(255)).optional(),
});

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.website) {
    return NextResponse.json({ error: "Check the survey details and try again." }, { status: 400 });
  }

  const tenant = await resolvePublicTenant(db, request.headers);
  if (!tenant) return NextResponse.json({ error: "Store not found." }, { status: 404 });

  const estimateResult = estimateSolarSystem({
    appliances: parsed.data.appliances,
    backupHours: 8,
    peakSunHours: 5,
  });
  const [lead] = await db
    .insert(solarLeads)
    .values({
      tenantId: tenant.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      location: parsed.data.location,
      estimateInput: { appliances: parsed.data.appliances, backupHours: 8, peakSunHours: 5 },
      estimateResult,
      attribution: parsed.data.attribution,
      status: "SURVEY_REQUESTED",
    })
    .returning({ id: solarLeads.id });

  return NextResponse.json({ id: lead?.id, status: "SURVEY_REQUESTED" }, { status: 201 });
}
