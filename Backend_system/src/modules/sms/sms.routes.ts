import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleInboundSms } from "./sms.service";
import { successResponse } from "../../utils/api-response";

const inboundSmsSchema = z.object({
  from: z.string().min(3),
  message: z.string().min(1),
  network: z.string().optional(),
  timestamp: z.string().optional(),
});

export async function smsWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Inbound SMS & USSD Webhook for button-phone riders
  app.post("/api/v1/webhooks/sms", async (request, reply) => {
    // Support JSON or form-urlencoded payload
    const body = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;
    
    // Normalize field names across Termii (from, message / text), Africa's Talking (from, text)
    const rawFrom = String(body.from || body.sender || body.msisdn || "");
    const rawMessage = String(body.message || body.text || body.body || "");

    const parsed = inboundSmsSchema.parse({
      from: rawFrom,
      message: rawMessage,
      network: body.network ? String(body.network) : undefined,
      timestamp: body.timestamp ? String(body.timestamp) : undefined,
    });

    const result = await handleInboundSms(parsed);
    return reply.status(200).send(successResponse(result, request.id));
  });
}
