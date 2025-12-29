CREATE TYPE "public"."order_delivery_method" AS ENUM('PICKUP', 'DELIVERY');--> statement-breakpoint
CREATE TABLE "alswap-inventory_admin_notification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"data" json,
	"is_read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "delivery_method" "order_delivery_method" DEFAULT 'PICKUP' NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "latitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "longitude" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "paystack_public_key" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "paystack_secret_key" text;--> statement-breakpoint
ALTER TABLE "alswap-inventory_admin_notification" ADD CONSTRAINT "alswap-inventory_admin_notification_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_notification_tenant_idx" ON "alswap-inventory_admin_notification" USING btree ("tenantId");