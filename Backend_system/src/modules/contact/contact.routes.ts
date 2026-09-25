import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { successResponse } from "../../utils/api-response";
import { db } from "../../db/database";

const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(5000)
});

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (request, reply) => {
    const input = contactMessageSchema.parse(request.body);
    const result = await db.query<{ id: string; created_at: Date }>(
      `INSERT INTO public.contact_messages (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [input.name, input.email, input.message]
    );

    return reply.status(201).send(successResponse(
      { id: result.rows[0].id, createdAt: result.rows[0].created_at },
      request.id
    ));
  });
}
