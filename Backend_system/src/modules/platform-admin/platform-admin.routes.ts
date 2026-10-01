import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  requirePermission,
  requireSuperAdminHook,
} from "./admin-permissions";
import {
  accountActionSchema,
  adminIdParamsSchema,
  auditLogQuerySchema,
  configUpdateSchema,
  createAdminSchema,
  createIssueSchema,
  customerQuerySchema,
  deliveryQuerySchema,
  forceTransitionSchema,
  issueIdParamsSchema,
  ledgerQuerySchema,
  orderIdParamsSchema,
  resolveIssueSchema,
  summaryQuerySchema,
  toggleAdminStatusSchema,
  updateAdminPermissionsSchema,
  userIdParamsSchema,
} from "./platform-admin.schemas";
import {
  createAdminUser,
  createOperationalIssue,
  deleteAccount,
  forceTransitionOrder,
  getCustomerDetails,
  getLiveOperationsQueue,
  getObservabilityDashboard,
  getPlatformConfig,
  getPlatformLedger,
  getPlatformSummary,
  getSystemHealth,
  inspectOrder,
  listAccounts,
  listAdminUsers,
  listAuditLogs,
  listCustomers,
  listDeliveries,
  listOperationalIssues,
  listParticipants,
  listSuperAdminOrders,
  resolveOperationalIssue,
  suspendAccount,
  toggleAdminStatus,
  unsuspendAccount,
  updateAdminPermissions,
  updatePlatformConfig,
} from "./platform-admin.service";

