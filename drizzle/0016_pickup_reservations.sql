ALTER TABLE "alswap-inventory_order" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alswap-inventory_order" ADD COLUMN "cancellation_reason" varchar(50);--> statement-breakpoint
CREATE INDEX "order_expiry_idx" ON "alswap-inventory_order" USING btree ("paymentMethod","status","expires_at");
--> statement-breakpoint
UPDATE "alswap-inventory_order" SET "expires_at" = now() + interval '24 hours' WHERE "paymentMethod" = 'PAY_ON_PICKUP' AND "status" = 'PENDING' AND "expires_at" IS NULL;
