import type { FastifyInstance } from "fastify";
import { processOutboxCronTrigger } from "../outbox/outbox.processor";
import { successResponse } from "../../utils/api-response";

export async function cronRoutes(app: FastifyInstance): Promise<void> {
  const handler = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : request.headers["x-cron-secret"];

      if (token !== cronSecret) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED_CRON",
            message: "Missing or invalid cron authorization secret.",
          },
        });
      }
    }

    const batchSize = Number(request.query?.batchSize ?? process.env.OUTBOX_BATCH_SIZE ?? 10);
    const result = await processOutboxCronTrigger(batchSize);

    return reply.status(200).send(successResponse(result, request.id));
  };

  // Support both POST and GET for Vercel Cron
  app.post("/outbox", handler);
  app.get("/outbox", handler);
}
