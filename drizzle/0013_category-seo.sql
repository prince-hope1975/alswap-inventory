ALTER TABLE "alswap-inventory_category" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "alswap-inventory_category"
SET "slug" = CONCAT(
  COALESCE(
    NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')), ''),
    'category'
  ),
  '-',
  "id"
)
WHERE "slug" IS NULL OR BTRIM("slug") = '';--> statement-breakpoint
CREATE UNIQUE INDEX "category_tenant_slug_idx" ON "alswap-inventory_category" USING btree ("tenantId","slug");
