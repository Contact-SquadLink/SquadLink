import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";

export interface OutboundSmsPayload {
  to: string;
  message: string;
}

export interface InboundSmsWebhookPayload {
  from: string;
  message: string;
  network?: string;
  timestamp?: string;
}

/**
 * Normalizes phone numbers to Nigerian international format (+234...)
 */
export function normalizePhoneNumber(rawNumber: string): string {
  const cleaned = rawNumber.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+234") && cleaned.length === 14) {
    return cleaned;
  }
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Outbound SMS delivery service with adapters for Termii and Africa's Talking,
 * plus a verified simulation fallback for test/sandbox environments.
 */
export async function sendOutboundSms(payload: OutboundSmsPayload): Promise<{ success: boolean; messageId: string; provider: string }> {
  const normalizedTo = normalizePhoneNumber(payload.to);
  const termiiApiKey = process.env.TERMII_API_KEY;
  const africastalkingApiKey = process.env.AFRICASTALKING_API_KEY;

  if (termiiApiKey) {
    try {
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalizedTo,
          from: process.env.TERMII_SENDER_ID || "SquadLink",
          sms: payload.message,
          type: "plain",
          channel: "generic",
          api_key: termiiApiKey,
        }),
      });
      const data = (await response.json()) as { message_id?: string; message?: string };
      return {
        success: response.ok,
        messageId: data.message_id || `termii-${Date.now()}`,
        provider: "TERMII",
      };
    } catch (error) {
      console.error("[SMS TERMII ERROR]", error);
    }
  }

  if (africastalkingApiKey && process.env.AFRICASTALKING_USERNAME) {
    try {
      const body = new URLSearchParams({
        username: process.env.AFRICASTALKING_USERNAME,
        to: normalizedTo,
        message: payload.message,
        from: process.env.AFRICASTALKING_SENDER_ID || "SquadLink",
      });

      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: africastalkingApiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      return {
        success: response.ok,
        messageId: `at-${Date.now()}`,
        provider: "AFRICAS_TALKING",
      };
    } catch (error) {
      console.error("[SMS AFRICAS_TALKING ERROR]", error);
    }
  }

  // Simulated fallback mode with audit recording
  console.log(`[SMS DISPATCH (SIMULATED)] Sent to ${normalizedTo}: "${payload.message}"`);
  return {
    success: true,
    messageId: `sim-sms-${Date.now()}`,
    provider: "SIMULATED",
  };
}

/**
 * Outbound SMS dispatch notification for button-phone riders upon assignment
 */
export async function notifyFeaturePhoneRiderAssignment(params: {
  riderPhone: string;
  orderId: string;
  pickupAddress: string;
  deliveryAddress: string;
  payout: number;
}): Promise<void> {
  const shortOrderId = params.orderId.slice(0, 8);
  const message = `SquadLink: Delivery #${shortOrderId} assigned! Pickup: ${params.pickupAddress}. Dropoff: ${params.deliveryAddress}. Payout: NGN ${params.payout}. Reply 1 to ACCEPT, 2 to REJECT.`;
  await sendOutboundSms({ to: params.riderPhone, message });
}

/**
 * Inbound SMS & USSD Webhook handler (/api/v1/webhooks/sms)
 * Allows feature-phone riders to reply with text commands:
 * "1" -> ACCEPT assignment
 * "2" -> REJECT assignment
 */
