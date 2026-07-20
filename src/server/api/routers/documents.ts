import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { approveDocumentDraft, detectDocumentDuplicate } from "~/lib/domain/document-import";
import { calculateWeightedAverageCost } from "~/lib/domain/inventory";
import { createTRPCRouter, managerProcedure } from "~/server/api/trpc";
import { documentJobs, inventoryMovements, orderItems, orders, products, productVariants } from "~/server/db/schema";
import { extractDocumentWithGemini } from "~/server/document-ocr";

const lineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sku: z.string().max(255).optional(),
  productVariantId: z.string().optional(),
});
const draftSchema = z.object({
  type: z.enum(["SUPPLIER_INVOICE", "CUSTOMER_RECEIPT"]),
  supplierName: z.string().max(255).optional(),
  customerName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(255).optional(),
  date: z.string().max(30).optional(),
  total: z.number().nonnegative(),
  lines: z.array(lineSchema).min(1),
});

export const documentsRouter = createTRPCRouter({
  list: managerProcedure.query(({ ctx }) =>
    ctx.db.query.documentJobs.findMany({
      where: eq(documentJobs.tenantId, ctx.tenantId),
      orderBy: desc(documentJobs.createdAt),
      limit: 100,
    }),
  ),

  listVariants: managerProcedure.query(({ ctx }) =>
    ctx.db.query.productVariants.findMany({
      where: eq(productVariants.tenantId, ctx.tenantId),
      orderBy: desc(productVariants.createdAt),
      limit: 500,
    }),
  ),

  uploadAndExtract: managerProcedure
    .input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
      base64: z.string().min(16).max(14_000_000),
    }))
    .mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.byteLength > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Documents must be 10 MB or smaller" });
      }
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const existing = await ctx.db.query.documentJobs.findFirst({
        where: and(eq(documentJobs.tenantId, ctx.tenantId), eq(documentJobs.sha256, sha256)),
      });
      if (existing || detectDocumentDuplicate({ sha256 }, [])) {
        throw new TRPCError({ code: "CONFLICT", message: "This document was already uploaded" });
      }

      const [job] = await ctx.db.insert(documentJobs).values({
        tenantId: ctx.tenantId,
        uploadedByUserId: ctx.session.user.id,
        objectKey: `inline://${sha256}`,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sha256,
        status: "PROCESSING",
      }).returning();
      if (!job) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const extraction = await extractDocumentWithGemini({ base64: input.base64, mimeType: input.mimeType });
        const [updated] = await ctx.db.update(documentJobs).set({
          type: extraction.draft.type,
          status: "REVIEW",
          provider: extraction.provider,
          providerModel: extraction.model,
          rawExtraction: extraction.raw as Record<string, unknown>,
          draft: extraction.draft,
        }).where(and(eq(documentJobs.id, job.id), eq(documentJobs.tenantId, ctx.tenantId))).returning();
        return updated;
      } catch (error) {
        await ctx.db.update(documentJobs).set({
          status: "FAILED",
          failureMessage: error instanceof Error ? error.message.slice(0, 2000) : "Extraction failed",
        }).where(eq(documentJobs.id, job.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OCR extraction failed. The job is saved for retry." });
      }
    }),

  saveDraft: managerProcedure
    .input(z.object({ id: z.string(), draft: draftSchema }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db.update(documentJobs).set({
        draft: input.draft,
        type: input.draft.type,
        status: "REVIEW",
      }).where(and(eq(documentJobs.id, input.id), eq(documentJobs.tenantId, ctx.tenantId))).returning();
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      return job;
    }),

  approve: managerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const job = await ctx.db.query.documentJobs.findFirst({
      where: and(eq(documentJobs.id, input.id), eq(documentJobs.tenantId, ctx.tenantId)),
    });
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
    if (job.status === "APPROVED") return job;
    const draft = draftSchema.parse(job.draft);
    const approval = approveDocumentDraft({ type: draft.type, lines: draft.lines });

    return ctx.db.transaction(async (tx) => {
      const [claimed] = await tx.update(documentJobs).set({ status: "PROCESSING" }).where(and(
        eq(documentJobs.id, job.id),
        eq(documentJobs.tenantId, ctx.tenantId),
        eq(documentJobs.status, "REVIEW"),
      )).returning({ id: documentJobs.id });
      if (!claimed) throw new TRPCError({ code: "CONFLICT", message: "Document is not ready for approval" });

      if (draft.type === "SUPPLIER_INVOICE") {
        for (const movement of approval.inventoryMovements) {
          const variant = await tx.query.productVariants.findFirst({
            where: and(eq(productVariants.id, movement.productVariantId), eq(productVariants.tenantId, ctx.tenantId)),
          });
          if (!variant) throw new TRPCError({ code: "BAD_REQUEST", message: "A matched product is no longer available" });
          const nextAverage = calculateWeightedAverageCost({
            currentQuantity: Number(variant.stockQuantity),
            currentUnitCost: Number(variant.averageUnitCost),
            receivedQuantity: movement.quantity,
            receivedUnitCost: movement.unitCost,
          });
          await tx.update(productVariants).set({
            stockQuantity: (Number(variant.stockQuantity) + movement.quantity).toString(),
            averageUnitCost: nextAverage.toString(),
          }).where(and(eq(productVariants.id, variant.id), eq(productVariants.tenantId, ctx.tenantId)));
          await tx.update(products).set({
            stockQuantity: Math.max(0, Number(variant.stockQuantity)) + movement.quantity,
            costPrice: nextAverage.toString(),
          }).where(and(eq(products.id, variant.productId), eq(products.tenantId, ctx.tenantId)));
          await tx.insert(inventoryMovements).values({
            tenantId: ctx.tenantId,
            productVariantId: variant.id,
            type: "PURCHASE_RECEIPT",
            quantityDelta: movement.quantity.toString(),
            unitCost: movement.unitCost.toString(),
            referenceType: "DOCUMENT_JOB",
            referenceId: job.id,
            createdByUserId: ctx.session.user.id,
          });
        }
      } else {
        if (draft.lines.some((line) => !Number.isInteger(line.quantity))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Customer receipt quantities must be whole numbers" });
        }
        const resolved = await Promise.all(draft.lines.map(async (line) => {
          if (!line.productVariantId) throw new TRPCError({ code: "BAD_REQUEST", message: "Match every receipt line to a product" });
          const variant = await tx.query.productVariants.findFirst({
            where: and(eq(productVariants.id, line.productVariantId), eq(productVariants.tenantId, ctx.tenantId)),
          });
          if (!variant) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid product match" });
          return { line, variant };
        }));
        const [order] = await tx.insert(orders).values({
          tenantId: ctx.tenantId,
          createdByUserId: ctx.session.user.id,
          isHistoricalImport: true,
          customerName: draft.customerName,
          totalAmount: draft.total.toString(),
          paymentMethod: "IMPORTED",
          status: "COMPLETED",
        }).returning();
        if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await tx.insert(orderItems).values(resolved.map(({ line, variant }) => ({
          orderId: order.id,
          productId: variant.productId,
          quantity: Math.round(line.quantity),
          price: line.unitPrice.toString(),
        })));
      }
      const [approved] = await tx.update(documentJobs).set({
        status: "APPROVED",
        approvedByUserId: ctx.session.user.id,
        approvedAt: new Date(),
      }).where(and(eq(documentJobs.id, job.id), eq(documentJobs.tenantId, ctx.tenantId))).returning();
      return approved!;
    });
  }),
});
