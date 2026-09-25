import webpush from "web-push";
import { db } from "../../db/database";
import { env } from "../../config/env";

const PUSH_MAX_ATTEMPTS = 5;
const PUSH_BATCH_SIZE = 25;

interface PushDelivery {
  id: string;
  attempt_count: number;
  notification_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  title: string;
  message: string;
  type: string;
}

async function claimPushDelivery(): Promise<PushDelivery | null> {
  const result = await db.query<PushDelivery>(
    `
      WITH candidate AS (
        SELECT delivery.id
        FROM public.notification_push_deliveries delivery
        INNER JOIN public.push_subscriptions active_subscription
          ON active_subscription.id = delivery.subscription_id AND active_subscription.is_active = TRUE
        WHERE (delivery.status = 'PENDING' AND delivery.available_at <= NOW())
           OR (delivery.status = 'PROCESSING' AND delivery.locked_at < NOW() - INTERVAL '5 minutes')
        ORDER BY delivery.available_at, delivery.created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      ), claimed AS (
        UPDATE public.notification_push_deliveries delivery
        SET status = 'PROCESSING', locked_at = NOW(), attempt_count = attempt_count + 1, updated_at = NOW()
        FROM candidate
        WHERE delivery.id = candidate.id
        RETURNING delivery.id, delivery.notification_id, delivery.subscription_id, delivery.attempt_count
      )
      SELECT claimed.id, claimed.notification_id, claimed.subscription_id, claimed.attempt_count,
        subscription.endpoint, subscription.p256dh_key, subscription.auth_key,
        notification.title, notification.message, notification.type
      FROM claimed
      INNER JOIN public.push_subscriptions subscription ON subscription.id = claimed.subscription_id
      INNER JOIN public.notifications notification ON notification.id = claimed.notification_id
    `
  );
  return result.rows[0] ?? null;
}

async function updatePushDelivery(
  delivery: PushDelivery,
  status: "SENT" | "PENDING" | "FAILED" | "EXPIRED",
  failureReason?: string
) {
  const delaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, deliveryAttempt(delivery) - 1));
  await db.query(
    `
      UPDATE public.notification_push_deliveries
      SET status = $2,
          available_at = CASE WHEN $2 = 'PENDING' THEN NOW() + ($3::integer * INTERVAL '1 second') ELSE available_at END,
          sent_at = CASE WHEN $2 = 'SENT' THEN NOW() ELSE sent_at END,
          locked_at = NULL,
          failure_reason = $4,
          updated_at = NOW()
      WHERE id = $1
    `,
    [delivery.id, status, delaySeconds, failureReason?.slice(0, 1000) ?? null]
  );
}

function deliveryAttempt(delivery: PushDelivery): number {
  return Number(delivery.attempt_count);
}

export async function processPushDeliveryBatch(limit = PUSH_BATCH_SIZE): Promise<number> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return 0;

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  let processed = 0;

  for (let index = 0; index < limit; index += 1) {
    const delivery = await claimPushDelivery();
    if (!delivery) break;
    processed += 1;

    try {
      await webpush.sendNotification(
        {
          endpoint: delivery.endpoint,
          keys: { p256dh: delivery.p256dh_key, auth: delivery.auth_key }
        },
        JSON.stringify({
          title: delivery.title,
          body: ["RIDER_ASSIGNED", "PICKUP_INSTRUCTIONS"].includes(delivery.type)
            ? "A delivery update is ready. Open SQUADLINK to view pickup details."
            : delivery.message,
          tag: delivery.notification_id,
          url: `/notifications?open=${encodeURIComponent(delivery.notification_id)}`
        }),
        { TTL: 60 * 60 }
      );
      await updatePushDelivery(delivery, "SENT");
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        await db.query(`
          WITH disabled AS (
            UPDATE public.push_subscriptions
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = $1
            RETURNING id
          )
          UPDATE public.notification_push_deliveries deliveries
          SET status = 'EXPIRED', locked_at = NULL,
              failure_reason = 'Push endpoint is no longer valid.', updated_at = NOW()
          FROM disabled
          WHERE deliveries.subscription_id = disabled.id
            AND deliveries.status IN ('PENDING', 'PROCESSING')
        `, [delivery.subscription_id]);
      } else {
        const failureReason = error instanceof Error ? error.message : "Web push delivery failed.";
        await updatePushDelivery(
          delivery,
          deliveryAttempt(delivery) >= PUSH_MAX_ATTEMPTS ? "FAILED" : "PENDING",
          failureReason
        );
      }
    }
  }

  return processed;
}