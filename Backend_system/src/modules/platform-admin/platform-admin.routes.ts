import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  accountActionSchema,
  auditLogQuerySchema,
  configUpdateSchema,
  forceTransitionSchema,
  ledgerQuerySchema,
  orderIdParamsSchema,
  userIdParamsSchema,
} from "./platform-admin.schemas";
import {
  deleteAccount,
  forceTransitionOrder,
  getObservabilityDashboard,
  getPlatformConfig,
  getPlatformLedger,
  getPlatformSummary,
  inspectOrder,
  listAccounts,
  listAuditLogs,
  listParticipants,
  listSuperAdminOrders,
  suspendAccount,
  unsuspendAccount,
  updatePlatformConfig,
} from "./platform-admin.service";

export async function platformAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize("ADMIN", "SUPER_ADMIN"));

  // 1. Global Observability Dashboard
  app.get("/observability", async (request) => {
    return successResponse(await getObservabilityDashboard(request), request.id);
  });

  app.get("/summary", async (request) => {
    return successResponse(await getPlatformSummary(request), request.id);
  });

  // 2. Absolute Intervention Authority: Orders across 9 stages
  app.get("/orders", async (request) => {
    const query = request.query as { stage?: string; limit?: string; offset?: string };
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;
    return successResponse(
      await listSuperAdminOrders(request, { stage: query.stage, limit, offset }),
      request.id
    );
  });

  app.get("/orders/:orderId", async (request) => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    return successResponse(await inspectOrder(request, orderId), request.id);
  });

  app.post("/orders/:orderId/force-transition", async (request) => {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const input = forceTransitionSchema.parse(request.body);
    return successResponse(await forceTransitionOrder(request, orderId, input), request.id);
  });

  // 3. Double-Entry Platform Ledger Explorer
  app.get("/ledger", async (request) => {
    const query = ledgerQuerySchema.parse(request.query);
    return successResponse(await getPlatformLedger(request, query), request.id);
  });

  // 4. Immutable Audit Logs Explorer
  app.get("/audit-logs", async (request) => {
    const query = auditLogQuerySchema.parse(request.query);
    return successResponse(await listAuditLogs(request, query), request.id);
  });

  // 5. System Governance & Pilot Parameters
  app.get("/config", async (request) => {
    return successResponse(await getPlatformConfig(request), request.id);
  });

  app.put("/config", async (request) => {
    const input = configUpdateSchema.parse(request.body);
    return successResponse(await updatePlatformConfig(request, input), request.id);
  });

  // 6. Participant Governance
  app.get("/participants", async (request) => {
    const query = request.query as { role?: string };
    return successResponse(await listParticipants(request, query.role), request.id);
  });

  // 7. Account Management
  app.get("/accounts", async (request) => {
    return successResponse(await listAccounts(request), request.id);
  });

  app.post("/accounts/:userId/suspend", async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await suspendAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });

  app.post("/accounts/:userId/unsuspend", async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await unsuspendAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });

  app.delete("/accounts/:userId", async (request) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    return successResponse(await deleteAccount(request, userId, accountActionSchema.parse(request.body)), request.id);
  });
}
