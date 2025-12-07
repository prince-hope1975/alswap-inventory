ALTER TABLE "alswap-inventory_product" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "receipt_template" varchar(50) DEFAULT 'classic';--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "receipt_footer" text;