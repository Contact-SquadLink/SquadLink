import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";

import { successResponse } from "../../utils/api-response";
import { authenticate } from "../../middleware/authenticate";
import {
  authenticateUser,
  confirmVerificationOtpService,
  registerUser,
  requestVerificationOtpService,
  resetPasswordService,
  updateUserProfileService
} from "./auth.service";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyOtpSchema
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
        const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === "email");
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: emailIssue?.message ?? "Invalid registration data.",
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
            username: request.user.username,
            avatarUrl: request.user.avatarUrl,
            emailVerifiedAt: request.user.emailVerifiedAt,
            phoneVerifiedAt: request.user.phoneVerifiedAt,
            profileUpdatedAt: request.user.profileUpdatedAt,
            role: request.user.role
          },
          request.id
        )
      );
    }
  );

  app.patch(
    "/me/profile",
    {
      preHandler: authenticate
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const updated = await updateUserProfileService(request.user.id, parsed.data);
      return reply.status(200).send(
        successResponse(updated, request.id)
      );
    }
  );

  app.post(
    "/verify/request-code",
    {
      preHandler: authenticate
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = requestOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid OTP request data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const res = await requestVerificationOtpService(request.user.id, parsed.data);
      return reply.status(200).send(
        successResponse(res, request.id)
      );
    }
  );

  app.post(
    "/verify/confirm",
    {
      preHandler: authenticate
    },
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = verifyOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid verification code data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const res = await confirmVerificationOtpService(request.user.id, parsed.data);
      return reply.status(200).send(
        successResponse(res, request.id)
      );
    }
  );

  app.post(
    "/password/forgot",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = forgotPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid recovery request.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const res = await requestVerificationOtpService(null, {
        type: "PASSWORD_RESET",
        identifier: parsed.data.identifier
      });

      return reply.status(200).send(
        successResponse(res, request.id)
      );
    }
  );

  app.post(
    "/password/reset",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid reset data.",
            details: parsed.error.flatten()
          },
          requestId: request.id
        });
      }

      const res = await resetPasswordService(parsed.data);
      return reply.status(200).send(
        successResponse(res, request.id)
      );
    }
  );
}
