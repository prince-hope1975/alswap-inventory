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
  customerEmail: string;
  customerPhone?: string;
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
          <p style="margin:0 0 8px 0;"><b>Customer:</b> ${input.customerName} (${input.customerEmail})</p>
          ${input.customerPhone ? `<p style="margin:0 0 8px 0;"><b>Phone:</b> ${input.customerPhone}</p>` : ""}
          <p style="margin:0;"><b>Delivery Address:</b> ${input.deliveryAddress}</p>
        </div>
      </div>
    `,
  });
};