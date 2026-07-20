CREATE TABLE "alswap-inventory_article" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text,
	"cover_image" varchar(500),
	"author_name" varchar(255),
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alswap-inventory_review" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenantId" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerEmail" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"body" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ADD COLUMN "sale_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "alswap-inventory_article" ADD CONSTRAINT "alswap-inventory_article_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_review" ADD CONSTRAINT "alswap-inventory_review_tenantId_alswap-inventory_tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."alswap-inventory_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alswap-inventory_review" ADD CONSTRAINT "alswap-inventory_review_productId_alswap-inventory_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."alswap-inventory_product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_tenant_idx" ON "alswap-inventory_article" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "article_slug_idx" ON "alswap-inventory_article" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "review_tenant_idx" ON "alswap-inventory_review" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "review_product_idx" ON "alswap-inventory_review" USING btree ("productId");