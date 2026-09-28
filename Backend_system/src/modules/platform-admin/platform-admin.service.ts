import type { FastifyRequest } from "fastify";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";
import type { AccountActionInput, ConfigUpdateInput, ForceTransitionInput } from "./platform-admin.schemas";
import { getFinancialLedgerEntries, getFinancialObservabilitySummary } from "../ledger/ledger.service";
import { superAdminForceTransitionOrder } from "../lifecycle/lifecycle.service";

const MAIN_ADMIN_EMAIL = "contact.squadlink@gmail.com";

export function isMainAdmin(request: FastifyRequest): boolean {
  return (
    request.user.role === "SUPER_ADMIN" ||
    (request.user.role === "ADMIN" && request.user.email === MAIN_ADMIN_EMAIL)
  );
}

export function requireSuperAdmin(request: FastifyRequest): void {
  if (!isMainAdmin(request)) {
    throw new AppError("Super Admin absolute authority required.", 403, "SUPER_ADMIN_REQUIRED");
  }
}

/**
 * Global Observability Dashboard
 * Real-time metrics visualization tracking GMV, Total Platform Revenue, Net Contribution per Order,
 * active service zones (Gwallameji-Yelwa corridor and expansion zones), and live order fulfilment health scores.
 */
export async function getObservabilityDashboard(request: FastifyRequest) {
  requireSuperAdmin(request);

  const [financials, lifecycleResult, zonesResult, healthResult] = await Promise.all([
    getFinancialObservabilitySummary(),

    // Distribution across all 9 lifecycle stages
    db.query<{
      pending: string;
      confirmed: string;
      preparing: string;
      ready_for_pickup: string;
      assigned: string;
      picked_up: string;
      in_transit: string;
      arrived: string;
      delivered: string;
      cancelled: string;
      total: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE o.status = 'PENDING')::text AS pending,
        COUNT(*) FILTER (WHERE o.status = 'CONFIRMED')::text AS confirmed,
        COUNT(*) FILTER (WHERE o.status = 'PREPARING')::text AS preparing,
        COUNT(*) FILTER (WHERE o.status = 'READY_FOR_PICKUP')::text AS ready_for_pickup,
        COUNT(*) FILTER (WHERE d.status = 'ASSIGNED' AND o.status <> 'DELIVERED')::text AS assigned,
        COUNT(*) FILTER (WHERE d.status = 'PICKED_UP' AND o.status <> 'DELIVERED')::text AS picked_up,
        COUNT(*) FILTER (WHERE d.status = 'IN_TRANSIT' AND o.status <> 'DELIVERED')::text AS in_transit,
        COUNT(*) FILTER (WHERE d.status = 'ARRIVED' AND o.status <> 'DELIVERED')::text AS arrived,
        COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::text AS delivered,
        COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::text AS cancelled,
        COUNT(*)::text AS total
      FROM public.orders o
      LEFT JOIN public.deliveries d ON d.order_id = o.id
    `),

    // Active Service Zones metrics (Gwallameji-Yelwa corridor and expansion zones)
    db.query<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      radius_meters: number;
      is_active: boolean;
      total_riders: string;
      active_riders: string;
      feature_phone_riders: string;
      smartphone_riders: string;
      active_deliveries: string;
    }>(`
      SELECT
        sz.id,
        sz.code,
        sz.name,
        sz.description,
        sz.radius_meters,
        sz.is_active,
        COUNT(DISTINCT r.id)::text AS total_riders,
        COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = TRUE AND r.is_available = TRUE)::text AS active_riders,
        COUNT(DISTINCT r.id) FILTER (WHERE r.device_type = 'FEATURE_PHONE')::text AS feature_phone_riders,
        COUNT(DISTINCT r.id) FILTER (WHERE r.device_type = 'SMARTPHONE')::text AS smartphone_riders,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'))::text AS active_deliveries
      FROM public.service_zones sz
      LEFT JOIN public.riders r ON r.service_zone_id = sz.id
      LEFT JOIN public.deliveries d ON d.rider_id = r.id AND d.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED')
      GROUP BY sz.id, sz.code, sz.name, sz.description, sz.radius_meters, sz.is_active
      ORDER BY sz.code = 'GWALLAMEJI_YELWA' DESC, sz.name ASC
    `),

    // Order fulfilment health metrics
    db.query<{
      total_assigned: string;
      accepted_assignments: string;
      rejected_assignments: string;
      expired_assignments: string;
      total_completed: string;
      total_exceptions: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_assigned,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED')::text AS accepted_assignments,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::text AS rejected_assignments,
        COUNT(*) FILTER (WHERE status = 'EXPIRED')::text AS expired_assignments,
        (SELECT COUNT(*) FROM public.orders WHERE status = 'DELIVERED')::text AS total_completed,
        (SELECT COUNT(*) FROM public.incidents WHERE status <> 'RESOLVED')::text AS total_exceptions
      FROM public.delivery_assignment_decisions
    `),
  ]);

  const stagesRow = lifecycleResult.rows[0];
  const healthRow = healthResult.rows[0];

  const totalOrders = Number(stagesRow.total) || 1;
  const deliveredCount = Number(stagesRow.delivered);
  const cancelledCount = Number(stagesRow.cancelled);
  const completionRate = Math.round((deliveredCount / totalOrders) * 100);
  const cancellationRate = Math.round((cancelledCount / totalOrders) * 100);

  const totalDecisions = Number(healthRow.total_assigned) || 1;
  const acceptedDecisions = Number(healthRow.accepted_assignments);
  const assignmentAcceptanceRate = Math.round((acceptedDecisions / totalDecisions) * 100);

  // Live order fulfilment health score (0 - 100 composite)
  const healthScore = Math.min(100, Math.max(0, Math.round(
    (completionRate * 0.4) + (assignmentAcceptanceRate * 0.4) + ((100 - cancellationRate) * 0.2)
  )));

  return {
    financials,
    health: {
      healthScore: totalOrders > 0 ? healthScore : 100,
      completionRate,
      cancellationRate,
      assignmentAcceptanceRate,
      activeExceptionsCount: Number(healthRow.total_exceptions),
    },
    lifecycleStages: {
      PENDING: Number(stagesRow.pending),
      CONFIRMED: Number(stagesRow.confirmed),
      PREPARING: Number(stagesRow.preparing),
      READY_FOR_PICKUP: Number(stagesRow.ready_for_pickup),
      ASSIGNED: Number(stagesRow.assigned),
      PICKED_UP: Number(stagesRow.picked_up),
      IN_TRANSIT: Number(stagesRow.in_transit),
      ARRIVED: Number(stagesRow.arrived),
      DELIVERED: Number(stagesRow.delivered),
      CANCELLED: Number(stagesRow.cancelled),
      total: Number(stagesRow.total),
    },
    serviceZones: zonesResult.rows.map((zone) => ({
      id: zone.id,
      code: zone.code,
      name: zone.name,
      description: zone.description,
      radiusMeters: zone.radius_meters,
      isActive: zone.is_active,
      totalRiders: Number(zone.total_riders),
      activeRiders: Number(zone.active_riders),
      featurePhoneRiders: Number(zone.feature_phone_riders),
      smartphoneRiders: Number(zone.smartphone_riders),
      activeDeliveries: Number(zone.active_deliveries),
      isPrimaryPilot: zone.code === "GWALLAMEJI_YELWA",
    })),
  };
}

