import type { FastifyRequest } from "fastify";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";
import type { AccountActionInput } from "./platform-admin.schemas";

const MAIN_ADMIN_EMAIL = "contact.squadlink@gmail.com";

export function isMainAdmin(request: FastifyRequest): boolean {
  return request.user.role === "ADMIN" && request.user.email === MAIN_ADMIN_EMAIL;
}

export function requireMainAdmin(request: FastifyRequest): void {
  if (!isMainAdmin(request)) {
    throw new AppError("Only the main admin can perform this action.", 403, "MAIN_ADMIN_REQUIRED");
  }
}

export async function getPlatformSummary(request: FastifyRequest) {
  requireMainAdmin(request);
  const result = await db.query<{
    customers: string;
    businesses: string;
    riders: string;
    admins: string;
    active: string;
    suspended: string;
    deleted: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE role = 'CUSTOMER' AND deleted_at IS NULL)::text AS customers,
      COUNT(*) FILTER (WHERE role = 'BUSINESS_USER' AND deleted_at IS NULL)::text AS businesses,
      COUNT(*) FILTER (WHERE role = 'RIDER' AND deleted_at IS NULL)::text AS riders,
      COUNT(*) FILTER (WHERE role = 'ADMIN' AND deleted_at IS NULL)::text AS admins,
      COUNT(*) FILTER (WHERE is_active = TRUE AND deleted_at IS NULL)::text AS active,
      COUNT(*) FILTER (WHERE suspended_at IS NOT NULL AND deleted_at IS NULL)::text AS suspended,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::text AS deleted
    FROM public.users
  `);
  const row = result.rows[0];
  const transactionResult = await db.query<{
    completed_transactions: string;
    pending_transactions: string;
    in_transit_transactions: string;
    assigned_transactions: string;
    other_transactions: string;
    gross_completed_value: string;
    recipient_earnings: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::text AS completed_transactions,
      COUNT(*) FILTER (WHERE o.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'))::text AS pending_transactions,
      COUNT(*) FILTER (WHERE o.status = 'OUT_FOR_DELIVERY' OR d.status IN ('IN_TRANSIT', 'ARRIVED'))::text AS in_transit_transactions,
      COUNT(*) FILTER (WHERE d.status = 'ASSIGNED')::text AS assigned_transactions,
      COUNT(*) FILTER (WHERE o.status NOT IN ('DELIVERED', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'))::text AS other_transactions,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS gross_completed_value,
      COALESCE(SUM(et.amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS recipient_earnings
    FROM public.orders o
    LEFT JOIN public.deliveries d ON d.order_id = o.id
    LEFT JOIN (
      SELECT order_id, SUM(amount) AS amount
      FROM public.earning_transactions
      GROUP BY order_id
    ) et ON et.order_id = o.id
  `);
  const transactionRow = transactionResult.rows[0];
  const platformEarnings = Math.max(0, Number(transactionRow.gross_completed_value) - Number(transactionRow.recipient_earnings));
  return Object.fromEntries(Object.entries({
    ...row,
    ...transactionRow,
    platform_earnings: platformEarnings
  }).map(([key, value]) => [key, Number(value)]));
}

export async function listAccounts(request: FastifyRequest) {
  requireMainAdmin(request);
  const result = await db.query(`
    SELECT id, email, phone_number, first_name, last_name, role,
           is_active, admin_approved, suspended_at, suspension_reason,
           deleted_at, deletion_reason, created_at, updated_at
    FROM public.users
    ORDER BY created_at DESC
  `);
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    isActive: row.is_active,
    adminApproved: row.admin_approved,
    suspendedAt: row.suspended_at,
    suspensionReason: row.suspension_reason,
    deletedAt: row.deleted_at,
    deletionReason: row.deletion_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

async function writeAccountAudit(
  actorUserId: string,
  action: string,
  userId: string,
  reason: string
) {
  await db.query(`
    INSERT INTO public.audit_logs
      (actor_type, actor_user_id, action, entity_type, entity_id, description, metadata)
    VALUES ('USER', $1, $2, 'USER', $3, $4, $5::jsonb)
  `, [actorUserId, action, userId, reason, JSON.stringify({ reason })]);
}

async function ensureTarget(userId: string) {
  const result = await db.query<{ id: string; role: string; deleted_at: Date | null }>(
    `SELECT id, role, deleted_at FROM public.users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw new AppError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  return result.rows[0];
}

export async function suspendAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireMainAdmin(request);
  const target = await ensureTarget(userId);
  if (target.id === request.user.id) throw new AppError("The main admin cannot suspend their own account.", 409, "SELF_ACCOUNT_ACTION_NOT_ALLOWED");
  await db.query(`UPDATE public.users SET is_active = FALSE, suspended_at = NOW(), suspension_reason = $1, updated_at = NOW() WHERE id = $2`, [input.reason, userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_SUSPENDED", userId, input.reason);
  return { userId, status: "SUSPENDED" };
}

export async function unsuspendAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireMainAdmin(request);
  await ensureTarget(userId);
  await db.query(`UPDATE public.users SET is_active = TRUE, suspended_at = NULL, suspension_reason = NULL, updated_at = NOW() WHERE id = $1`, [userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_UNSUSPENDED", userId, input.reason);
  return { userId, status: "ACTIVE" };
}

export async function deleteAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireMainAdmin(request);
  const target = await ensureTarget(userId);
  if (target.id === request.user.id || target.role === "ADMIN" && userId === request.user.id) {
    throw new AppError("The main admin cannot delete their own account.", 409, "SELF_ACCOUNT_ACTION_NOT_ALLOWED");
  }
  await db.query(`UPDATE public.users SET is_active = FALSE, deleted_at = NOW(), deletion_reason = $1, updated_at = NOW() WHERE id = $2`, [input.reason, userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_DELETED", userId, input.reason);
  return { userId, status: "DELETED" };
}