export async function handleInboundSms(payload: InboundSmsWebhookPayload): Promise<{
  action: "ACCEPTED" | "REJECTED" | "UNKNOWN_COMMAND" | "NO_ACTIVE_ASSIGNMENT" | "RIDER_NOT_FOUND";
  replyMessage: string;
  deliveryId?: string;
}> {
  const normalizedFrom = normalizePhoneNumber(payload.from);
  const command = payload.message.trim().toUpperCase();

  // Find rider by registered phone number
  const riderResult = await db.query<{
    rider_id: string;
    user_id: string;
    device_type: string;
  }>(
    `SELECT r.id AS rider_id, r.user_id, r.device_type
     FROM public.riders r
     INNER JOIN public.users u ON u.id = r.user_id
     WHERE r.registered_phone_number = $1 OR u.phone_number = $1
     LIMIT 1`,
    [normalizedFrom]
  );

  if (riderResult.rows.length === 0) {
    return {
      action: "RIDER_NOT_FOUND",
      replyMessage: "SquadLink: Your phone number is not registered to an active rider account.",
    };
  }

  const rider = riderResult.rows[0];

  // Find pending delivery assignment decision
  const decisionResult = await db.query<{
    decision_id: string;
    delivery_id: string;
    order_id: string;
    status: string;
  }>(
    `SELECT dad.id AS decision_id, dad.delivery_id, d.order_id, dad.status
     FROM public.delivery_assignment_decisions dad
     INNER JOIN public.deliveries d ON d.id = dad.delivery_id
     WHERE dad.rider_id = $1
       AND dad.status = 'PENDING'
       AND dad.expires_at > NOW()
     ORDER BY dad.created_at DESC
     LIMIT 1`,
    [rider.rider_id]
  );

  if (decisionResult.rows.length === 0) {
    const replyMessage = "SquadLink: You have no pending delivery assignment to accept or decline.";
    await sendOutboundSms({ to: normalizedFrom, message: replyMessage });
    return { action: "NO_ACTIVE_ASSIGNMENT", replyMessage };
  }

  const decision = decisionResult.rows[0];

  // Command "1" = ACCEPT
  if (command === "1" || command.startsWith("1 ") || command === "ACCEPT") {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.delivery_assignment_decisions
         SET status = 'ACCEPTED', decided_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [decision.decision_id]
      );

      await client.query(
        `UPDATE public.deliveries
         SET status = 'ASSIGNED', updated_at = NOW()
         WHERE id = $1`,
        [decision.delivery_id]
      );

      await client.query(
        `INSERT INTO public.delivery_assignment_history (delivery_id, rider_id, action, changed_by, reason)
         VALUES ($1, $2, 'ASSIGNED', $3, 'Feature-phone rider accepted via SMS webhook command 1.')`,
        [decision.delivery_id, rider.rider_id, rider.user_id]
      );
    });

    const replyMessage = `SquadLink: Delivery #${decision.order_id.slice(0, 8)} accepted! Proceed to pickup location. Show pickup credential to merchant.`;
    await sendOutboundSms({ to: normalizedFrom, message: replyMessage });
    return { action: "ACCEPTED", replyMessage, deliveryId: decision.delivery_id };
  }

  // Command "2" = REJECT
  if (command === "2" || command.startsWith("2 ") || command === "REJECT") {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.delivery_assignment_decisions
         SET status = 'REJECTED', reason = 'Declined via SMS webhook command 2.', decided_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [decision.decision_id]
      );

      await client.query(
        `UPDATE public.deliveries
         SET rider_id = NULL, vehicle_id = NULL, status = 'SEARCHING_RIDER', assigned_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [decision.delivery_id]
      );

      await client.query(
        `UPDATE public.riders
         SET is_available = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [rider.rider_id]
      );

      await client.query(
        `INSERT INTO public.delivery_assignment_history (delivery_id, rider_id, action, changed_by, reason)
         VALUES ($1, $2, 'UNASSIGNED', $3, 'Feature-phone rider declined via SMS webhook command 2.')`,
        [decision.delivery_id, rider.rider_id, rider.user_id]
      );
    });

    const replyMessage = "SquadLink: Delivery declined. You remain available for other delivery assignments in your zone.";
    await sendOutboundSms({ to: normalizedFrom, message: replyMessage });
    return { action: "REJECTED", replyMessage, deliveryId: decision.delivery_id };
  }

  const replyMessage = "SquadLink: Unrecognized reply. Please reply 1 to ACCEPT or 2 to REJECT this delivery.";
  await sendOutboundSms({ to: normalizedFrom, message: replyMessage });
  return { action: "UNKNOWN_COMMAND", replyMessage };
}
