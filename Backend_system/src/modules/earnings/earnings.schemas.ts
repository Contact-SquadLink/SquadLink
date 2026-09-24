import { z } from "zod";

export const withdrawalSchema = z.object({
  amount: z.number().int().positive(),
  payoutDetails: z.record(z.string(), z.string()).default({})
});

export const withdrawalParamsSchema = z.object({
  withdrawalId: z.string().uuid()
});

export const withdrawalReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  reason: z.string().trim().min(3).max(1000).optional()
});
