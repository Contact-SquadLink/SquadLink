import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  cancelPaymentAttempt,
  initializePaymentGatewayTransaction,
  processFlutterwaveWebhook,
  processPaystackWebhook,
  verifyFlutterwaveSignature,
  verifyPaystackSignature,
  verifyPaymentReference,
} from "./payment-gateway.service";

const initializeSchema = z.object({
  orderId: z.string().uuid(),
  gateway: z.enum(["PAYSTACK", "FLUTTERWAVE"]).optional().default("PAYSTACK"),
  callbackUrl: z.string().url().optional(),
});

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // Checkout initialization endpoint
  app.post(
    "/initialize",
    {
      preHandler: [authenticate, authorize("CUSTOMER", "BUSINESS_USER")],
    },
    async (request, reply) => {
      const input = initializeSchema.parse(request.body);
      const result = await initializePaymentGatewayTransaction({
        ...input,
        userId: request.user.id,
      });
      return reply.status(200).send(successResponse(result, request.id));
    }
  );

  // Paystack Webhook endpoint with Cryptographic HMAC SHA-512 Verification
  app.post(
    "/paystack/webhook",
    async (request, reply) => {
      const signature = (request.headers["x-paystack-signature"] as string) || "";
      const rawPayload = typeof request.body === "string" ? request.body : JSON.stringify(request.body);

      // Verify cryptographic signature if secret key configured
      if (process.env.PAYSTACK_SECRET_KEY && !verifyPaystackSignature(rawPayload, signature)) {
        return reply.status(401).send({
          success: false,
          error: { code: "INVALID_WEBHOOK_SIGNATURE", message: "Paystack HMAC signature mismatch." },
        });
      }

      const body = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;
      const result = await processPaystackWebhook(body);
      return reply.status(200).send(successResponse(result, request.id));
    }
  );

  // Flutterwave Webhook endpoint with Secret Token / Hash Verification
  app.post(
    "/flutterwave/webhook",
    async (request, reply) => {
      const receivedHash = (request.headers["verif-hash"] as string) || "";
      const flwSecretHash =
        process.env.FLUTTERWAVE_SECRET_HASH ||
        process.env.FLW_SECRET_HASH ||
        process.env.FLW_HASH;

      if (flwSecretHash && !verifyFlutterwaveSignature(receivedHash)) {
        return reply.status(401).send({
          success: false,
          error: { code: "INVALID_WEBHOOK_HASH", message: "Flutterwave verification hash mismatch." },
        });
      }

      const body = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;
      const result = await processFlutterwaveWebhook(body);
      return reply.status(200).send(successResponse(result, request.id));
    }
  );

  // Frontend polling/verification endpoint
  app.get(
    "/verify/:reference",
    {
      preHandler: [authenticate, authorize("CUSTOMER", "BUSINESS_USER")],
    },
    async (request, reply) => {
      const { reference } = request.params as { reference: string };
      const result = await verifyPaymentReference(reference, request.user.id);
      return reply.status(200).send(successResponse(result, request.id));
    }
  );

  // Cancel / abandon checkout attempt and release inventory
  app.post(
    "/abandon",
    {
      preHandler: [authenticate, authorize("CUSTOMER", "BUSINESS_USER")],
    },
    async (request, reply) => {
      const { reference, reason } = request.body as { reference: string; reason?: string };
      const result = await cancelPaymentAttempt(reference, request.user.id, reason);
      return reply.status(200).send(successResponse(result, request.id));
    }
  );
}
