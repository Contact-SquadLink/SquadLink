import { z } from "zod";

export const riderVerificationStatusSchema = z.enum([
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED"
]);

export type RiderVerificationStatus = z.infer<
  typeof riderVerificationStatusSchema
>;

export const riderIdParamsSchema = z.object({
  riderId: z.string().uuid()
});

export const updateRiderVerificationSchema = z.object({
  status: riderVerificationStatusSchema,
  notes: z.string().trim().max(5000).nullable().optional()
});

export type UpdateRiderVerificationInput = z.infer<
  typeof updateRiderVerificationSchema
>;