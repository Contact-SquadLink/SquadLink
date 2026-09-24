import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  riderIdParamsSchema,
  riderVerificationStatusSchema,
  updateRiderVerificationSchema
} from "./rider-verification.schemas";
import {
  getRiderVerification,
  listRiderVerifications,
  reviewRiderVerification
} from "./rider-verification.service";

export async function riderVerificationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize("ADMIN"));

  app.get("/", async (request) => {
    const query = request.query as { status?: string };
    const status = query.status
      ? riderVerificationStatusSchema.parse(query.status)
      : undefined;
    return successResponse(await listRiderVerifications(status), request.id);
  });

  app.get("/:riderId", async (request) => {
    const { riderId } = riderIdParamsSchema.parse(request.params);
    return successResponse(await getRiderVerification(riderId), request.id);
  });

  app.put("/:riderId", async (request) => {
    const { riderId } = riderIdParamsSchema.parse(request.params);
    const input = updateRiderVerificationSchema.parse(request.body);
    return successResponse(
      await reviewRiderVerification(riderId, request.user.id, input),
      request.id
    );
  });
}
