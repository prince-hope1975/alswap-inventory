import { and, eq, inArray } from "drizzle-orm";

import { formatMoney, isPlaceholderEmail, orderNumber } from "~/lib/domain/checkout";
import type { db as appDb } from "~/server/db";
import { adminNotifications, orders, users, type tenants } from "~/server/db/schema";
import {
  sendNewOrderStaffEmail,
  sendOrderConfirmationEmail,
  type OrderEmailInput,
} from "~/server/email";

type Database = typeof appDb;
type Tenant = typeof tenants.$inferSelect;

export type StockShortfall = { productId: string; name: string; wanted: number };

/**
 * Tell staff (in-app + email) and, for paid Paystack orders, the shopper
 * (email, if given) about a new storefront order. Call exactly once per order: on creation for
 * pay-on-pickup, and from the caller that wins the PENDING→COMPLETED update
 * for online payments. Never throws: a failed notification must not fail an
 * order the customer already placed or paid for.
 */
export async function notifyOrderPlaced(input: {
  db: Database;
  tenant: Tenant;
  orderId: string;
  shortfalls?: StockShortfall[];
}) {
  const { db, tenant } = input;
  try {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, input.orderId), eq(orders.tenantId, tenant.id)),
      with: { items: { with: { product: { columns: { name: true } } } } },
    });
    if (!order) return;

    const money = (value: string | number | null | undefined) =>
      formatMoney(value, tenant.currency);
    const number = orderNumber(order.id);
    const shortfalls = input.shortfalls ?? [];
    const customerEmail = isPlaceholderEmail(order.customerEmail)
      ? null
      : order.customerEmail;
    const paymentMethod =
      order.paymentMethod === "PAY_ON_PICKUP" ? "PAY_ON_PICKUP" : "PAYSTACK";

    const emailInput: OrderEmailInput = {
      tenantName: tenant.name,
      orderNumber: number,
      customerName: order.customerName ?? "Customer",
      customerEmail,
      customerPhone: order.customerPhone,
      items: order.items.map((item) => ({
        name: item.product?.name ?? "Item",
        quantity: item.quantity,
        unitPrice: money(item.price),
      })),
      total: money(order.totalAmount),
      deliveryFee: order.deliveryFee ? money(order.deliveryFee) : null,
      deliveryMethod: order.deliveryMethod,
      paymentMethod,
      deliveryAddress: order.deliveryAddress,
      pickupAddress: tenant.address,
      storePhone: tenant.phone,
    };

    await db.insert(adminNotifications).values({
      tenantId: tenant.id,
      type: order.deliveryMethod === "DELIVERY" ? "DELIVERY_ORDER" : "NEW_ORDER",
      title:
        order.deliveryMethod === "DELIVERY"
          ? `New delivery order #${number}`
          : `New pickup order #${number}`,
      message: `${emailInput.customerName} · ${emailInput.total} · ${paymentMethod === "PAYSTACK" ? "paid online" : "pay on pickup"}`,
      data: {
        orderId: order.id,
        customer: {
          name: order.customerName,
          email: customerEmail,
          phone: order.customerPhone,
        },
        deliveryAddress: order.deliveryAddress,
        paymentMethod,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee,
      },
    });

    if (shortfalls.length > 0) {
      await db.insert(adminNotifications).values({
        tenantId: tenant.id,
        type: "ORDER_NEEDS_ATTENTION",
        title: `Order #${number} paid but stock ran out`,
        message: `Not enough stock for: ${shortfalls.map((s) => `${s.name} (×${s.wanted})`).join(", ")}. Contact the customer to arrange a refund or substitute.`,
        data: { orderId: order.id, shortfalls },
      });
    }

    const staff = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenant.id),
        inArray(users.role, ["ADMIN", "MANAGER"]),
      ),
      columns: { email: true },
    });
    const staffEmails = staff
      .map((member) => member.email)
      .filter((email): email is string => Boolean(email));

    // Pay-on-pickup orders are anonymous and unverified: emailing whatever
    // address was typed would let anyone use the store as a spam relay. Only
    // Paystack orders (a verified payment) get a customer confirmation.
    const confirmCustomer = paymentMethod === "PAYSTACK" && customerEmail != null;

    await Promise.allSettled([
      sendNewOrderStaffEmail({ ...emailInput, to: staffEmails }),
      confirmCustomer
        ? sendOrderConfirmationEmail({ ...emailInput, to: customerEmail })
        : Promise.resolve(),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Failed to send order email:", result.reason);
        }
      }
    });
  } catch (error) {
    console.error("Failed to send order notifications:", error);
  }
}
