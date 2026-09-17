import jwt from "jsonwebtoken";
import type {
  FastifyReply,
  FastifyRequest
} from "fastify";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { findUserById } from "../modules/auth/auth.repository";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export interface AuthenticatedRequest
  extends FastifyRequest {
  user: AuthenticatedUser;
}

interface JwtPayload {
  sub?: string;
  role?: string;
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authorization =
    request.headers.authorization;

  if (!authorization) {
    throw new AppError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme !== "Bearer" ||
    !token
  ) {
    throw new AppError(
      "Invalid authorization header.",
      401,
      "INVALID_AUTHORIZATION_HEADER"
    );
  }

  let decoded: string | jwt.JwtPayload;

  try {
    decoded = jwt.verify(
      token,
      env.JWT_SECRET
    );
  } catch {
    throw new AppError(
      "Invalid or expired authentication token.",
      401,
      "INVALID_TOKEN"
    );
  }

  if (
    typeof decoded !== "object" ||
    decoded === null
  ) {
    throw new AppError(
      "Invalid or expired authentication token.",
      401,
      "INVALID_TOKEN"
    );
  }

  const payload = decoded as JwtPayload;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new AppError(
      "Invalid or expired authentication token.",
      401,
      "INVALID_TOKEN"
    );
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw new AppError(
      "Invalid or expired authentication token.",
      401,
      "INVALID_TOKEN"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "This account is inactive.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  request.user = {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

