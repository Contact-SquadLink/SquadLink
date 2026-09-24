import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import { accountActionSchema, userIdParamsSchema } from "./platform-admin.schemas";
import { deleteAccount, getPlatformSummary, listAccounts, suspendAccount, unsuspendAccount } from "./platform-admin.service";

export async function platformAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize("ADMIN"));

  app.get("/summary", async (request) => successResponse(await getPlatformSummary(request), request.id));
  app.get("/accounts", async (request) => successResponse(await listAccounts(request), request.id));

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
