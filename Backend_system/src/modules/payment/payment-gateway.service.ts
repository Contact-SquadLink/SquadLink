import { createHmac } from "node:crypto";
import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";
import { emailAddressSchema } from "../../utils/email-address";
import { processProviderPayment } from "../lifecycle/lifecycle.service";

export function getPaystackSecretKey(): string | undefined {
  return (
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    process.env.PAYSTACK_KEY ||
    process.env.PAYSTACK_SK ||
    process.env.PSTK_SECRET_KEY
  );
}

export function getFlutterwaveSecretKey(): string | undefined {
  return (
    process.env.FLUTTERWAVE_SECRET_KEY ||
    process.env.FLW_SECRET_KEY ||
    process.env.FLW_SECK
  );
}

export function getFlutterwaveSecretHash(): string | undefined {
  return (
    process.env.FLUTTERWAVE_SECRET_HASH ||
    process.env.FLW_SECRET_HASH ||
    process.env.FLW_HASH
  );
}

export function resolvePaystackCustomerEmail(email: string | null, userId: string): string {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && emailAddressSchema.safeParse(normalizedEmail).success) {
    return normalizedEmail;
  }
  return `customer-${userId.slice(0, 8)}@squadlink.app`;
}

export type PaymentGatewayProvider = "PAYSTACK" | "FLUTTERWAVE";

export interface InitializePaymentInput {
  orderId: string;
  gateway?: PaymentGatewayProvider;
  callbackUrl?: string;
  userId: string;
}

export interface PaymentInitializationResult {
  gateway: PaymentGatewayProvider;
  checkoutUrl: string;
  reference: string;
  paymentId: string;
  paymentAttemptId: string;
  amount: number;
  currency: string;
  isSimulated: false;
}

/**
 * Initializes a checkout transaction with Paystack or Flutterwave
 */
