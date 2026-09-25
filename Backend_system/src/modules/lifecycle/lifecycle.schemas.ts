import { z } from "zod";
import { normalizePhoneNumber } from "../../utils/phone";

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

export const sandboxPaymentSchema = z.object({
  paymentAttemptId: z.string().uuid(),
  cardNumber: z.string().trim().min(13).max(19)
});

export const pickupCredentialSchema = z.object({
  credential: z.string().trim().min(12).max(255)
});

export const deliveryOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/)
});

export const riderRegistrationSchema = z.object({
  vehicleType: z.enum(["MOTORCYCLE", "KEKE"]).default("MOTORCYCLE"),
  vehicleRegistration: z.string().trim().min(2).max(50),
  phoneNumber: z.string().trim().min(10).max(30).transform((value, context) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Phone number must be a valid Nigerian number with +234 and 10 digits." });
      return z.NEVER;
    }
    return normalized;
  }).optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional()
});

export const riderLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const riderAssignmentDecisionSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

export type ProviderPaymentInput = z.infer<typeof providerPaymentSchema>;
