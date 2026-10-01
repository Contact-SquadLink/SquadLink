import { z } from "zod";

export const withdrawalSchema = z.object({
  amount: z
    .number()
    .int()
    .min(1000, "Minimum withdrawal amount is ₦1,000."),
  payoutDetails: z
    .object({
      bankName: z.string().trim().min(2, "Bank name is required."),
      accountNumber: z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Nigerian bank account number must be exactly 10 digits."),
      accountName: z.string().trim().min(2, "Account holder name is required."),
    })
    .passthrough(),
});

export const withdrawalParamsSchema = z.object({
  withdrawalId: z.string().uuid(),
});

export const withdrawalReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  reason: z.string().trim().min(3).max(1000).optional(),
});
