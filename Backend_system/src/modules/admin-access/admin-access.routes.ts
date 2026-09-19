import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { db } from "../../db/database";
import { authenticate } from "../../middleware/authenticate";
import { AppError } from "../../utils/app-error";
import { successResponse } from "../../utils/api-response";
import { findUserById } from "../auth/auth.repository";

const accessRequestParamsSchema = z.object({
  userId: z.string().uuid()
});

const reviewSchema = z.object({
  notes: z.string().trim().max(500).optional()
});

function ensureMainAdmin(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError("Authentication required.", 401, "AUTHENTICATION_REQUIRED");
  }

  if (request.user.role !== "ADMIN") {
    throw new AppError("You are not authorized to manage admin access.", 403, "FORBIDDEN");
  }

  if (request.user.email !== "contact.squadlink@gmail.com") {
    throw new AppError(
      "Only the main Squadlink admin can approve or reject admin access requests.",
      403,
      "MAIN_ADMIN_REQUIRED"
    );
  }
}

export async function adminAccessRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);

  app.get(
    "/access-requests",
    async (request) => {
      ensureMainAdmin(request);

      const result = await db.query<{
        id: string;
        user_id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        role: string;
        admin_approved: boolean;
        approved_by: string | null;
        approved_at: Date | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `
          SELECT
            id,
            id AS user_id,
            email,
            first_name,
            last_name,
            role,
            admin_approved,
            approved_by,
            approved_at,
            created_at,
            updated_at
          FROM public.users
          WHERE role = 'ADMIN'
            AND is_active = TRUE
            AND admin_approved = FALSE
          ORDER BY created_at ASC
        `
      );

      const data = result.rows.map((row) => ({
        id: row.id,
        requestedUserId: row.user_id,
        requestedUserEmail: row.email,
        requestedUserName: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unspecified admin",
        requestedByUserId: null,
        requestedByName: null,
        status: "PENDING" as const,
        notes: null,
        reviewedByUserId: row.approved_by,
        reviewedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      return successResponse(data, request.id);
    }
  );

  app.post(
    "/access-requests/:userId/approve",
    async (request: FastifyRequest, reply: FastifyReply) => {
      ensureMainAdmin(request);

      const params = accessRequestParamsSchema.parse(request.params);
      const input = reviewSchema.parse(request.body ?? {});

      const user = await findUserById(params.userId);
      if (!user) {
        throw new AppError("Admin access request not found.", 404, "ADMIN_REQUEST_NOT_FOUND");
      }

      if (user.role !== "ADMIN") {
        throw new AppError("This user is not an admin account.", 409, "INVALID_ADMIN_REQUEST");
      }

      if (user.adminApproved) {
        throw new AppError("This admin account has already been approved.", 409, "ADMIN_ALREADY_APPROVED");
      }

      const result = await db.query<{ id: string }>(
        `
          UPDATE public.users
          SET
            admin_approved = TRUE,
            approved_by = $1,
            approved_at = NOW(),
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `,
        [request.user.id, params.userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Admin access request not found.", 404, "ADMIN_REQUEST_NOT_FOUND");
      }

      return reply.status(200).send(
        successResponse(
          {
            id: params.userId,
            status: "APPROVED",
            notes: input.notes ?? null,
            reviewedByUserId: request.user.id,
            reviewedAt: new Date().toISOString(),
          },
          request.id
        )
      );
    }
  );

  app.post(
    "/access-requests/:userId/reject",
    async (request: FastifyRequest, reply: FastifyReply) => {
      ensureMainAdmin(request);

      const params = accessRequestParamsSchema.parse(request.params);
      const input = reviewSchema.parse(request.body ?? {});

      const user = await findUserById(params.userId);
      if (!user) {
        throw new AppError("Admin access request not found.", 404, "ADMIN_REQUEST_NOT_FOUND");
      }

      if (user.role !== "ADMIN") {
        throw new AppError("This user is not an admin account.", 409, "INVALID_ADMIN_REQUEST");
      }

      if (user.adminApproved) {
        throw new AppError("This admin account has already been approved and cannot be rejected.", 409, "ADMIN_ALREADY_APPROVED");
      }

      const result = await db.query<{ id: string }>(
        `
          UPDATE public.users
          SET
            admin_approved = FALSE,
            approved_by = $1,
            approved_at = NOW(),
            is_active = FALSE,
            updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `,
        [request.user.id, params.userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Admin access request not found.", 404, "ADMIN_REQUEST_NOT_FOUND");
      }

      return reply.status(200).send(
        successResponse(
          {
            id: params.userId,
            status: "REJECTED",
            notes: input.notes ?? null,
            reviewedByUserId: request.user.id,
            reviewedAt: new Date().toISOString(),
          },
          request.id
        )
      );
    }
  );
}
