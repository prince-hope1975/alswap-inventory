-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "alswap-inventory_product_category" (
	"productId" varchar(255) NOT NULL,
	"categoryId" integer NOT NULL,
	CONSTRAINT "alswap-inventory_product_category_productId_categoryId_pk" PRIMARY KEY("productId","categoryId")
);
--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "images" json;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product_category" ADD CONSTRAINT "alswap-inventory_product_category_productId_alswap-inventory_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."alswap-inventory_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product_category" ADD CONSTRAINT "alswap-inventory_product_category_categoryId_alswap-inventory_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."alswap-inventory_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pc_product_idx" ON "alswap-inventory_product_category" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "pc_category_idx" ON "alswap-inventory_product_category" USING btree ("categoryId");--> statement-breakpoint
-- GIN indexes for trigram fuzzy search on product name and description
CREATE INDEX "product_name_trgm_idx" ON "alswap-inventory_product" USING GIN (name gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "product_desc_trgm_idx" ON "alswap-inventory_product" USING GIN (description gin_trgm_ops);--> statement-breakpoint
-- GIN index for category name fuzzy search
CREATE INDEX "category_name_trgm_idx" ON "alswap-inventory_category" USING GIN (name gin_trgm_ops);--> statement-breakpoint
-- Migrate existing categoryId relationships to the junction table
INSERT INTO "alswap-inventory_product_category" ("productId", "categoryId")
SELECT id, "categoryId" FROM "alswap-inventory_product" WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;