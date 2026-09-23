import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  listNotificationsForUser,
  markNotificationRead
} from "./notification.service";

const notificationParamsSchema = z.object({
  notificationId: z.string().uuid()
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize("CUSTOMER"));

  app.get("/", async (request) => successResponse(
    await listNotificationsForUser(request.user.id),
    request.id
  ));

  app.post("/:notificationId/read", async (request) => {
    const { notificationId } = notificationParamsSchema.parse(request.params);
    return successResponse(
      await markNotificationRead(request.user.id, notificationId),
      request.id
    );
  });
}
