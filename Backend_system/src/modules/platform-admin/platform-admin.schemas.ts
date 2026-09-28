import { z } from "zod";

export const userIdParamsSchema = z.object({ userId: z.string().uuid() });
export const orderIdParamsSchema = z.object({ orderId: z.string().uuid() });

export const accountActionSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const forceTransitionSchema = z.object({
  targetStage: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVED",
    "DELIVERED",
    "CANCELLED",
  ]),
  reason: z.string().trim().min(3).max(1000),
});

export const configUpdateSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const auditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ledgerQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  accountName: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AccountActionInput = z.infer<typeof accountActionSchema>;
export type ForceTransitionInput = z.infer<typeof forceTransitionSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;
