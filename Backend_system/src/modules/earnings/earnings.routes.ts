import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import { withdrawalParamsSchema, withdrawalReviewSchema, withdrawalSchema } from "./earnings.schemas";
import { getMyEarnings, listWithdrawalRequests, requestWithdrawal, reviewWithdrawal } from "./earnings.service";

export async function earningsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/me", { preHandler: [authorize("RIDER", "BUSINESS_USER")] }, async (request) => successResponse(await getMyEarnings(request.user.id), request.id));
  app.post("/me/withdrawals", { preHandler: [authorize("RIDER", "BUSINESS_USER")] }, async (request) => successResponse(await requestWithdrawal(request.user.id, withdrawalSchema.parse(request.body)), request.id));

  app.get("/withdrawals", { preHandler: [authorize("ADMIN")] }, async (request) => successResponse(await listWithdrawalRequests(request), request.id));
  app.put("/withdrawals/:withdrawalId", { preHandler: [authorize("ADMIN")] }, async (request) => {
    const { withdrawalId } = withdrawalParamsSchema.parse(request.params);
    return successResponse(await reviewWithdrawal(request, withdrawalId, withdrawalReviewSchema.parse(request.body)), request.id);
  });
}
