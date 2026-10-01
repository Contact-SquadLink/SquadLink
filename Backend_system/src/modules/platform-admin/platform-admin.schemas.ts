import { z } from "zod";

export const userIdParamsSchema = z.object({ userId: z.string().uuid() });
export const orderIdParamsSchema = z.object({ orderId: z.string().uuid() });
export const adminIdParamsSchema = z.object({ adminId: z.string().uuid() });
export const issueIdParamsSchema = z.object({ issueId: z.string().uuid() });

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

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED"]).default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(7),
  permissions: z.array(z.string()).default([]),
});

export const updateAdminPermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export const resolveIssueSchema = z.object({
  resolutionNotes: z.string().min(3),
});

export const createIssueSchema = z.object({
  orderId: z.string().uuid().optional(),
  issueType: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  title: z.string().min(3),
  description: z.string().optional(),
});

export const deliveryQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const summaryQuerySchema = z.object({
  timeFilter: z.enum(["today", "7d", "30d", "90d", "all"]).default("all"),
});

export const toggleAdminStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3).optional(),
});

export type AccountActionInput = z.infer<typeof accountActionSchema>;
export type ForceTransitionInput = z.infer<typeof forceTransitionSchema>;
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminPermissionsInput = z.infer<typeof updateAdminPermissionsSchema>;
export type ResolveIssueInput = z.infer<typeof resolveIssueSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type ToggleAdminStatusInput = z.infer<typeof toggleAdminStatusSchema>;
