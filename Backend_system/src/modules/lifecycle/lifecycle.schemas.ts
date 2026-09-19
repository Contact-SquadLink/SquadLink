import { z } from "zod";

export const orderIdParamsSchema = z.object({
  orderId: z.string().uuid()
});

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().uuid()
});

export const deliveryIdParamsSchema = z.object({
  deliveryId: z.string().uuid()
});

export const providerPaymentSchema = z.object({
  providerEventId: z.string().trim().min(1).max(255),
  paymentAttemptId: z.string().uuid(),
  status: z.enum(["SUCCESS", "FAILED"]),
  providerReference: z.string().trim().min(1).max(255).optional(),
  failureReason: z.string().trim().max(255).optional()
});

export const pickupCredentialSchema = z.object({
  credential: z.string().trim().min(12).max(255)
});

export const deliveryOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/)
});

export type ProviderPaymentInput = z.infer<typeof providerPaymentSchema>;
