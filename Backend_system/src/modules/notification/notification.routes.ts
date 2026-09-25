import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import {
  getPushConfig,
  getPushSubscriptionStatus,
  listNotificationsForUser,
  markNotificationRead,
  removePushSubscription,
  savePushSubscription
} from "./notification.service";

const notificationParamsSchema = z.object({
  notificationId: z.string().uuid()
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(32).max(255),
    auth: z.string().min(16).max(255)
  })
});

const pushUnsubscribeSchema = z.object({ endpoint: z.string().url().max(2048) });

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook(
    "preHandler",
    authorize("CUSTOMER", "BUSINESS_USER", "RIDER", "ADMIN")
  );

  app.get("/", async (request) => successResponse(
    await listNotificationsForUser(request.user.id),
    request.id
  ));

  app.get("/push/config", async (request) => successResponse(
    await getPushConfig(),
    request.id
  ));

  app.get("/push/subscription", async (request) => successResponse(
    await getPushSubscriptionStatus(request.user.id),
    request.id
  ));

  app.post("/push/subscription", async (request, reply) => {
    const subscription = pushSubscriptionSchema.parse(request.body);
    return reply.status(201).send(successResponse(
      await savePushSubscription(request.user.id, subscription),
      request.id
    ));
  });

  app.delete("/push/subscription", async (request) => {
    const { endpoint } = pushUnsubscribeSchema.parse(request.body);
    return successResponse(
      await removePushSubscription(request.user.id, endpoint),
      request.id
    );
  });

  app.post("/:notificationId/read", async (request) => {
    const { notificationId } = notificationParamsSchema.parse(request.params);
    return successResponse(
      await markNotificationRead(request.user.id, notificationId),
      request.id
    );
  });
}
