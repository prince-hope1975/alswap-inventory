CREATE TYPE "public"."document_job_status" AS ENUM('UPLOADED', 'QUEUED', 'PROCESSING', 'REVIEW', 'APPROVED', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('SUPPLIER_INVOICE', 'CUSTOMER_RECEIPT');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('OPENING_BALANCE', 'PURCHASE_RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'COUNT_VARIANCE');--> statement-breakpoint
CREATE TYPE "public"."solar_lead_status" AS ENUM('NEW', 'SURVEY_REQUESTED', 'SURVEY_CONFIRMED', 'QUOTED', 'DEPOSIT_PAID', 'INSTALLING', 'COMPLETED', 'LOST');--> statement-breakpoint
CREATE TABLE "alswap-inventory_document_job" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"uploaded_by_user_id" varchar(255) NOT NULL,
	"type" "document_type",
	"status" "document_job_status" DEFAULT 'UPLOADED' NOT NULL,
	"object_key" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"provider" varchar(50),
	"provider_model" varchar(100),
	"raw_extraction" json,
	"draft" json,
	"failure_message" text,
	"approved_by_user_id" varchar(255),
	"approved_at" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_inventory_movement" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"product_variant_id" varchar(255) NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity_delta" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(12, 4),
	"reference_type" varchar(50),
	"reference_id" varchar(255),
	"reason" text,
	"created_by_user_id" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_product_variant" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(255),
	"barcode" varchar(255),
	"attributes" json,
	"retail_price" numeric(12, 2) NOT NULL,
	"wholesale_price" numeric(12, 2),
	"average_unit_cost" numeric(12, 4) DEFAULT '0' NOT NULL,
	"stock_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"base_unit" varchar(32) DEFAULT 'piece' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_solar_installer" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"service_areas" json,
	"commission_rate" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_solar_lead" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"location" text NOT NULL,
	"status" "solar_lead_status" DEFAULT 'SURVEY_REQUESTED' NOT NULL,
	"estimate_input" json NOT NULL,
	"estimate_result" json NOT NULL,
	"attribution" json,
	"preferred_survey_slots" json,
	"assigned_installer_id" varchar(255),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_unit_conversion" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"product_variant_id" varchar(255) NOT NULL,
	"unit_name" varchar(32) NOT NULL,
	"factor_to_base" numeric(14, 4) NOT NULL,
	"selling_price" numeric(12, 2)
);
--> statement-breakpoint
ALTER TABLE "alswap-inventory_category" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "client_order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "created_by_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "is_historical_import" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "wholesale_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "base_unit" varchar(32) DEFAULT 'piece' NOT NULL;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "specifications" json;--> statement-breakpoint
ALTER TABLE "alswap-inventory_tenant" ADD COLUMN "custom_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "alswap-inventory_document_job" ADD CONSTRAINT "alswap-inventory_document_job_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_document_job" ADD CONSTRAINT "alswap-inventory_document_job_uploaded_by_user_id_alswap-inventory_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."alswap-inventory_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_document_job" ADD CONSTRAINT "alswap-inventory_document_job_approved_by_user_id_alswap-inventory_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."alswap-inventory_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_inventory_movement" ADD CONSTRAINT "alswap-inventory_inventory_movement_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_inventory_movement" ADD CONSTRAINT "alswap-inventory_inventory_movement_product_variant_id_alswap-inventory_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."alswap-inventory_product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_inventory_movement" ADD CONSTRAINT "alswap-inventory_inventory_movement_created_by_user_id_alswap-inventory_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."alswap-inventory_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product_variant" ADD CONSTRAINT "alswap-inventory_product_variant_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_product_variant" ADD CONSTRAINT "alswap-inventory_product_variant_productId_alswap-inventory_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."alswap-inventory_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_solar_installer" ADD CONSTRAINT "alswap-inventory_solar_installer_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_solar_lead" ADD CONSTRAINT "alswap-inventory_solar_lead_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_solar_lead" ADD CONSTRAINT "alswap-inventory_solar_lead_assigned_installer_id_alswap-inventory_solar_installer_id_fk" FOREIGN KEY ("assigned_installer_id") REFERENCES "public"."alswap-inventory_solar_installer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_unit_conversion" ADD CONSTRAINT "alswap-inventory_unit_conversion_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_unit_conversion" ADD CONSTRAINT "alswap-inventory_unit_conversion_product_variant_id_alswap-inventory_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."alswap-inventory_product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_job_tenant_status_idx" ON "alswap-inventory_document_job" USING btree ("tenantId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "document_job_tenant_hash_idx" ON "alswap-inventory_document_job" USING btree ("tenantId","sha256");--> statement-breakpoint
CREATE INDEX "inventory_movement_tenant_created_idx" ON "alswap-inventory_inventory_movement" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "inventory_movement_variant_created_idx" ON "alswap-inventory_inventory_movement" USING btree ("product_variant_id","createdAt");--> statement-breakpoint
CREATE INDEX "product_variant_tenant_idx" ON "alswap-inventory_product_variant" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "product_variant_product_idx" ON "alswap-inventory_product_variant" USING btree ("productId");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_tenant_sku_idx" ON "alswap-inventory_product_variant" USING btree ("tenantId","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_tenant_barcode_idx" ON "alswap-inventory_product_variant" USING btree ("tenantId","barcode");--> statement-breakpoint
INSERT INTO "alswap-inventory_product_variant" ("id", "tenantId", "productId", "name", "sku", "barcode", "retail_price", "average_unit_cost", "stock_quantity", "base_unit", "is_active", "createdAt")
SELECT p."id" || '-default', p."tenantId", p."id", 'Default', p."sku", p."barcode", p."price", p."cost_price", p."stockQuantity", COALESCE(p."base_unit", 'piece'), true, p."createdAt"
FROM "alswap-inventory_product" p
WHERE NOT EXISTS (SELECT 1 FROM "alswap-inventory_product_variant" v WHERE v."productId" = p."id");--> statement-breakpoint
CREATE INDEX "solar_installer_tenant_idx" ON "alswap-inventory_solar_installer" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "solar_lead_tenant_status_idx" ON "alswap-inventory_solar_lead" USING btree ("tenantId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_conversion_variant_unit_idx" ON "alswap-inventory_unit_conversion" USING btree ("product_variant_id","unit_name");--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD CONSTRAINT "alswap-inventory_order_created_by_user_id_alswap-inventory_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."alswap-inventory_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_tenant_client_id_idx" ON "alswap-inventory_order" USING btree ("tenantId","client_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_tenant_slug_idx" ON "alswap-inventory_product" USING btree ("tenantId","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_custom_domain_idx" ON "alswap-inventory_tenant" USING btree ("custom_domain");
