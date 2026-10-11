import { Resend } from "resend";
import { env } from "~/env";

export const resend = new Resend(env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (input: {
  email: string;
  token: string;
  /** Origin of the host the request came from, so the link lands on the surface the user was on. */
  baseUrl: string;
  tenantName: string | null;
}) => {
  const { email, token, tenantName } = input;
  const baseUrl = input.baseUrl || "http://localhost:3000";
  const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;
  // Without the store name an unbranded reset from an unfamiliar sender
  // domain reads as phishing.
  const forStore = tenantName ? ` for ${tenantName}` : "";

  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY is not set. Skipping email sending.");
    console.log(`Reset Link: ${resetLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: tenantName
        ? `Reset your ${tenantName} password`
        : "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset your password${forStore}</h2>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <p>
            <a href="${resetLink}" style="background-color: #9333EA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If you didn't request this, you can safely ignore this email.
            The link expires in 1 hour.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 40px;">
            <a href="${resetLink}">${resetLink}</a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

export const sendDeliveryOrderEmail = async (input: {
  to: string[];
  tenantName: string;
  orderId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalAmount: string;
  deliveryAddress: string;
}) => {
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY is not set. Skipping email sending.");
    console.log("Delivery order:", input);
    return;
  }

  const subject = `New delivery order - ${input.tenantName}`;

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto;">
        <h2 style="margin:0 0 8px 0;">New delivery order</h2>
        <p style="margin:0 0 16px 0; color:#555;">
          A customer placed a delivery order on <b>${input.tenantName}</b>.
        </p>

        <div style="border:1px solid #eee; border-radius:12px; padding:16px;">
          <p style="margin:0 0 8px 0;"><b>Order ID:</b> ${input.orderId}</p>
          <p style="margin:0 0 8px 0;"><b>Total:</b> ${input.totalAmount}</p>
          <p style="margin:0 0 8px 0;"><b>Customer:</b> ${escapeHtml(input.customerName)}${input.customerEmail ? ` (${escapeHtml(input.customerEmail)})` : ""}</p>
          ${input.customerPhone ? `<p style="margin:0 0 8px 0;"><b>Phone:</b> ${escapeHtml(input.customerPhone)}</p>` : ""}
          <p style="margin:0;"><b>Delivery Address:</b> ${escapeHtml(input.deliveryAddress)}</p>
        </div>
      </div>
    `,
  });
};

/** Customer-typed values go into HTML email bodies; never let them become markup. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OrderEmailInput = {
  tenantName: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: { name: string; quantity: number; unitPrice: string }[];
  /** Pre-formatted money strings, e.g. "₦12,500". */
  total: string;
  deliveryFee?: string | null;
  deliveryMethod: "PICKUP" | "DELIVERY";
  paymentMethod: "PAYSTACK" | "PAY_ON_PICKUP";
  deliveryAddress?: string | null;
  pickupAddress?: string | null;
  storePhone?: string | null;
};

function orderEmailBody(input: OrderEmailInput, intro: string) {
  const rows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td style="padding:6px 0; text-align:right;">${escapeHtml(item.unitPrice)}</td>
        </tr>`,
    )
    .join("");
  const payment =
    input.paymentMethod === "PAYSTACK" ? "Paid online" : "Pay on pickup";
  const fulfilment =
    input.deliveryMethod === "DELIVERY"
      ? `<p style="margin:0 0 8px 0;"><b>Delivery to:</b> ${escapeHtml(input.deliveryAddress ?? "")}</p>`
      : input.pickupAddress
        ? `<p style="margin:0 0 8px 0;"><b>Pickup at:</b> ${escapeHtml(input.pickupAddress)}</p>`
        : `<p style="margin:0 0 8px 0;"><b>Pickup</b></p>`;

  return `
    <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto;">
      <h2 style="margin:0 0 8px 0;">Order #${escapeHtml(input.orderNumber)}</h2>
      <p style="margin:0 0 16px 0; color:#555;">${intro}</p>
      <div style="border:1px solid #eee; border-radius:12px; padding:16px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">${rows}</table>
        ${input.deliveryFee ? `<p style="margin:8px 0 0 0;"><b>Delivery fee:</b> ${escapeHtml(input.deliveryFee)}</p>` : ""}
        <p style="margin:8px 0 12px 0; font-size:16px;"><b>Total:</b> ${escapeHtml(input.total)} (${payment})</p>
        ${fulfilment}
        <p style="margin:0 0 8px 0;"><b>Customer:</b> ${escapeHtml(input.customerName)}</p>
        ${input.customerPhone ? `<p style="margin:0 0 8px 0;"><b>Phone:</b> ${escapeHtml(input.customerPhone)}</p>` : ""}
        ${input.customerEmail ? `<p style="margin:0;"><b>Email:</b> ${escapeHtml(input.customerEmail)}</p>` : ""}
      </div>
    </div>
  `;
}

/** Confirmation to the shopper. Skipped when they gave no email. */
export const sendOrderConfirmationEmail = async (
  input: OrderEmailInput & { to: string | null | undefined },
) => {
  if (!input.to) return;
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY is not set. Skipping email sending.");
    console.log("Order confirmation:", input.orderNumber);
    return;
  }

  const contact = input.storePhone
    ? ` Questions? Call or WhatsApp ${escapeHtml(input.storePhone)}.`
    : "";
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: `Your ${input.tenantName} order #${input.orderNumber}`,
    html: orderEmailBody(
      input,
      `Thanks for your order with <b>${escapeHtml(input.tenantName)}</b>.${contact}`,
    ),
  });
};

/** New-order alert to store staff, for every storefront order. */
export const sendNewOrderStaffEmail = async (
  input: OrderEmailInput & { to: string[] },
) => {
  if (input.to.length === 0) return;
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY is not set. Skipping email sending.");
    console.log("New order:", input.orderNumber);
    return;
  }

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: `New ${input.deliveryMethod === "DELIVERY" ? "delivery" : "pickup"} order #${input.orderNumber} - ${input.tenantName}`,
    html: orderEmailBody(
      input,
      `A customer placed an order on <b>${escapeHtml(input.tenantName)}</b>.`,
    ),
  });
};