export async function initializePaymentGatewayTransaction(
  input: InitializePaymentInput
): Promise<PaymentInitializationResult> {
  const gateway: PaymentGatewayProvider = input.gateway ?? "PAYSTACK";

  // Load order and pending payment
  const orderResult = await db.query<{
    order_id: string;
    total_amount: number | string;
    currency: string;
    order_status: string;
    user_id: string;
    user_email: string | null;
    user_phone: string | null;
    payment_id: string;
    payment_status: string;
    payment_attempt_id: string;
  }>(
    `SELECT
       o.id AS order_id,
       o.total_amount,
       o.currency,
       o.status AS order_status,
       o.user_id,
       u.email AS user_email,
       u.phone_number AS user_phone,
       p.id AS payment_id,
       p.status AS payment_status,
       pa.id AS payment_attempt_id
     FROM public.orders o
     INNER JOIN public.users u ON u.id = o.user_id
     INNER JOIN public.payments p ON p.order_id = o.id
     INNER JOIN public.payment_attempts pa ON pa.payment_id = p.id
     WHERE o.id = $1 AND o.user_id = $2
     ORDER BY pa.created_at DESC
     LIMIT 1`,
    [input.orderId, input.userId]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError("Order or payment not found.", 404, "ORDER_NOT_FOUND");
  }

  const order = orderResult.rows[0];

  if (order.order_status !== "PENDING") {
    throw new AppError(
      `Order is in status ${order.order_status} and cannot be initialized for payment.`,
      409,
      "ORDER_NOT_PENDING"
    );
  }

  const totalAmount = Number(order.total_amount);
  const fallbackEmail = `customer-${order.user_id.slice(0, 8)}@squadlink.app`;
  const email = order.user_email || fallbackEmail;
  const reference = `sqlink_${gateway.toLowerCase()}_${order.order_id.slice(0, 8)}_${Date.now()}`;
  const callbackUrl = input.callbackUrl || `http://localhost:5173/orders/${order.order_id}`;

  let checkoutUrl: string;

  if (gateway === "PAYSTACK") {
    const paystackSecret = getPaystackSecretKey();
    const paystackEmail = resolvePaystackCustomerEmail(order.user_email, order.user_id);
    const normalizedAccountEmail = order.user_email?.trim().toLowerCase();
    let paystackEmailSource = normalizedAccountEmail === paystackEmail ? "account" : "fallback";
    if (!paystackSecret || paystackSecret.includes("YOUR_")) {
      throw new AppError(
        "Paystack payment gateway is not configured on this server. Please contact the platform administrator.",
        503,
        "PAYSTACK_NOT_CONFIGURED"
      );
    }

    try {
      const initializeWithEmail = async (customerEmail: string) => {
        const providerResponse = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail,
            amount: Math.round(totalAmount * 100), // in kobo
            reference,
            callback_url: callbackUrl,
            metadata: {
              orderId: order.order_id,
              paymentId: order.payment_id,
              paymentAttemptId: order.payment_attempt_id,
              userId: order.user_id,
            },
          }),
        });
        const providerData = (await providerResponse.json()) as {
          status: boolean;
          message?: string;
          data?: { authorization_url?: string; reference?: string };
        };
        return { response: providerResponse, data: providerData };
      };

      let { response, data } = await initializeWithEmail(paystackEmail);
      if (
        !response.ok &&
        paystackEmail !== fallbackEmail &&
        data.message?.toLowerCase().includes("email")
      ) {
        paystackEmailSource = "fallback_retry";
        console.warn("[PAYSTACK EMAIL REJECTED; RETRYING WITH FALLBACK]", {
          deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
          httpStatus: response.status,
          providerMessage: data.message,
        });
        ({ response, data } = await initializeWithEmail(fallbackEmail));
      }

      const authorizationUrl = data.data?.authorization_url;
      let isValidCheckoutUrl = false;
      if (authorizationUrl) {
        try {
          const parsedUrl = new URL(authorizationUrl);
          isValidCheckoutUrl =
            parsedUrl.protocol === "https:" && parsedUrl.hostname === "checkout.paystack.com";
        } catch {
          isValidCheckoutUrl = false;
        }
      }

      if (response.ok && data.status && isValidCheckoutUrl && authorizationUrl) {
        checkoutUrl = authorizationUrl;
      } else if (response.ok && data.status && authorizationUrl) {
        throw new AppError(
          "Paystack returned an invalid checkout URL. Please retry or contact the platform administrator.",
          502,
          "PAYSTACK_INVALID_CHECKOUT_URL"
        );
      } else {
        console.warn("[PAYSTACK INITIALIZATION FAILED]", {
          deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
          emailSource: paystackEmailSource,
          httpStatus: response.status,
          providerMessage: data.message ?? null,
        });
        throw new AppError(
          `Paystack declined this transaction (HTTP ${response.status}): ${data.message || "Unable to create payment authorization. Check that your Paystack secret key is active and the account is verified."}`,
          502,
          "PAYSTACK_INITIALIZATION_FAILED"
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Unable to connect to Paystack: ${err instanceof Error ? err.message : "Network error"}. Please try again in a moment.`,
        502,
        "PAYSTACK_GATEWAY_UNREACHABLE"
      );
    }
  } else {
    // Flutterwave
    const flwSecret = getFlutterwaveSecretKey();
    if (!flwSecret || flwSecret.includes("YOUR_")) {
      throw new AppError(
        "Flutterwave payment gateway is not configured on this server. Please contact the platform administrator.",
        503,
        "FLUTTERWAVE_NOT_CONFIGURED"
      );
    }

    try {
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flwSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: totalAmount,
          currency: "NGN",
          redirect_url: callbackUrl,
          customer: {
            email,
            phonenumber: order.user_phone || "08000000000",
            name: email,
          },
          meta: {
            orderId: order.order_id,
            paymentId: order.payment_id,
            paymentAttemptId: order.payment_attempt_id,
            userId: order.user_id,
          },
          customizations: {
            title: "SquadLink Delivery",
            description: `Payment for Order #${order.order_id.slice(0, 8)}`,
          },
        }),
      });

      const data = (await response.json()) as {
        status: string;
        message?: string;
        data?: { link: string };
      };

      if (data.status === "success" && data.data?.link) {
        checkoutUrl = data.data.link;
      } else {
        throw new AppError(
          `Flutterwave declined this transaction: ${data.message || "Unable to create payment session. Check that your Flutterwave secret key is active."}`,
          502,
          "FLUTTERWAVE_INITIALIZATION_FAILED"
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Unable to connect to Flutterwave: ${err instanceof Error ? err.message : "Network error"}. Please try again in a moment.`,
        502,
        "FLUTTERWAVE_GATEWAY_UNREACHABLE"
      );
    }
  }

  // Update payment attempt record with provider and reference
  await db.query(
    `UPDATE public.payment_attempts
     SET provider = $1,
         provider_reference = $2,
         status = 'PENDING'
     WHERE id = $3`,
    [gateway.toLowerCase(), reference, order.payment_attempt_id]
  );

  return {
    gateway,
    checkoutUrl,
    reference,
    paymentId: order.payment_id,
    paymentAttemptId: order.payment_attempt_id,
    amount: totalAmount,
    currency: order.currency,
    isSimulated: false as const,
  };
}

/**
 * Cryptographic HMAC SHA-512 verification for Paystack webhooks
 */
export function verifyPaystackSignature(rawBody: string, signature: string): boolean {
  const secret = getPaystackSecretKey() || "sk_test_paystack_default";
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

/**
 * Secret token / hash verification for Flutterwave webhooks
 */
export function verifyFlutterwaveSignature(receivedHash: string): boolean {
  const secretHash = getFlutterwaveSecretHash() || "sqlink_flw_secret_token";
  return Boolean(receivedHash) && receivedHash === secretHash;
}

/**
 * Ingestion handler for Paystack webhooks (/api/v1/payments/paystack/webhook)
 * Enforces the Pre-Payment Safeguard: only 'charge.success' confirms the order.
 */
export async function processPaystackWebhook(eventData: Record<string, unknown>) {
  const event = String(eventData.event || "");
  const data = (typeof eventData.data === "object" && eventData.data !== null ? eventData.data : {}) as Record<string, unknown>;

  if (event !== "charge.success" || data.status !== "success") {
    // If charge failed or other event, we handle failure or ignore non-payment events
    if (event === "charge.failed" || data.status === "failed") {
      const reference = String(data.reference || "");
      const attempt = await findPaymentAttemptByReference(reference);
      if (attempt) {
        await processProviderPayment("SYSTEM", attempt.payment_id, {
          providerEventId: `ps-${reference}-fail`,
          paymentAttemptId: attempt.id,
          status: "FAILED",
          providerReference: reference,
          failureReason: String(data.gateway_response || "Paystack reported payment failure"),
        });
      }
    }
    return { status: "ignored", event };
  }

  const reference = String(data.reference || "");
  const attempt = await findPaymentAttemptByReference(reference);
  if (!attempt) {
    throw new AppError("No payment attempt found for reference.", 404, "PAYMENT_ATTEMPT_NOT_FOUND");
  }

  // Pre-payment safeguard: Transition order to CONFIRMED and alert merchant only upon verified charge.success
  const result = await processProviderPayment("SYSTEM", attempt.payment_id, {
    providerEventId: `ps-${reference}`,
    paymentAttemptId: attempt.id,
    status: "SUCCESS",
    providerReference: reference,
  });

  return { status: "processed", result };
}

/**
 * Ingestion handler for Flutterwave webhooks (/api/v1/payments/flutterwave/webhook)
 */
export async function processFlutterwaveWebhook(eventData: Record<string, unknown>) {
  const event = String(eventData.event || "");
  const data = (typeof eventData.data === "object" && eventData.data !== null ? eventData.data : {}) as Record<string, unknown>;

  const isSuccess = data.status === "successful" || data.status === "success";

  if (!isSuccess) {
    const txRef = String(data.tx_ref || "");
    const attempt = await findPaymentAttemptByReference(txRef);
    if (attempt) {
      await processProviderPayment("SYSTEM", attempt.payment_id, {
        providerEventId: `flw-${txRef}-fail`,
        paymentAttemptId: attempt.id,
        status: "FAILED",
        providerReference: txRef,
        failureReason: "Flutterwave reported unconfirmed charge",
      });
    }
    return { status: "ignored", event };
  }

  const txRef = String(data.tx_ref || "");
  const attempt = await findPaymentAttemptByReference(txRef);
  if (!attempt) {
    throw new AppError("No payment attempt found for reference.", 404, "PAYMENT_ATTEMPT_NOT_FOUND");
  }

  const result = await processProviderPayment("SYSTEM", attempt.payment_id, {
    providerEventId: `flw-${txRef}`,
    paymentAttemptId: attempt.id,
    status: "SUCCESS",
    providerReference: txRef,
  });

  return { status: "processed", result };
}

async function findPaymentAttemptByReference(reference: string) {
  if (!reference) return null;
  const result = await db.query<{ id: string; payment_id: string; status: string }>(
    `SELECT id, payment_id, status FROM public.payment_attempts WHERE provider_reference = $1 LIMIT 1`,
    [reference]
  );
  return result.rows[0] ?? null;
}

/**
 * Payment Verification / Frontend Callback Polling Endpoint
 * Queries Paystack/Flutterwave directly if still pending to guarantee instant order confirmation upon return.
 */
export async function verifyPaymentReference(reference: string, userId: string) {
  const result = await db.query<{
    payment_id: string;
    order_id: string;
    payment_status: string;
    order_status: string;
    amount: number | string;
    provider: string | null;
  }>(
    `SELECT
       p.id AS payment_id,
       p.order_id,
       p.status AS payment_status,
       o.status AS order_status,
       p.amount,
       pa.provider
     FROM public.payment_attempts pa
     INNER JOIN public.payments p ON p.id = pa.payment_id
     INNER JOIN public.orders o ON o.id = p.order_id
     WHERE pa.provider_reference = $1 AND o.user_id = $2
     LIMIT 1`,
    [reference, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Payment reference not found.", 404, "PAYMENT_REFERENCE_NOT_FOUND");
  }

  const row = result.rows[0];
  let currentPaymentStatus = row.payment_status;
  let currentOrderStatus = row.order_status;

  // Direct Paystack verification fallback if payment hasn't cleared yet via webhook
  if (currentPaymentStatus === "PENDING" || currentOrderStatus === "PENDING") {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret && !paystackSecret.includes("YOUR_") && (row.provider === "paystack" || reference.startsWith("sqlink_paystack"))) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
        });
        const psData = (await response.json()) as {
          status: boolean;
          data?: { status: string; reference: string; amount: number; gateway_response?: string };
        };

        if (psData.status && psData.data?.status === "success") {
          const attempt = await findPaymentAttemptByReference(reference);
          if (attempt && attempt.status !== "SUCCESS") {
            await processProviderPayment(userId, attempt.payment_id, {
              providerEventId: `ps-verify-${reference}`,
              paymentAttemptId: attempt.id,
              status: "SUCCESS",
              providerReference: reference,
            });
            currentPaymentStatus = "AUTHORIZED";
            currentOrderStatus = "CONFIRMED";
          }
        } else if (
          psData.status &&
          (psData.data?.status === "failed" || psData.data?.status === "reversed" || psData.data?.status === "abandoned")
        ) {
          const attempt = await findPaymentAttemptByReference(reference);
          if (attempt && attempt.status !== "FAILED") {
            await processProviderPayment(userId, attempt.payment_id, {
              providerEventId: `ps-verify-fail-${reference}`,
              paymentAttemptId: attempt.id,
              status: "FAILED",
              providerReference: reference,
              failureReason: psData.data?.gateway_response || "Paystack reported payment failure",
            });
            currentPaymentStatus = "FAILED";
            currentOrderStatus = "CANCELLED";
          }
        }
      } catch (err) {
        console.error("[PAYSTACK DIRECT VERIFY ERROR]", err);
      }
    }

    // Direct Flutterwave verification fallback
    const flwSecret = getFlutterwaveSecretKey();
    if (
      flwSecret &&
      !flwSecret.includes("YOUR_") &&
      (currentPaymentStatus === "PENDING" || currentOrderStatus === "PENDING") &&
      (row.provider === "flutterwave" || reference.startsWith("sqlink_flutterwave") || /^\d+$/.test(reference))
    ) {
      try {
        const isNumericId = /^\d+$/.test(reference);
        const flwVerifyUrl = isNumericId
          ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(reference)}/verify`
          : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;

        const response = await fetch(flwVerifyUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${flwSecret}`,
            "Content-Type": "application/json",
          },
        });

        const flwData = (await response.json()) as {
          status: string;
          data?: { status: string; tx_ref: string; id: number; amount: number };
        };

        if (
          flwData.status === "success" &&
          (flwData.data?.status === "successful" || flwData.data?.status === "success")
        ) {
          const matchedTxRef = flwData.data.tx_ref || reference;
          const attempt =
            (await findPaymentAttemptByReference(reference)) ||
            (await findPaymentAttemptByReference(matchedTxRef));

          if (attempt && attempt.status !== "SUCCESS") {
            await processProviderPayment(userId, attempt.payment_id, {
              providerEventId: `flw-verify-${reference}`,
              paymentAttemptId: attempt.id,
              status: "SUCCESS",
              providerReference: matchedTxRef,
            });
            currentPaymentStatus = "AUTHORIZED";
            currentOrderStatus = "CONFIRMED";
          }
        } else if (
          flwData.status === "error" ||
          (flwData.data && (flwData.data.status === "failed" || flwData.data.status === "cancelled"))
        ) {
          const matchedTxRef = flwData.data?.tx_ref || reference;
          const attempt =
            (await findPaymentAttemptByReference(reference)) ||
            (await findPaymentAttemptByReference(matchedTxRef));

          if (attempt && attempt.status !== "FAILED") {
            await processProviderPayment(userId, attempt.payment_id, {
              providerEventId: `flw-verify-fail-${reference}`,
              paymentAttemptId: attempt.id,
              status: "FAILED",
              providerReference: matchedTxRef,
              failureReason: "Flutterwave reported payment failure or cancellation",
            });
            currentPaymentStatus = "FAILED";
            currentOrderStatus = "CANCELLED";
          }
        }
      } catch (err) {
        console.error("[FLUTTERWAVE DIRECT VERIFY ERROR]", err);
      }
    }
  }

  return {
    orderId: row.order_id,
    paymentId: row.payment_id,
    status: currentPaymentStatus,
    orderStatus: currentOrderStatus,
    amount: Number(row.amount),
    provider: row.provider,
  };
}

/**
 * Cancels or abandons a pending payment attempt, releasing inventory immediately.
 */
export async function cancelPaymentAttempt(
  reference: string,
  userId: string,
  reason?: string
) {
  if (!reference) {
    throw new AppError("Payment reference is required.", 400, "REFERENCE_REQUIRED");
  }

  const attempt = await findPaymentAttemptByReference(reference);
  if (!attempt) {
    throw new AppError("No payment attempt found for reference.", 404, "PAYMENT_ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "SUCCESS") {
    throw new AppError("Cannot cancel an already completed payment.", 409, "PAYMENT_ALREADY_SUCCESS");
  }

  if (attempt.status === "FAILED") {
    return { status: "already_failed", paymentAttemptId: attempt.id };
  }

  const result = await processProviderPayment(userId, attempt.payment_id, {
    providerEventId: `cancel-${reference}-${Date.now()}`,
    paymentAttemptId: attempt.id,
    status: "FAILED",
    providerReference: reference,
    failureReason: reason || "Customer abandoned checkout at payment gateway.",
  });

  return { status: "cancelled", result };
}
