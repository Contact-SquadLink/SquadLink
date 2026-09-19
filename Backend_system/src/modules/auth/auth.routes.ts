import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";

import { successResponse } from "../../utils/api-response";
import { authenticate } from "../../middleware/authenticate";
import {
  authenticateUser,
  registerUser
} from "./auth.service";
import {
  loginSchema,
  registerSchema
} from "./auth.schemas";

export async function authRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post(
    "/register",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = registerSchema.safeParse(
        request.body
      );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const user = await registerUser(parsed.data);

      return reply.status(201).send(
        successResponse(user, request.id)
      );
    }
  );

  app.post(
    "/login",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = loginSchema.safeParse(
        request.body
      );

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid login data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const result = await authenticateUser(
        parsed.data
      );

      return reply.status(200).send(
        successResponse(result, request.id)
      );
    }
  );

  app.get(
    "/me",
    {
      preHandler: authenticate
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      return reply.status(200).send(
        successResponse(
          {
            id: request.user.id,
            userId: request.user.id,
            email: request.user.email,
            phoneNumber: request.user.phoneNumber,
            firstName: request.user.firstName,
            lastName: request.user.lastName,
            role: request.user.role
          },
          request.id
        )
      );
    }
  );
}
