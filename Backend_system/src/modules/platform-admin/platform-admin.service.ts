import type { FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";
import {
  isSuperAdmin,
  checkUserPermission,
  ALL_ADMIN_PERMISSIONS,
  type AdminPermission
} from "./admin-permissions";
import type {
  AccountActionInput,
  ConfigUpdateInput,
  ForceTransitionInput,
  CreateAdminInput,
  UpdateAdminPermissionsInput,
  ResolveIssueInput,
  CreateIssueInput,
  ToggleAdminStatusInput
} from "./platform-admin.schemas";
import { getFinancialLedgerEntries, getFinancialObservabilitySummary } from "../ledger/ledger.service";
import { superAdminForceTransitionOrder } from "../lifecycle/lifecycle.service";

export const MAIN_ADMIN_EMAIL = "contact.squadlink@gmail.com";

export function isMainAdmin(request: FastifyRequest): boolean {
  return isSuperAdmin(request.user);
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

  await writePlatformAudit(
    request.user.id,
    "PLATFORM_CONFIG_UPDATED",
    "CONFIG",
    input.key,
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
// Audit logging helper
// -------------------------------------------------------------

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function writePlatformAudit(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata?: Record<string, unknown>
) {
  const safeEntityId = isValidUuid(entityId) ? entityId : null;
  const mergedMetadata = {
    ...(metadata ?? {}),
    ...(entityId && !safeEntityId ? { targetKey: entityId } : {}),
  };

  await db.query(`
    INSERT INTO public.audit_logs
      (actor_type, actor_user_id, action, entity_type, entity_id, description, metadata)
    VALUES ('USER', $1, $2, $3, $4, $5, $6::jsonb)
  `, [actorUserId, action, entityType, safeEntityId, description, JSON.stringify(mergedMetadata)]);
}

// -------------------------------------------------------------
// Platform Summary & Dashboard Aggregates
// -------------------------------------------------------------

export async function getPlatformSummary(
  request: FastifyRequest,
  timeFilter: "today" | "7d" | "30d" | "90d" | "all" = "all"
) {
  const callerIsSuper = isSuperAdmin(request.user);
  const canViewAdmins = callerIsSuper || (await checkUserPermission(request.user, "ADMIN_VIEW"));
  const canViewFinancials = callerIsSuper || (await checkUserPermission(request.user, "ANALYTICS_VIEW"));

  let timeConditionOrders = "";
  if (timeFilter === "today") {
    timeConditionOrders = "AND o.created_at >= CURRENT_DATE";
  } else if (timeFilter === "7d") {
    timeConditionOrders = "AND o.created_at >= NOW() - INTERVAL '7 days'";
  } else if (timeFilter === "30d") {
    timeConditionOrders = "AND o.created_at >= NOW() - INTERVAL '30 days'";
  } else if (timeFilter === "90d") {
    timeConditionOrders = "AND o.created_at >= NOW() - INTERVAL '90 days'";
  }

  const [popResult, orderBreakdownResult, alertsResult, txnResult] = await Promise.all([
    db.query<{
      total_customers: string;
      active_customers: string;
      total_businesses: string;
      active_businesses: string;
      pending_businesses: string;
      total_riders: string;
      verified_riders: string;
      active_available_riders: string;
      pending_riders: string;
      total_admins: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'CUSTOMER' AND deleted_at IS NULL)::text AS total_customers,
        COUNT(*) FILTER (WHERE role = 'CUSTOMER' AND is_active = TRUE AND deleted_at IS NULL)::text AS active_customers,
        (SELECT COUNT(*)::text FROM public.businesses) AS total_businesses,
        (SELECT COUNT(*)::text FROM public.businesses WHERE is_active = TRUE) AS active_businesses,
        (SELECT COUNT(*)::text FROM public.business_verifications WHERE status = 'PENDING') AS pending_businesses,
        (SELECT COUNT(*)::text FROM public.riders) AS total_riders,
        (SELECT COUNT(*)::text FROM public.rider_verifications WHERE status = 'VERIFIED') AS verified_riders,
        (SELECT COUNT(*)::text FROM public.riders WHERE is_active = TRUE AND is_available = TRUE) AS active_available_riders,
        (SELECT COUNT(*)::text FROM public.rider_verifications WHERE status = 'PENDING') AS pending_riders,
        COUNT(*) FILTER (WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND deleted_at IS NULL)::text AS total_admins
      FROM public.users
    `),

    db.query<{
      total_period: string;
      orders_today: string;
      orders_week: string;
      orders_month: string;
      pending: string;
      confirmed: string;
      preparing: string;
      ready_for_pickup: string;
      assigned: string;
      picked_up: string;
      in_transit: string;
      delivered: string;
      cancelled: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_period,
        COUNT(*) FILTER (WHERE o.created_at >= CURRENT_DATE)::text AS orders_today,
        COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '7 days')::text AS orders_week,
        COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days')::text AS orders_month,
        COUNT(*) FILTER (WHERE o.status = 'PENDING')::text AS pending,
        COUNT(*) FILTER (WHERE o.status = 'CONFIRMED')::text AS confirmed,
        COUNT(*) FILTER (WHERE o.status = 'PREPARING')::text AS preparing,
        COUNT(*) FILTER (WHERE o.status = 'READY_FOR_PICKUP')::text AS ready_for_pickup,
        COUNT(*) FILTER (WHERE d.status = 'ASSIGNED' AND o.status <> 'DELIVERED')::text AS assigned,
        COUNT(*) FILTER (WHERE d.status = 'PICKED_UP' AND o.status <> 'DELIVERED')::text AS picked_up,
        COUNT(*) FILTER (WHERE d.status = 'IN_TRANSIT' AND o.status <> 'DELIVERED')::text AS in_transit,
        COUNT(*) FILTER (WHERE o.status = 'DELIVERED')::text AS delivered,
        COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::text AS cancelled
      FROM public.orders o
      LEFT JOIN public.deliveries d ON d.order_id = o.id
      WHERE 1=1 ${timeConditionOrders}
    `),

    db.query<{
      pending_biz_verifications: string;
      pending_rider_verifications: string;
      unassigned_orders: string;
      delayed_orders: string;
      pending_withdrawals: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM public.business_verifications WHERE status = 'PENDING') AS pending_biz_verifications,
        (SELECT COUNT(*)::text FROM public.rider_verifications WHERE status = 'PENDING') AS pending_rider_verifications,
        (SELECT COUNT(*)::text FROM public.orders o
         LEFT JOIN public.deliveries d ON d.order_id = o.id
         WHERE o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP')
           AND (d.id IS NULL OR d.status = 'PENDING' OR d.rider_id IS NULL)) AS unassigned_orders,
        (SELECT COUNT(*)::text FROM public.orders o
         LEFT JOIN public.deliveries d ON d.order_id = o.id
         WHERE (o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '30 minutes')
            OR (d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '45 minutes')) AS delayed_orders,
        (SELECT COUNT(*)::text FROM public.withdrawal_requests WHERE status = 'PENDING') AS pending_withdrawals
    `),

    db.query<{
      gross_completed_value: string;
      recipient_earnings: string;
      platform_fee_earnings: string;
      business_fee_earnings: string;
      delivery_fee_total: string;
    }>(`
      SELECT
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS gross_completed_value,
        COALESCE(SUM(et.amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS recipient_earnings,
        COALESCE(SUM(o.platform_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS platform_fee_earnings,
        COALESCE(SUM(o.business_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS business_fee_earnings,
        COALESCE(SUM(o.delivery_fee_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS delivery_fee_total
      FROM public.orders o
      LEFT JOIN (
        SELECT order_id, SUM(amount) AS amount
        FROM public.earning_transactions
        GROUP BY order_id
      ) et ON et.order_id = o.id
      WHERE 1=1 ${timeConditionOrders}
    `)
  ]);

  const pop = popResult.rows[0];
  const ord = orderBreakdownResult.rows[0];
  const alr = alertsResult.rows[0];
  const txn = txnResult.rows[0];

  const gmv = Number(txn.gross_completed_value);
  const platformFeeRev = Number(txn.platform_fee_earnings);
  const merchantComm = Number(txn.business_fee_earnings);
  const deliveryFeeRev = Number(txn.delivery_fee_total);
  const riderPayouts = Number(txn.recipient_earnings);
  const totalPlatformRev = platformFeeRev + merchantComm;

  return {
    timeFilter,
    population: {
      customers: {
        total: Number(pop.total_customers),
        active: Number(pop.active_customers),
      },
      businesses: {
        total: Number(pop.total_businesses),
        active: Number(pop.active_businesses),
        pending: Number(pop.pending_businesses),
      },
      riders: {
        total: Number(pop.total_riders),
        verified: Number(pop.verified_riders),
        activeAvailable: Number(pop.active_available_riders),
        pending: Number(pop.pending_riders),
      },
      admins: canViewAdmins ? { total: Number(pop.total_admins) } : null,
    },
    orders: {
      total: Number(ord.total_period),
      today: Number(ord.orders_today),
      thisWeek: Number(ord.orders_week),
      thisMonth: Number(ord.orders_month),
      stages: {
        PENDING: Number(ord.pending),
        CONFIRMED: Number(ord.confirmed),
        PREPARING: Number(ord.preparing),
        READY_FOR_PICKUP: Number(ord.ready_for_pickup),
        ASSIGNED: Number(ord.assigned),
        PICKED_UP: Number(ord.picked_up),
        IN_TRANSIT: Number(ord.in_transit),
        DELIVERED: Number(ord.delivered),
        CANCELLED: Number(ord.cancelled),
      }
    },
    attentionNeeded: {
      pendingBusinesses: Number(alr.pending_biz_verifications),
      pendingRiders: Number(alr.pending_rider_verifications),
      unassignedOrders: Number(alr.unassigned_orders),
      delayedOrders: Number(alr.delayed_orders),
      pendingWithdrawals: Number(alr.pending_withdrawals),
    },
    financials: canViewFinancials ? {
      gmv,
      platformRevenue: totalPlatformRev,
      platformFeeRevenue: platformFeeRev,
      merchantCommission: merchantComm,
      deliveryFeeRevenue: deliveryFeeRev,
      riderPayouts,
      estimatedContribution: totalPlatformRev,
    } : null,
    // Preserved backward compatibility keys:
    customers: Number(pop.total_customers),
    businesses: Number(pop.total_businesses),
    riders: Number(pop.total_riders),
    admins: canViewAdmins ? Number(pop.total_admins) : 0,
    gross_completed_value: gmv,
    recipient_earnings: riderPayouts,
    platform_earnings: totalPlatformRev,
    completed_transactions: Number(ord.delivered),
    pending_transactions: Number(ord.pending) + Number(ord.confirmed) + Number(ord.preparing) + Number(ord.ready_for_pickup),
    in_transit_transactions: Number(ord.in_transit) + Number(ord.picked_up),
    assigned_transactions: Number(ord.assigned),
  };
}

// -------------------------------------------------------------
// Live Operations Queue (Orders needing immediate attention)
// -------------------------------------------------------------

export async function getLiveOperationsQueue(request: FastifyRequest) {
  const result = await db.query<{
    order_id: string;
    order_status: string;
    delivery_status: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    business_name: string | null;
    business_phone: string | null;
    rider_name: string | null;
    rider_phone: string | null;
    total_amount: number | string;
    created_at: Date;
    updated_at: Date;
    issue_type: string;
    severity: string;
    title: string;
    description: string;
    suggested_action: string;
  }>(`
    SELECT
      o.id AS order_id,
      o.status AS order_status,
      d.status AS delivery_status,
      CONCAT_WS(' ', cu.first_name, cu.last_name) AS customer_name,
      cu.phone_number AS customer_phone,
      b.name AS business_name,
      b.phone_number AS business_phone,
      CONCAT_WS(' ', ru.first_name, ru.last_name) AS rider_name,
      ru.phone_number AS rider_phone,
      o.total_amount,
      o.created_at,
      o.updated_at,
      CASE
        WHEN o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '30 minutes' THEN 'PREPARATION_DELAY'
        WHEN d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '45 minutes' THEN 'TRANSIT_DELAY'
        WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') AND (d.id IS NULL OR d.status = 'PENDING' OR d.rider_id IS NULL) THEN 'UNASSIGNED_RIDER'
        WHEN o.status = 'CANCELLED' AND o.updated_at >= NOW() - INTERVAL '24 hours' THEN 'CANCELLED_EXCEPTION'
        ELSE 'ATTENTION_REQUIRED'
      END AS issue_type,
      CASE
        WHEN o.status = 'CANCELLED' THEN 'MEDIUM'
        WHEN o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '45 minutes' THEN 'HIGH'
        WHEN d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '60 minutes' THEN 'HIGH'
        WHEN o.status = 'READY_FOR_PICKUP' AND (d.id IS NULL OR d.rider_id IS NULL) THEN 'HIGH'
        ELSE 'MEDIUM'
      END AS severity,
      CASE
        WHEN o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '30 minutes' THEN 'Prolonged Preparation Time'
        WHEN d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '45 minutes' THEN 'Delivery Transit Delay'
        WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') AND (d.id IS NULL OR d.status = 'PENDING' OR d.rider_id IS NULL) THEN 'Awaiting Rider Assignment'
        WHEN o.status = 'CANCELLED' THEN 'Recently Cancelled Order'
        ELSE 'Order Follow-up Required'
      END AS title,
      CASE
        WHEN o.status = 'PREPARING' THEN 'Order has been in preparation state for over 30 minutes.'
        WHEN d.status = 'IN_TRANSIT' THEN 'Rider in transit for over 45 minutes.'
        WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') THEN 'No rider assigned yet to accept this delivery.'
        WHEN o.status = 'CANCELLED' THEN 'Order was cancelled within the last 24 hours.'
        ELSE 'Operational verification required.'
      END AS description,
      CASE
        WHEN o.status = 'PREPARING' THEN 'Contact business to check preparation status'
        WHEN d.status = 'IN_TRANSIT' THEN 'Contact rider for location update'
        WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') THEN 'Manually assign or broadcast to nearby active riders'
        WHEN o.status = 'CANCELLED' THEN 'Review cancellation reason and refund if necessary'
        ELSE 'Inspect order details'
      END AS suggested_action
    FROM public.orders o
    LEFT JOIN public.deliveries d ON d.order_id = o.id
    LEFT JOIN public.users cu ON cu.id = o.user_id
    LEFT JOIN public.fulfillments f ON f.order_id = o.id
    LEFT JOIN public.businesses b ON b.id = f.business_id
    LEFT JOIN public.riders r ON r.id = d.rider_id
    LEFT JOIN public.users ru ON ru.id = r.user_id
    WHERE
      (o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '30 minutes')
      OR (d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '45 minutes')
      OR (o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') AND (d.id IS NULL OR d.status = 'PENDING' OR d.rider_id IS NULL))
      OR (o.status = 'CANCELLED' AND o.updated_at >= NOW() - INTERVAL '24 hours')
    ORDER BY
      CASE
        WHEN o.status = 'READY_FOR_PICKUP' AND (d.id IS NULL OR d.rider_id IS NULL) THEN 1
        WHEN o.status = 'PREPARING' AND o.updated_at < NOW() - INTERVAL '30 minutes' THEN 2
        WHEN d.status = 'IN_TRANSIT' AND d.updated_at < NOW() - INTERVAL '45 minutes' THEN 3
        ELSE 4
      END,
      o.updated_at ASC
    LIMIT 50
  `);

  return result.rows.map((row) => ({
    orderId: row.order_id,
    orderStatus: row.order_status,
    deliveryStatus: row.delivery_status,
    customerName: row.customer_name || "Unknown Customer",
    customerPhone: row.customer_phone,
    businessName: row.business_name || "Unknown Business",
    businessPhone: row.business_phone,
    riderName: row.rider_name || "Unassigned",
    riderPhone: row.rider_phone,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issueType: row.issue_type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    suggestedAction: row.suggested_action,
  }));
}

// -------------------------------------------------------------
// Customer Management
// -------------------------------------------------------------

export async function listCustomers(
  request: FastifyRequest,
  query: { search?: string; status?: "ALL" | "ACTIVE" | "SUSPENDED"; limit?: number; offset?: number }
) {
  const conditions: string[] = ["u.role = 'CUSTOMER'", "u.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (query.status === "ACTIVE") {
    conditions.push("u.is_active = TRUE");
  } else if (query.status === "SUSPENDED") {
    conditions.push("u.is_active = FALSE");
  }

  if (query.search?.trim()) {
    params.push(`%${query.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(u.first_name) LIKE $${params.length} OR LOWER(u.last_name) LIKE $${params.length} OR u.phone_number LIKE $${params.length})`);
  }

  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<{
    id: string;
    email: string | null;
    phone_number: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    suspended_at: Date | null;
    suspension_reason: string | null;
    created_at: Date;
    orders_count: string;
    total_spend: string;
  }>(`
    SELECT
      u.id,
      u.email,
      u.phone_number,
      u.first_name,
      u.last_name,
      u.is_active,
      u.suspended_at,
      u.suspension_reason,
      u.created_at,
      COUNT(DISTINCT o.id)::text AS orders_count,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'DELIVERED'), 0)::text AS total_spend
    FROM public.users u
    LEFT JOIN public.orders o ON o.user_id = u.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY u.id, u.email, u.phone_number, u.first_name, u.last_name, u.is_active, u.suspended_at, u.suspension_reason, u.created_at
    ORDER BY u.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return result.rows.map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Unnamed Customer",
    email: r.email,
    phoneNumber: r.phone_number,
    isActive: r.is_active,
    suspendedAt: r.suspended_at,
    suspensionReason: r.suspension_reason,
    ordersCount: Number(r.orders_count),
    totalSpend: Number(r.total_spend),
    createdAt: r.created_at,
  }));
}

export async function getCustomerDetails(request: FastifyRequest, customerId: string) {
  const userRes = await db.query<{
    id: string;
    email: string | null;
    phone_number: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    suspended_at: Date | null;
    suspension_reason: string | null;
    created_at: Date;
  }>(`
    SELECT id, email, phone_number, first_name, last_name, is_active, suspended_at, suspension_reason, created_at
    FROM public.users WHERE id = $1 AND role = 'CUSTOMER'
  `, [customerId]);

  if (userRes.rows.length === 0) {
    throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
  }

  const user = userRes.rows[0];

  const ordersRes = await db.query<{
    id: string;
    business_name: string | null;
    status: string;
    total_amount: number | string;
    created_at: Date;
  }>(`
    SELECT o.id, b.name AS business_name, o.status, o.total_amount, o.created_at
    FROM public.orders o
    LEFT JOIN public.fulfillments f ON f.order_id = o.id
    LEFT JOIN public.businesses b ON b.id = f.business_id
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
    LIMIT 20
  `, [customerId]);

  return {
    customer: {
      id: user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed Customer",
      email: user.email,
      phoneNumber: user.phone_number,
      isActive: user.is_active,
      suspendedAt: user.suspended_at,
      suspensionReason: user.suspension_reason,
      createdAt: user.created_at,
    },
    orders: ordersRes.rows.map((o) => ({
      id: o.id,
      businessName: o.business_name || "Unknown Business",
      status: o.status,
      totalAmount: Number(o.total_amount),
      createdAt: o.created_at,
    }))
  };
}

// -------------------------------------------------------------
// Deliveries Monitoring
// -------------------------------------------------------------

export async function listDeliveries(
  request: FastifyRequest,
  query: { status?: string; limit?: number; offset?: number }
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.status) {
    params.push(query.status);
    conditions.push(`d.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<{
    delivery_id: string;
    order_id: string;
    order_status: string;
    delivery_status: string;
    business_name: string | null;
    rider_name: string | null;
    rider_phone: string | null;
    customer_name: string | null;
    assigned_at: Date | null;
    picked_up_at: Date | null;
    delivered_at: Date | null;
    delivery_fee: number | string;
    total_amount: number | string;
    created_at: Date;
  }>(`
    SELECT
      d.id AS delivery_id,
      o.id AS order_id,
      o.status AS order_status,
      d.status AS delivery_status,
      b.name AS business_name,
      CONCAT_WS(' ', ru.first_name, ru.last_name) AS rider_name,
      ru.phone_number AS rider_phone,
      CONCAT_WS(' ', cu.first_name, cu.last_name) AS customer_name,
      d.assigned_at,
      d.picked_up_at,
      d.delivered_at,
      o.delivery_fee_amount AS delivery_fee,
      o.total_amount,
      d.created_at
    FROM public.deliveries d
    INNER JOIN public.orders o ON o.id = d.order_id
    LEFT JOIN public.fulfillments f ON f.order_id = o.id
    LEFT JOIN public.businesses b ON b.id = f.business_id
    LEFT JOIN public.riders r ON r.id = d.rider_id
    LEFT JOIN public.users ru ON ru.id = r.user_id
    LEFT JOIN public.users cu ON cu.id = o.user_id
    ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return result.rows.map((r) => ({
    deliveryId: r.delivery_id,
    orderId: r.order_id,
    orderStatus: r.order_status,
    deliveryStatus: r.delivery_status,
    businessName: r.business_name || "Unknown Business",
    riderName: r.rider_name || "Unassigned",
    riderPhone: r.rider_phone,
    customerName: r.customer_name || "Customer",
    assignedAt: r.assigned_at,
    pickedUpAt: r.picked_up_at,
    deliveredAt: r.delivered_at,
    deliveryFee: Number(r.delivery_fee),
    totalAmount: Number(r.total_amount),
    createdAt: r.created_at,
  }));
}

// -------------------------------------------------------------
// Administrator Management (Super Admin Exclusive)
// -------------------------------------------------------------

export async function listAdminUsers(request: FastifyRequest) {
  requireSuperAdmin(request);

  const usersRes = await db.query<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    role: string;
    is_active: boolean;
    admin_approved: boolean;
    created_at: Date;
    updated_at: Date;
  }>(`
    SELECT id, email, first_name, last_name, phone_number, role, is_active, admin_approved, created_at, updated_at
    FROM public.users
    WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND deleted_at IS NULL
    ORDER BY role DESC, created_at ASC
  `);

  const permsRes = await db.query<{
    user_id: string;
    permission: string;
  }>(`
    SELECT user_id, permission FROM public.admin_permissions
  `);

  const permMap = new Map<string, string[]>();
  for (const row of permsRes.rows) {
    if (!permMap.has(row.user_id)) {
      permMap.set(row.user_id, []);
    }
    permMap.get(row.user_id)!.push(row.permission);
  }

  return usersRes.rows.map((u) => {
    const isSuper = isSuperAdmin({ role: u.role, email: u.email });
    return {
      id: u.id,
      email: u.email,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phoneNumber: u.phone_number,
      role: u.role,
      isActive: u.is_active,
      adminApproved: u.admin_approved,
      isSuperAdmin: isSuper,
      permissions: isSuper ? [...ALL_ADMIN_PERMISSIONS] : (permMap.get(u.id) ?? []),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  });
}

export async function createAdminUser(request: FastifyRequest, input: CreateAdminInput) {
  requireSuperAdmin(request);

  const existing = await db.query("SELECT id FROM public.users WHERE LOWER(email) = LOWER($1)", [input.email.trim()]);
  if (existing.rows.length > 0) {
    throw new AppError("An account with this email already exists.", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const username = input.email.split("@")[0] + "_" + Math.floor(1000 + Math.random() * 9000);

  const insertUserRes = await db.query<{ id: string }>(`
    INSERT INTO public.users (
      email,
      phone_number,
      first_name,
      last_name,
      username,
      password_hash,
      role,
      is_active,
      admin_approved,
      approved_by,
      approved_at,
      email_verified_at,
      terms_accepted,
      terms_accepted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'ADMIN', TRUE, TRUE, $7, NOW(), NOW(), TRUE, NOW())
    RETURNING id
  `, [
    input.email.trim().toLowerCase(),
    input.phoneNumber.trim(),
    input.firstName.trim(),
    input.lastName.trim(),
    username,
    passwordHash,
    request.user.id
  ]);

  const newAdminId = insertUserRes.rows[0].id;

  if (input.permissions && input.permissions.length > 0) {
    for (const perm of input.permissions) {
      if (ALL_ADMIN_PERMISSIONS.includes(perm as AdminPermission)) {
        await db.query(`
          INSERT INTO public.admin_permissions (user_id, permission, granted_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, permission) DO NOTHING
        `, [newAdminId, perm, request.user.id]);
      }
    }
  }

  await writePlatformAudit(
    request.user.id,
    "ADMIN_CREATED",
    "USER",
    newAdminId,
    `Super Admin created admin account ${input.email}`,
    { email: input.email, permissions: input.permissions }
  );

  return { id: newAdminId, email: input.email, status: "CREATED" };
}

export async function updateAdminPermissions(
  request: FastifyRequest,
  targetUserId: string,
  input: UpdateAdminPermissionsInput
) {
  requireSuperAdmin(request);

  const targetRes = await db.query<{ id: string; role: string; email: string }>(
    "SELECT id, role, email FROM public.users WHERE id = $1",
    [targetUserId]
  );
  if (targetRes.rows.length === 0) {
    throw new AppError("Admin not found.", 404, "ADMIN_NOT_FOUND");
  }
  const target = targetRes.rows[0];

  if (isSuperAdmin(target)) {
    throw new AppError("Super Admin permissions cannot be modified.", 409, "SUPER_ADMIN_PERMISSIONS_IMMUTABLE");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM public.admin_permissions WHERE user_id = $1", [targetUserId]);

    for (const perm of input.permissions) {
      if (ALL_ADMIN_PERMISSIONS.includes(perm as AdminPermission)) {
        await client.query(
          "INSERT INTO public.admin_permissions (user_id, permission, granted_by) VALUES ($1, $2, $3)",
          [targetUserId, perm, request.user.id]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await writePlatformAudit(
    request.user.id,
    "ADMIN_PERMISSIONS_UPDATED",
    "USER",
    targetUserId,
    `Updated permissions for admin ${target.email}`,
    { permissions: input.permissions }
  );

  return { targetUserId, permissions: input.permissions };
}

export async function toggleAdminStatus(
  request: FastifyRequest,
  targetUserId: string,
  input: ToggleAdminStatusInput
) {
  requireSuperAdmin(request);

  const targetRes = await db.query<{ id: string; role: string; email: string }>(
    "SELECT id, role, email FROM public.users WHERE id = $1",
    [targetUserId]
  );
  if (targetRes.rows.length === 0) {
    throw new AppError("Admin not found.", 404, "ADMIN_NOT_FOUND");
  }
  const target = targetRes.rows[0];

  if (target.id === request.user.id) {
    throw new AppError("You cannot disable your own administrator account.", 409, "SELF_DISABLE_NOT_ALLOWED");
  }

  if (isSuperAdmin(target)) {
    throw new AppError("The root Super Admin account cannot be deactivated.", 409, "SUPER_ADMIN_DEACTIVATION_NOT_ALLOWED");
  }

  await db.query(
    "UPDATE public.users SET is_active = $1, updated_at = NOW() WHERE id = $2",
    [input.isActive, targetUserId]
  );

  await writePlatformAudit(
    request.user.id,
    input.isActive ? "ADMIN_ACTIVATED" : "ADMIN_DISABLED",
    "USER",
    targetUserId,
    `Admin ${target.email} status changed to ${input.isActive ? "ACTIVE" : "INACTIVE"}: ${input.reason || "Updated by Super Admin"}`,
    { isActive: input.isActive, reason: input.reason }
  );

  return { targetUserId, isActive: input.isActive };
}

// -------------------------------------------------------------
// System Health
// -------------------------------------------------------------

export async function getSystemHealth(request: FastifyRequest) {
  const callerIsSuper = isSuperAdmin(request.user);
  if (!callerIsSuper) {
    const hasSec = await checkUserPermission(request.user, "SECURITY_VIEW");
    if (!hasSec) {
      throw new AppError("Security view authority required.", 403, "FORBIDDEN");
    }
  }

  const dbStart = Date.now();
  let dbStatus = "OPERATIONAL";
  let dbLatency = 0;
  try {
    await db.query("SELECT 1");
    dbLatency = Date.now() - dbStart;
    if (dbLatency > 500) dbStatus = "DEGRADED";
  } catch {
    dbStatus = "UNAVAILABLE";
  }

  const activeOrdersRes = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM public.orders WHERE status IN ('PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY')"
  );

  const activeRidersRes = await db.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM public.riders WHERE is_active = TRUE AND is_available = TRUE"
  );

  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  return {
    status: dbStatus === "OPERATIONAL" ? "OPERATIONAL" : "DEGRADED",
    timestamp: new Date().toISOString(),
    components: {
      api: { status: "OPERATIONAL", description: "Fastify Gateway core responding" },
      database: { status: dbStatus, latencyMs: dbLatency, description: "Neon PostgreSQL Cloud" },
      authentication: { status: "OPERATIONAL", description: "JWT & Bcrypt session engine" },
      notifications: { status: "OPERATIONAL", description: "Termii SMS & web push worker" },
      backgroundJobs: { status: "OPERATIONAL", description: "Auto-dispatch corridor dispatcher" },
    },
    metrics: {
      uptimeSeconds,
      activeOrdersInFlight: Number(activeOrdersRes.rows[0]?.count || 0),
      availableRiders: Number(activeRidersRes.rows[0]?.count || 0),
      memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    }
  };
}

// -------------------------------------------------------------
// Operational Issues / Support
// -------------------------------------------------------------

export async function listOperationalIssues(
  request: FastifyRequest,
  query: { status?: string; severity?: string; limit?: number; offset?: number }
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.status) {
    params.push(query.status);
    conditions.push(`oi.status = $${params.length}`);
  }
  if (query.severity) {
    params.push(query.severity);
    conditions.push(`oi.severity = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<{
    id: string;
    order_id: string | null;
    issue_type: string;
    status: string;
    severity: string;
    title: string;
    description: string | null;
    assigned_admin_id: string | null;
    assigned_admin_name: string | null;
    resolution_notes: string | null;
    resolved_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(`
    SELECT
      oi.id,
      oi.order_id,
      oi.issue_type,
      oi.status,
      oi.severity,
      oi.title,
      oi.description,
      oi.assigned_admin_id,
      CONCAT_WS(' ', u.first_name, u.last_name) AS assigned_admin_name,
      oi.resolution_notes,
      oi.resolved_at,
      oi.created_at,
      oi.updated_at
    FROM public.operational_issues oi
    LEFT JOIN public.users u ON u.id = oi.assigned_admin_id
    ${whereClause}
    ORDER BY
      CASE oi.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
      END,
      oi.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return result.rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    issueType: r.issue_type,
    status: r.status,
    severity: r.severity,
    title: r.title,
    description: r.description,
    assignedAdminId: r.assigned_admin_id,
    assignedAdminName: r.assigned_admin_name,
    resolutionNotes: r.resolution_notes,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createOperationalIssue(request: FastifyRequest, input: CreateIssueInput) {
  const result = await db.query<{ id: string }>(`
    INSERT INTO public.operational_issues (
      order_id,
      issue_type,
      severity,
      title,
      description,
      assigned_admin_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    input.orderId || null,
    input.issueType,
    input.severity,
    input.title,
    input.description || null,
    request.user.id
  ]);

  const issueId = result.rows[0].id;
  await writePlatformAudit(
    request.user.id,
    "OPERATIONAL_ISSUE_CREATED",
    "OPERATIONAL_ISSUE",
    issueId,
    `Created operational issue: ${input.title}`
  );

  return { id: issueId, status: "OPEN" };
}

export async function resolveOperationalIssue(
  request: FastifyRequest,
  issueId: string,
  input: ResolveIssueInput
) {
  const result = await db.query(
    `UPDATE public.operational_issues
     SET status = 'RESOLVED',
         resolution_notes = $1,
         assigned_admin_id = $2,
         resolved_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id`,
    [input.resolutionNotes, request.user.id, issueId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Operational issue not found.", 404, "ISSUE_NOT_FOUND");
  }

  await writePlatformAudit(
    request.user.id,
    "OPERATIONAL_ISSUE_RESOLVED",
    "OPERATIONAL_ISSUE",
    issueId,
    `Resolved issue with notes: ${input.resolutionNotes}`
  );

  return { id: issueId, status: "RESOLVED" };
}

// -------------------------------------------------------------
// Participant Governance & Account Operations (Preserved)
// -------------------------------------------------------------

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
  await writePlatformAudit(request.user.id, "ACCOUNT_SUSPENDED", "USER", userId, input.reason);
  return { userId, status: "SUSPENDED" };
}

export async function unsuspendAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireSuperAdmin(request);
  await ensureTarget(userId);
  await db.query(`UPDATE public.users SET is_active = TRUE, suspended_at = NULL, suspension_reason = NULL, updated_at = NOW() WHERE id = $1`, [userId]);
  await writePlatformAudit(request.user.id, "ACCOUNT_UNSUSPENDED", "USER", userId, input.reason);
  return { userId, status: "ACTIVE" };
}

export async function deleteAccount(request: FastifyRequest, userId: string, input: AccountActionInput) {
  requireSuperAdmin(request);
  const target = await ensureTarget(userId);
  if (target.id === request.user.id || (target.role === "SUPER_ADMIN" && userId === request.user.id)) {
    throw new AppError("The super admin cannot delete their own account.", 409, "SELF_ACCOUNT_ACTION_NOT_ALLOWED");
  }
  await db.query(`UPDATE public.users SET is_active = FALSE, deleted_at = NOW(), deletion_reason = $1, updated_at = NOW() WHERE id = $2`, [input.reason, userId]);
  await writePlatformAudit(request.user.id, "ACCOUNT_DELETED", "USER", userId, input.reason);
  return { userId, status: "DELETED" };
}