/**
 * Super Admin Order Lifecycle Inspection & List
 */
export async function listSuperAdminOrders(
  request: FastifyRequest,
  options: { stage?: string; limit?: number; offset?: number }
) {
  requireSuperAdmin(request);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.stage) {
    if (["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "DELIVERED", "CANCELLED"].includes(options.stage)) {
      params.push(options.stage);
      conditions.push(`o.status = $${params.length}`);
    } else if (["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"].includes(options.stage)) {
      params.push(options.stage);
      conditions.push(`d.status = $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<{
    id: string;
    order_status: string;
    delivery_status: string | null;
    delivery_id: string | null;
    customer_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    business_id: string | null;
    business_name: string | null;
    rider_id: string | null;
    rider_name: string | null;
    rider_phone: string | null;
    rider_device_type: string | null;
    subtotal_amount: number | string;
    delivery_fee_amount: number | string;
    platform_fee_amount: number | string;
    business_fee_amount: number | string;
    total_amount: number | string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT
       o.id,
       o.status AS order_status,
       d.status AS delivery_status,
       d.id AS delivery_id,
       o.user_id AS customer_id,
       CONCAT_WS(' ', u.first_name, u.last_name) AS customer_name,
       u.phone_number AS customer_phone,
       b.id AS business_id,
       b.name AS business_name,
       r.id AS rider_id,
       CONCAT_WS(' ', ru.first_name, ru.last_name) AS rider_name,
       COALESCE(r.registered_phone_number, ru.phone_number) AS rider_phone,
       r.device_type AS rider_device_type,
       o.subtotal_amount,
       o.delivery_fee_amount,
       o.platform_fee_amount,
       o.business_fee_amount,
       o.total_amount,
       o.created_at,
       o.updated_at
     FROM public.orders o
     INNER JOIN public.users u ON u.id = o.user_id
     LEFT JOIN public.fulfillments f ON f.order_id = o.id
     LEFT JOIN public.businesses b ON b.id = f.business_id
     LEFT JOIN public.deliveries d ON d.order_id = o.id
     LEFT JOIN public.riders r ON r.id = d.rider_id
     LEFT JOIN public.users ru ON ru.id = r.user_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderStatus: row.order_status,
    deliveryStatus: row.delivery_status,
    deliveryId: row.delivery_id,
    currentStage: row.order_status === "OUT_FOR_DELIVERY" ? (row.delivery_status || "ASSIGNED") : row.order_status,
    customer: { id: row.customer_id, name: row.customer_name, phone: row.customer_phone },
    business: { id: row.business_id, name: row.business_name },
    rider: row.rider_id ? {
      id: row.rider_id,
      name: row.rider_name,
      phone: row.rider_phone,
      deviceType: row.rider_device_type,
    } : null,
    financials: {
      subtotal: Number(row.subtotal_amount),
      deliveryFee: Number(row.delivery_fee_amount),
      platformFee: Number(row.platform_fee_amount),
      merchantCommission: Number(row.business_fee_amount),
      totalAmount: Number(row.total_amount),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Super Admin Order Deep Inspection
 */
export async function inspectOrder(request: FastifyRequest, orderId: string) {
  requireSuperAdmin(request);

  const [orderRes, historyRes, deliveryHistoryRes, ledgerRes, auditRes] = await Promise.all([
    db.query(`
      SELECT
        o.*,
        u.email AS customer_email,
        u.phone_number AS customer_phone,
        CONCAT_WS(' ', u.first_name, u.last_name) AS customer_name,
        b.id AS business_id,
        b.name AS business_name,
        d.id AS delivery_id,
        d.status AS delivery_status,
        d.rider_id,
        CONCAT_WS(' ', ru.first_name, ru.last_name) AS rider_name,
        r.device_type AS rider_device_type
      FROM public.orders o
      INNER JOIN public.users u ON u.id = o.user_id
      LEFT JOIN public.fulfillments f ON f.order_id = o.id
      LEFT JOIN public.businesses b ON b.id = f.business_id
      LEFT JOIN public.deliveries d ON d.order_id = o.id
      LEFT JOIN public.riders r ON r.id = d.rider_id
      LEFT JOIN public.users ru ON ru.id = r.user_id
      WHERE o.id = $1
    `, [orderId]),

    db.query(`SELECT * FROM public.order_status_history WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]),
    db.query(`SELECT * FROM public.delivery_status_history WHERE delivery_id = (SELECT id FROM public.deliveries WHERE order_id = $1) ORDER BY created_at ASC`, [orderId]),
    db.query(`SELECT * FROM public.financial_ledger_entries WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]),
    db.query(`SELECT * FROM public.audit_logs WHERE (entity_type = 'ORDER' AND entity_id = $1) OR (entity_type = 'DELIVERY' AND entity_id = (SELECT id FROM public.deliveries WHERE order_id = $1)) ORDER BY created_at ASC`, [orderId]),
  ]);

  if (orderRes.rows.length === 0) {
    throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  }

  return {
    order: orderRes.rows[0],
    orderStatusHistory: historyRes.rows,
    deliveryStatusHistory: deliveryHistoryRes.rows,
    ledgerEntries: ledgerRes.rows.map((r) => ({ ...r, amount: Number(r.amount) })),
    auditLogs: auditRes.rows,
  };
}

/**
 * Super Admin Absolute Intervention: Force-transition an order across any of the 9 stages
 */
export async function forceTransitionOrder(
  request: FastifyRequest,
  orderId: string,
  input: ForceTransitionInput
) {
  requireSuperAdmin(request);
  return superAdminForceTransitionOrder(request.user.id, orderId, input.targetStage, input.reason);
}

/**
 * Super Admin Immutable Audit Log Explorer
 */
export async function listAuditLogs(
  request: FastifyRequest,
  filters: { entityType?: string; action?: string; actorUserId?: string; limit?: number; offset?: number }
) {
  requireSuperAdmin(request);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.entityType) {
    params.push(filters.entityType);
    conditions.push(`al.entity_type = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    conditions.push(`al.action = $${params.length}`);
  }
  if (filters.actorUserId) {
    params.push(filters.actorUserId);
    conditions.push(`al.actor_user_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query(
    `SELECT
       al.id,
       al.actor_type AS "actorType",
       al.actor_user_id AS "actorUserId",
       CONCAT_WS(' ', u.first_name, u.last_name) AS "actorName",
       u.email AS "actorEmail",
       al.action,
       al.entity_type AS "entityType",
       al.entity_id AS "entityId",
       al.description,
       al.metadata,
       al.created_at AS "createdAt"
     FROM public.audit_logs al
     LEFT JOIN public.users u ON u.id = al.actor_user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows;
}

/**
 * Super Admin Double-Entry Ledger Explorer
 */
export async function getPlatformLedger(
  request: FastifyRequest,
  filters: { orderId?: string; accountName?: string; limit?: number; offset?: number }
) {
  requireSuperAdmin(request);
  return getFinancialLedgerEntries(filters);
}

/**
 * Super Admin Pilot Configurations (fee targets, commission rates, pricing tiers)
 */
export async function getPlatformConfig(request: FastifyRequest) {
  requireSuperAdmin(request);
  const result = await db.query(`SELECT key, value, description, updated_at AS "updatedAt" FROM public.platform_configurations ORDER BY key ASC`);
  const configMap: Record<string, unknown> = {};
  for (const row of result.rows) {
    configMap[row.key] = { value: row.value, description: row.description, updatedAt: row.updatedAt };
  }
  return configMap;
}

export async function updatePlatformConfig(
  request: FastifyRequest,
  input: ConfigUpdateInput
) {
  requireSuperAdmin(request);
  const result = await db.query(
    `INSERT INTO public.platform_configurations (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING key, value, description, updated_at AS "updatedAt"`,
    [input.key, JSON.stringify(input.value), request.user.id]
  );

  await writeAccountAudit(
    request.user.id,
    "PLATFORM_CONFIG_UPDATED",
    request.user.id,
    `Updated configuration parameter ${input.key}: ${input.reason || "Parameter adjusted by Super Admin."}`
  );

  return result.rows[0];
}

/**
 * Participant Governance (Merchants, Customers, Riders)
 */
export async function listParticipants(
  request: FastifyRequest,
  roleFilter?: string
) {
  requireSuperAdmin(request);
  const params: unknown[] = [];
  let roleCondition = "";
  if (roleFilter) {
    params.push(roleFilter);
    roleCondition = `WHERE u.role = $1`;
  }

  const result = await db.query(
    `SELECT
       u.id,
       u.email,
       u.phone_number AS "phoneNumber",
       u.first_name AS "firstName",
       u.last_name AS "lastName",
       u.role,
       u.is_active AS "isActive",
       u.admin_approved AS "adminApproved",
       u.suspended_at AS "suspendedAt",
       u.suspension_reason AS "suspensionReason",
       u.created_at AS "createdAt",
       b.id AS "businessId",
       b.name AS "businessName",
       bv.status AS "businessVerificationStatus",
       r.id AS "riderId",
       r.device_type AS "riderDeviceType",
       r.registered_phone_number AS "riderRegisteredPhone",
       rv.status AS "riderVerificationStatus",
       sz.name AS "serviceZoneName"
     FROM public.users u
     LEFT JOIN public.businesses b ON b.owner_user_id = u.id
     LEFT JOIN public.business_verifications bv ON bv.business_id = b.id
     LEFT JOIN public.riders r ON r.user_id = u.id
     LEFT JOIN public.rider_verifications rv ON rv.rider_id = r.id
     LEFT JOIN public.service_zones sz ON sz.id = r.service_zone_id
     ${roleCondition}
     ORDER BY u.created_at DESC`,
    params
  );

  return result.rows;
}

// -------------------------------------------------------------
// Existing summary & account management endpoints (preserved)
// -------------------------------------------------------------

export async function getPlatformSummary(request: FastifyRequest) {
  requireSuperAdmin(request);
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
      COUNT(*) FILTER (WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND deleted_at IS NULL)::text AS admins,
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
    platform_fee_earnings: string;
    business_fee_earnings: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::text AS completed_transactions,
      COUNT(*) FILTER (WHERE o.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'))::text AS pending_transactions,
      COUNT(*) FILTER (WHERE o.status = 'OUT_FOR_DELIVERY' OR d.status IN ('IN_TRANSIT', 'ARRIVED'))::text AS in_transit_transactions,
      COUNT(*) FILTER (WHERE d.status = 'ASSIGNED')::text AS assigned_transactions,
      COUNT(*) FILTER (WHERE o.status NOT IN ('DELIVERED', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'))::text AS other_transactions,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS gross_completed_value,
      COALESCE(SUM(et.amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS recipient_earnings,
      COALESCE(SUM(o.platform_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS platform_fee_earnings,
      COALESCE(SUM(o.business_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS business_fee_earnings
    FROM public.orders o
    LEFT JOIN public.deliveries d ON d.order_id = o.id
    LEFT JOIN (
      SELECT order_id, SUM(amount) AS amount
      FROM public.earning_transactions
      GROUP BY order_id
    ) et ON et.order_id = o.id
  `);
  const transactionRow = transactionResult.rows[0];
  const platformEarnings = Number(transactionRow.platform_fee_earnings) + Number(transactionRow.business_fee_earnings);
  return Object.fromEntries(Object.entries({
    ...row,
    ...transactionRow,
    platform_earnings: platformEarnings
  }).map(([key, value]) => [key, Number(value)]));
}

export async function listAccounts(request: FastifyRequest) {
  requireSuperAdmin(request);
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
  requireSuperAdmin(request);
  const target = await ensureTarget(userId);
  if (target.id === request.user.id) throw new AppError("The super admin cannot suspend their own account.", 409, "SELF_ACCOUNT_ACTION_NOT_ALLOWED");
  await db.query(`UPDATE public.users SET is_active = FALSE, suspended_at = NOW(), suspension_reason = $1, updated_at = NOW() WHERE id = $2`, [input.reason, userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_SUSPENDED", userId, input.reason);
  return { userId, status: "SUSPENDED" };
}

export async function unsuspendAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireSuperAdmin(request);
  await ensureTarget(userId);
  await db.query(`UPDATE public.users SET is_active = TRUE, suspended_at = NULL, suspension_reason = NULL, updated_at = NOW() WHERE id = $1`, [userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_UNSUSPENDED", userId, input.reason);
  return { userId, status: "ACTIVE" };
}

export async function deleteAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireSuperAdmin(request);
  const target = await ensureTarget(userId);
  if (target.id === request.user.id || (target.role === "SUPER_ADMIN" && userId === request.user.id)) {
    throw new AppError("The super admin cannot delete their own account.", 409, "SELF_ACCOUNT_ACTION_NOT_ALLOWED");
  }
  await db.query(`UPDATE public.users SET is_active = FALSE, deleted_at = NOW(), deletion_reason = $1, updated_at = NOW() WHERE id = $2`, [input.reason, userId]);
  await writeAccountAudit(request.user.id, "ACCOUNT_DELETED", userId, input.reason);
  return { userId, status: "DELETED" };
}
