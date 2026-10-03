import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export async function sendEmailChangeCode(to: string, code: string): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    throw new AppError(
      "Email changes are temporarily unavailable because email delivery is not configured.",
      503,
      "EMAIL_DELIVERY_NOT_CONFIGURED"
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [to],
        subject: "Verify your new SquadLink email address",
        text: `Your SquadLink email change verification code is ${code}. It expires in 15 minutes. If you did not request this change, ignore this message.`,
      }),
    });
  } catch {
    throw new AppError(
      "We could not send the verification email. Please try again later.",
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }

  if (!response.ok) {
    console.error("[EMAIL CHANGE DELIVERY FAILED]", { providerStatus: response.status });
    throw new AppError(
      "We could not send the verification email. Please try again later.",
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
}