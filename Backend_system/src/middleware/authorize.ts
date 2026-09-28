import type {
  FastifyReply,
  FastifyRequest
} from "fastify";

import { AppError } from "../utils/app-error";

export function authorize(
  ...allowedRoles: string[]
) {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      throw new AppError(
        "Authentication required.",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    if (request.user.role === "SUPER_ADMIN") {
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        "You are not authorized to perform this action.",
        403,
        "FORBIDDEN"
      );
    }
  };
}
