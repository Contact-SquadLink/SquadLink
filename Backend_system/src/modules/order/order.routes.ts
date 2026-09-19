import type { FastifyInstance } from "fastify";

import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { successResponse } from "../../utils/api-response";
import { placeOrderSchema } from "./order.schemas";
import { getOrderForUser, listOrdersForUser, placeOrder } from "./order.service";

export async function orderRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/",
    {
      preHandler: [
        authenticate,
        authorize("CUSTOMER", "BUSINESS_USER")
      ]
    },
    async (request) => {
      return successResponse(
        await listOrdersForUser(request.user.id),
        request.id
      );
    }
  );

  app.get(
    "/:orderId",
    {
      preHandler: [
        authenticate,
        authorize("CUSTOMER", "BUSINESS_USER")
      ]
    },
    async (request) => {
      const { orderId } = request.params as { orderId: string };
      return successResponse(
        await getOrderForUser(request.user.id, orderId),
        request.id
      );
    }
  );

  app.post(
    "/",
    {
      preHandler: [
        authenticate,
        authorize("CUSTOMER", "BUSINESS_USER")
      ]
    },
    async (request, reply) => {
      const input = placeOrderSchema.parse(request.body);
      const idempotencyKey = request.headers["idempotency-key"];

      if (typeof idempotencyKey !== "string") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "A valid Idempotency-Key header is required."
          },
          requestId: request.id
        });
      }

      const order = await placeOrder(
        request.user.id,
        input,
        idempotencyKey
      );

      return reply.status(201).send(
        successResponse(order, request.id)
      );
    }
  );
}