CREATE TYPE "public"."product_condition" AS ENUM('NEW', 'USED', 'REFURBISHED');--> statement-breakpoint
CREATE TYPE "public"."product_visibility" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ALTER COLUMN "image" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "condition" "product_condition" DEFAULT 'NEW' NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "condition_notes" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "visibility" "product_visibility" DEFAULT 'PUBLISHED' NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "brand" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "gtin" varchar(14);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "mpn" varchar(70);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "google_product_category" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "feed_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "serial_number" varchar(120);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "warranty_months" integer;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "seller_id" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD CONSTRAINT "alswap-inventory_product_seller_id_alswap-inventory_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."alswap-inventory_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "alswap-inventory_order_item" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "product_seller_idx" ON "alswap-inventory_product" USING btree ("seller_id");