// @vitest-environment node
import { createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as schema from "~/server/db/schema";

// Explicit disposable database only. Never fall back to DATABASE_URL/.env.
const testUrl = process.env.PAYMENT_TEST_DATABASE_URL;
const state = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
  get db() {
    return state.db;
  },
}));
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
vi.mock("~/server/utils/encryption", () => ({
  decryptString: (value: string) => value,
}));
vi.mock("~/server/email", () => ({
  sendNewOrderStaffEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
}));

import { finalizePaystackOrder, verifyPaystackTransaction } from "./paystack";
import { POST } from "~/app/api/paystack/webhook/route";
import { ordersRouter } from "~/server/api/routers/orders";

describe.skipIf(!testUrl)(
  "Paystack payment integrity (disposable PostgreSQL)",
  () => {
    let connection: ReturnType<typeof postgres>;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let tenant: typeof schema.tenants.$inferSelect;
    let initialized = false;
    const reference = "ps-security-test";

    beforeAll(async () => {
      const url = new URL(testUrl!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.pathname !== "/payment_security_test"
      ) {
        throw new Error(
          "PAYMENT_TEST_DATABASE_URL must target 127.0.0.1/payment_security_test",
        );
      }
      connection = postgres(testUrl!, { max: 5, onnotice: () => undefined });
      const [existing] = await connection<{ occupied: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
        UNION ALL
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public'
      ) AS occupied`;
      if (existing?.occupied)
        throw new Error(
          "Payment integration tests require an empty disposable database",
        );
      db = drizzle(connection, { schema });
      state.db = db;
      // The supplied database must be empty and disposable. Existing schemas
      // cause CREATE TYPE/TABLE to fail; nothing is dropped to make them fit.
      for (const file of (await readdir("drizzle"))
        .filter((name) => name.endsWith(".sql"))
        .sort()) {
        const migration = await readFile(`drizzle/${file}`, "utf8");
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) await connection.unsafe(statement);
        }
      }
      initialized = true;
    }, 30_000);

    beforeEach(async () => {
      await connection`TRUNCATE "alswap-inventory_tenant" CASCADE`;
      await connection`DROP TRIGGER IF EXISTS fail_order_notice ON "alswap-inventory_admin_notification"`;
      const [created] = await db
        .insert(schema.tenants)
        .values({
          id: "tenant-test",
          name: "Payment test",
          slug: "payment-test",
          paystackSecretKey: "sk_test_fixture",
        })
        .returning();
      tenant = created!;
      vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
    afterAll(async () => {
      if (connection) {
        if (initialized) {
          await connection`DROP SCHEMA public CASCADE`;
          await connection`CREATE SCHEMA public`;
        }
        await connection.end();
      }
    });

    async function order(stock = 5, quantity = 2) {
      await db.insert(schema.products).values({
        id: "product-test",
        tenantId: tenant.id,
        name: "Test item",
        slug: "test-item",
        price: "100",
        stockQuantity: stock,
        visibility: "PUBLISHED",
      });
      await db.insert(schema.orders).values({
        id: "order-test",
        tenantId: tenant.id,
        totalAmount: "200.00",
        status: "PENDING",
        paymentMethod: "PAYSTACK",
        paymentReference: reference,
      });
      await db
        .insert(schema.orderItems)
        .values({
          orderId: "order-test",
          productId: "product-test",
          quantity,
          price: "100",
        });
    }

    function paidFetch(beforeResponse?: () => Promise<void>) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          await beforeResponse?.();
          return Response.json({
            status: true,
            data: { status: "success", reference, amount: 20_000 },
          });
        }),
      );
    }

    async function webhook() {
      const body = JSON.stringify({
        event: "charge.success",
        data: { reference },
      });
      return POST(
        new Request("http://localhost/api/paystack/webhook", {
          method: "POST",
          body,
          headers: {
            "x-paystack-signature": createHmac("sha512", "sk_test_fixture")
              .update(body)
              .digest("hex"),
          },
        }),
      );
    }

    async function cancel() {
      return ordersRouter
        .createCaller({
          db,
          headers: new Headers(),
          session: {
            expires: "2099-01-01",
            user: { id: "manager-test", tenantId: tenant.id, role: "MANAGER" },
          },
        })
        .updateStatus({ id: "order-test", status: "CANCELLED" });
    }

    it.each([429, 500, 503])(
      "returns retryable webhook failure for verification HTTP %s, then completes on retry",
      async (status) => {
        await order();
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => Response.json({ status: false }, { status })),
        );
        expect((await webhook()).status).toBe(500);
        expect((await db.query.orders.findFirst())?.status).toBe("PENDING");
        paidFetch();
        expect((await webhook()).status).toBe(200);
        expect((await db.query.orders.findFirst())?.status).toBe("COMPLETED");
        expect((await db.query.products.findFirst())?.stockQuantity).toBe(3);
      },
    );

    it("does not acknowledge malformed provider JSON as a definitive rejection", async () => {
      await order();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("bad json", { status: 200 })),
      );
      expect((await webhook()).status).toBe(500);
    });

    it("retries a transport failure without completing the order", async () => {
      await order();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("connection reset");
        }),
      );
      expect((await webhook()).status).toBe(500);
      expect((await db.query.orders.findFirst())?.status).toBe("PENDING");
    });

    it("retries an inconclusive transaction status but acknowledges a definitive failure", async () => {
      await order();
      for (const status of ["pending", "failed"]) {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            Response.json({
              status: true,
              data: { status, reference, amount: 20_000 },
            }),
          ),
        );
        expect((await webhook()).status).toBe(status === "pending" ? 500 : 200);
      }
      expect((await db.query.orders.findFirst())?.status).toBe("PENDING");
    });

    it("treats structurally invalid verification responses as retryable", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ status: true, data: {} })),
      );
      await expect(
        verifyPaystackTransaction("sk_test_fixture", reference),
      ).rejects.toThrow();
    });

    it("reports cancellation winning during verification and durably alerts staff", async () => {
      await order();
      paidFetch(async () => {
        await cancel();
      });
      const result = await finalizePaystackOrder({ db, tenant, reference });
      expect(result.outcome).toBe("needs_attention");
      expect((await db.query.orders.findFirst())?.status).toBe("CANCELLED");
      expect((await db.query.products.findFirst())?.stockQuantity).toBe(5);
      expect(
        await db.query.adminNotifications.findMany({
          where: eq(schema.adminNotifications.type, "ORDER_NEEDS_ATTENTION"),
        }),
      ).toHaveLength(1);
    });

    it("does not restore undeducted shortfall stock when post-commit notification fails", async () => {
      await order(1);
      await connection.unsafe(`CREATE OR REPLACE FUNCTION fail_order_notice() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'NEW_ORDER' THEN RAISE EXCEPTION 'notification failure'; END IF; RETURN NEW; END $$`);
      await connection.unsafe(`CREATE TRIGGER fail_order_notice BEFORE INSERT ON "alswap-inventory_admin_notification"
      FOR EACH ROW EXECUTE FUNCTION fail_order_notice()`);
      paidFetch();
      expect(
        (await finalizePaystackOrder({ db, tenant, reference })).outcome,
      ).toBe("needs_attention");
      await cancel();
      expect((await db.query.products.findFirst())?.stockQuantity).toBe(1);
      expect((await db.query.orders.findFirst())?.status).toBe("CANCELLED");
    });

    it("rolls back completion if durable shortfall evidence cannot be persisted", async () => {
      await order(1);
      await db.insert(schema.products).values({
        id: "available-product",
        tenantId: tenant.id,
        name: "Available item",
        slug: "available-item",
        price: "100",
        stockQuantity: 5,
        visibility: "PUBLISHED",
      });
      await db
        .insert(schema.orderItems)
        .values({
          orderId: "order-test",
          productId: "available-product",
          quantity: 2,
          price: "100",
        });
      await connection.unsafe(`CREATE OR REPLACE FUNCTION fail_order_notice() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.type = 'ORDER_NEEDS_ATTENTION' THEN RAISE EXCEPTION 'evidence failure'; END IF; RETURN NEW; END $$`);
      await connection.unsafe(`CREATE TRIGGER fail_order_notice BEFORE INSERT ON "alswap-inventory_admin_notification"
      FOR EACH ROW EXECUTE FUNCTION fail_order_notice()`);
      paidFetch();
      await expect(
        finalizePaystackOrder({ db, tenant, reference }),
      ).rejects.toThrow();
      expect((await db.query.orders.findFirst())?.status).toBe("PENDING");
      expect(
        (
          await db.query.products.findFirst({
            where: eq(schema.products.id, "product-test"),
          })
        )?.stockQuantity,
      ).toBe(1);
      expect(
        (
          await db.query.products.findFirst({
            where: eq(schema.products.id, "available-product"),
          })
        )?.stockQuantity,
      ).toBe(5);
    });

    it("concurrent client/webhook finalizers deduct and cancellation restores exactly once", async () => {
      await order();
      paidFetch();
      const results = await Promise.all([
        finalizePaystackOrder({ db, tenant, reference }),
        finalizePaystackOrder({ db, tenant, reference }),
      ]);
      expect(results.map((result) => result.outcome).sort()).toEqual([
        "already_completed",
        "completed",
      ]);
      expect((await db.query.products.findFirst())?.stockQuantity).toBe(3);
      await cancel();
      await cancel();
      expect((await db.query.products.findFirst())?.stockQuantity).toBe(5);
    });
  },
);
