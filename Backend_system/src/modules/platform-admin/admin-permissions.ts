/**
 * SquadLink Admin Center — Granular RBAC & Permissions Engine
 * 
 * Hierarchy:
 * - SUPER_ADMIN: Absolute authority over all resources, platform configurations, and admin accounts.
 * - ADMIN: Role-based operations with granular permission enforcement at the API boundary.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";

export const MAIN_ADMIN_EMAIL = "contact.squadlink@gmail.com";

export const ALL_ADMIN_PERMISSIONS = [
  "CUSTOMER_VIEW",
  "CUSTOMER_SUSPEND",
  "BUSINESS_VIEW",
  "BUSINESS_VERIFY",
  "BUSINESS_REJECT",
  "BUSINESS_SUSPEND",
  "RIDER_VIEW",
  "RIDER_VERIFY",
  "RIDER_REJECT",
  "RIDER_SUSPEND",
  "ORDER_VIEW",
  "ORDER_INTERVENE",
  "ORDER_CANCEL",
  "DELIVERY_VIEW",
  "DELIVERY_INTERVENE",
  "WITHDRAWAL_VIEW",
  "WITHDRAWAL_APPROVE",
  "SUPPORT_VIEW",
  "SUPPORT_RESOLVE",
  "ANALYTICS_VIEW",
  "ADMIN_VIEW",
  "ADMIN_CREATE",
  "ADMIN_DISABLE",
  "ADMIN_PERMISSION_MANAGE",
  "PLATFORM_CONFIG_VIEW",
  "PLATFORM_CONFIG_UPDATE",
  "AUDIT_LOG_VIEW",
  "SECURITY_VIEW",
] as const;

export type AdminPermission = (typeof ALL_ADMIN_PERMISSIONS)[number];

/** Default baseline permissions granted automatically to any approved operational Admin */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [
  "CUSTOMER_VIEW",
  "BUSINESS_VIEW",
  "BUSINESS_VERIFY",
  "BUSINESS_REJECT",
  "RIDER_VIEW",
  "RIDER_VERIFY",
  "RIDER_REJECT",
  "ORDER_VIEW",
  "ORDER_INTERVENE",
  "DELIVERY_VIEW",
  "DELIVERY_INTERVENE",
  "SUPPORT_VIEW",
  "SUPPORT_RESOLVE",
  "ANALYTICS_VIEW",
];

export function isSuperAdmin(user?: { role?: string; email?: string | null } | null): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || (user.role === "ADMIN" && user.email === MAIN_ADMIN_EMAIL);
}

/**
 * Fetch all effective permissions for a user
 */
export async function getEffectiveAdminPermissions(userId: string, role: string, email?: string | null): Promise<Set<AdminPermission>> {
  if (isSuperAdmin({ role, email })) {
    return new Set<AdminPermission>(ALL_ADMIN_PERMISSIONS);
  }

  if (role !== "ADMIN") {
    return new Set<AdminPermission>();
  }

  // Baseline permissions
  const permissions = new Set<AdminPermission>(DEFAULT_ADMIN_PERMISSIONS);

  // Custom granted permissions from database
  const res = await db.query<{ permission: string }>(
    `SELECT permission FROM public.admin_permissions WHERE user_id = $1`,
    [userId]
  );

  for (const row of res.rows) {
    if (ALL_ADMIN_PERMISSIONS.includes(row.permission as AdminPermission)) {
      permissions.add(row.permission as AdminPermission);
    }
  }

  return permissions;
}

/**
 * Check if user has a specific permission
 */
export async function checkUserPermission(
  user: { id: string; role: string; email?: string | null },
  permission: AdminPermission
): Promise<boolean> {
  if (isSuperAdmin(user)) return true;
  if (user.role !== "ADMIN") return false;

  const permissions = await getEffectiveAdminPermissions(user.id, user.role, user.email);
  return permissions.has(permission);
}

/**
 * Fastify preHandler hook: enforce granular permission
 */
export function requirePermission(permission: AdminPermission) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
    }

    if (isSuperAdmin(request.user)) {
      return;
    }

    if (request.user.role !== "ADMIN") {
      throw new AppError("Administrative access required.", 403, "ADMIN_REQUIRED");
    }

    const hasAccess = await checkUserPermission(request.user, permission);
    if (!hasAccess) {
      throw new AppError(
        `Access denied. You do not possess the required permission: ${permission}`,
        403,
        "PERMISSION_DENIED"
      );
    }
  };
}

/**
 * Fastify preHandler hook: enforce Super Admin only
 */
export function requireSuperAdminHook() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
    }

    if (!isSuperAdmin(request.user)) {
      throw new AppError("Super Admin absolute authority required.", 403, "SUPER_ADMIN_REQUIRED");
    }
  };
}