export async function platformAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize("ADMIN", "SUPER_ADMIN"));

  // 1. Platform Summary & Population (Role-aware filtering)
  app.get("/summary", async (request) => {
    const query = summaryQuerySchema.parse(request.query);
    return successResponse(await getPlatformSummary(request, query.timeFilter), request.id);
  });

  // 2. Global Observability Dashboard (Super Admin only)
  app.get("/observability", { preHandler: requireSuperAdminHook() }, async (request) => {
    return successResponse(await getObservabilityDashboard(request), request.id);
  });

  // 3. Live Operations Attention Queue
  app.get("/live-ops", { preHandler: requirePermission("ORDER_VIEW") }, async (request) => {
    return successResponse(await getLiveOperationsQueue(request), request.id);
  });

  // 4. Customer Management
  app.get("/customers", { preHandler: requirePermission("CUSTOMER_VIEW") }, async (request) => {
    const query = customerQuerySchema.parse(request.query);
    return successResponse(await listCustomers(request, query), request.id);
  });

  app.get("/customers/:userId", { preHandler: requirePermission("CUSTOMER_VIEW") }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await getCustomerDetails(request, userId), request.id);
  });

  app.post("/customers/:userId/suspend", { preHandler: requirePermission("CUSTOMER_SUSPEND") }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const input = accountActionSchema.parse(request.body);
    return successResponse(await suspendAccount(request, userId, input), request.id);
  });

  app.post("/customers/:userId/unsuspend", { preHandler: requirePermission("CUSTOMER_SUSPEND") }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const input = accountActionSchema.parse(request.body);
    return successResponse(await unsuspendAccount(request, userId, input), request.id);
  });

  // 5. Deliveries Monitoring
  app.get("/deliveries", { preHandler: requirePermission("DELIVERY_VIEW") }, async (request) => {
    const query = deliveryQuerySchema.parse(request.query);
    return successResponse(await listDeliveries(request, query), request.id);
  });

  // 6. Orders Inspection & Force Transition
  app.get("/orders", { preHandler: requirePermission("ORDER_VIEW") }, async (request) => {
    const query = request.query as { stage?: string; limit?: string; offset?: string };
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    return successResponse(
      await listSuperAdminOrders(request, { stage: query.stage, limit, offset }),
      request.id
    );
  });

  app.get("/orders/:orderId", { preHandler: requirePermission("ORDER_VIEW") }, async (request) => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    return successResponse(await inspectOrder(request, orderId), request.id);
  });

  app.post("/orders/:orderId/force-transition", { preHandler: requirePermission("ORDER_INTERVENE") }, async (request) => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const input = forceTransitionSchema.parse(request.body);
    return successResponse(await forceTransitionOrder(request, orderId, input), request.id);
  });

  // 7. Operational Issues & Support Queue
  app.get("/issues", { preHandler: requirePermission("SUPPORT_VIEW") }, async (request) => {
    const query = request.query as { status?: string; severity?: string; limit?: string; offset?: string };
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    return successResponse(
      await listOperationalIssues(request, { status: query.status, severity: query.severity, limit, offset }),
      request.id
    );
  });

  app.post("/issues", { preHandler: requirePermission("SUPPORT_VIEW") }, async (request) => {
    const input = createIssueSchema.parse(request.body);
    return successResponse(await createOperationalIssue(request, input), request.id);
  });

  app.post("/issues/:issueId/resolve", { preHandler: requirePermission("SUPPORT_RESOLVE") }, async (request) => {
    const { issueId } = issueIdParamsSchema.parse(request.params);
    const input = resolveIssueSchema.parse(request.body);
    return successResponse(await resolveOperationalIssue(request, issueId, input), request.id);
  });

  // 8. Double-Entry Platform Ledger (Super Admin only)
  app.get("/ledger", { preHandler: requireSuperAdminHook() }, async (request) => {
    const query = ledgerQuerySchema.parse(request.query);
    return successResponse(await getPlatformLedger(request, query), request.id);
  });

  // 9. Immutable Audit Logs Explorer
  app.get("/audit-logs", { preHandler: requirePermission("AUDIT_LOG_VIEW") }, async (request) => {
    const query = auditLogQuerySchema.parse(request.query);
    return successResponse(await listAuditLogs(request, query), request.id);
  });

  // 10. Platform Pricing & Pilot Configurations
  app.get("/config", { preHandler: requirePermission("PLATFORM_CONFIG_VIEW") }, async (request) => {
    return successResponse(await getPlatformConfig(request), request.id);
  });

  app.put("/config", { preHandler: requireSuperAdminHook() }, async (request) => {
    const input = configUpdateSchema.parse(request.body);
    return successResponse(await updatePlatformConfig(request, input), request.id);
  });

  // 11. System Health
  app.get("/system-health", { preHandler: requirePermission("SECURITY_VIEW") }, async (request) => {
    return successResponse(await getSystemHealth(request), request.id);
  });

  // 12. Administrator Management (Super Admin only)
  app.get("/admin-users", { preHandler: requireSuperAdminHook() }, async (request) => {
    return successResponse(await listAdminUsers(request), request.id);
  });

  app.post("/admin-users", { preHandler: requireSuperAdminHook() }, async (request) => {
    const input = createAdminSchema.parse(request.body);
    return successResponse(await createAdminUser(request, input), request.id);
  });

  app.put("/admin-users/:adminId/permissions", { preHandler: requireSuperAdminHook() }, async (request) => {
    const { adminId } = adminIdParamsSchema.parse(request.params);
    const input = updateAdminPermissionsSchema.parse(request.body);
    return successResponse(await updateAdminPermissions(request, adminId, input), request.id);
  });

  app.post("/admin-users/:adminId/status", { preHandler: requireSuperAdminHook() }, async (request) => {
    const { adminId } = adminIdParamsSchema.parse(request.params);
    const input = toggleAdminStatusSchema.parse(request.body);
    return successResponse(await toggleAdminStatus(request, adminId, input), request.id);
  });

  // 13. Participant Governance & Direct Account Management (Preserved)
  app.get("/participants", { preHandler: requireSuperAdminHook() }, async (request) => {
    const query = request.query as { role?: string };
    return successResponse(await listParticipants(request, query.role), request.id);
  });

  app.get("/accounts", { preHandler: requireSuperAdminHook() }, async (request) => {
    return successResponse(await listAccounts(request), request.id);
  });

  app.post("/accounts/:userId/suspend", { preHandler: requireSuperAdminHook() }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await suspendAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });

  app.post("/accounts/:userId/unsuspend", { preHandler: requireSuperAdminHook() }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await unsuspendAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });

  app.delete("/accounts/:userId", { preHandler: requireSuperAdminHook() }, async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await deleteAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });
}
