import { Resend } from "resend";
import { env } from "~/env";

export const resend = new Resend(env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email: string, token: string) => {
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY is not set. Skipping email sending.");
    console.log(`Reset Link: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`);
    return;
  }

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset your password</h2>
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

