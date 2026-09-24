import { z } from "zod";

export const userIdParamsSchema = z.object({ userId: z.string().uuid() });

export const accountActionSchema = z.object({
  reason: z.string().trim().min(3).max(1000)
});

export type AccountActionInput = z.infer<typeof accountActionSchema>;
