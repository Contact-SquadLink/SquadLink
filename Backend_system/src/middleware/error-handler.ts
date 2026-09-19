import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { AppError } from "../utils/app-error";
import { errorResponse } from "../utils/api-response";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(
        errorResponse(
          error.code,
          error.message,
          undefined,
          request.id
        )
      );
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(
        errorResponse(
          "VALIDATION_ERROR",
          "Request validation failed.",
          error.issues,
          request.id
        )
      );
    }

    const requestError = error as {
      statusCode?: number;
      code?: string;
    };

    if (
      typeof requestError.statusCode === "number"
      && requestError.statusCode >= 400
      && requestError.statusCode < 500
    ) {
      return reply.status(requestError.statusCode).send(
        errorResponse(
          requestError.statusCode === 400
            ? "VALIDATION_ERROR"
            : requestError.code ?? "REQUEST_ERROR",
          requestError.statusCode === 400
            ? "Request validation failed."
            : "Request could not be processed.",
          undefined,
          request.id
        )
      );
    }

    request.log.error(error);

    return reply.status(500).send(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred.",
        undefined,
        request.id
      )
    );
  });
}