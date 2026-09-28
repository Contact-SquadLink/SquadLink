import type { PoolClient } from "pg";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";
import { env } from "../../config/env";

export async function getPushConfig() {
  const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  return {
    available: configured,
    publicKey: configured ? env.VAPID_PUBLIC_KEY : null
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new AppError("Push notifications are not configured yet.", 503, "PUSH_NOT_CONFIGURED");
  }

  await db.query<{ id: string }>(
    `
      INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id
    `,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );

  await db.query(
    `UPDATE public.users SET notifications_enabled = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId]
  );

  return { enabled: true };
}

export async function removePushSubscription(userId: string, endpoint?: string | null) {
  await db.query(`
    UPDATE public.notification_push_deliveries deliveries
    SET status = 'EXPIRED', locked_at = NULL, failure_reason = 'Push disabled by account holder.', updated_at = NOW()
    FROM public.push_subscriptions subscriptions
    WHERE deliveries.subscription_id = subscriptions.id
      AND subscriptions.user_id = $1
      AND ($2::text IS NULL OR subscriptions.endpoint = $2)
      AND deliveries.status IN ('PENDING', 'PROCESSING')
  `, [userId, endpoint || null]);

  await db.query(
    `UPDATE public.push_subscriptions
     SET is_active = FALSE, updated_at = NOW()
     WHERE user_id = $1
       AND ($2::text IS NULL OR endpoint = $2)`,
    [userId, endpoint || null]
  );
  return { enabled: false };
}

export async function getPushSubscriptionStatus(userId: string) {
  const pushResult = await db.query<{ enabled: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = $1 AND is_active = TRUE) AS enabled`,
    [userId]
  );
  const userResult = await db.query<{ notifications_enabled: boolean; role: string; email: string }>(
    `SELECT notifications_enabled, role, email FROM public.users WHERE id = $1`,
    [userId]
  );
  const userRow = userResult.rows[0];
  const isPushEnabled = pushResult.rows[0]?.enabled ?? false;
  const isAccountEnabled = userRow?.notifications_enabled ?? true;

  return {
    enabled: isPushEnabled && isAccountEnabled,
    pushEnabled: isPushEnabled,
    notificationsEnabled: isAccountEnabled,
    role: userRow?.role ?? "CUSTOMER",
    email: userRow?.email ?? ""
  };
}

export async function updateNotificationPreferences(userId: string, enabled: boolean) {
  await db.query(
    `UPDATE public.users SET notifications_enabled = $2, updated_at = NOW() WHERE id = $1`,
    [userId, enabled]
  );
  if (!enabled) {
    await db.query(
      `UPDATE public.push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
  return { notificationsEnabled: enabled };
}

export async function listNotificationsForUser(userId: string) {
  const result = await db.query<{
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    order_id: string | null;
    delivery_id: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, type, title, message, status, order_id,
        (SELECT d.id FROM public.deliveries d WHERE d.order_id = notifications.order_id ORDER BY d.created_at DESC LIMIT 1) AS delivery_id,
        created_at
      FROM public.notifications
      WHERE user_id = $1
        AND channel = 'IN_APP'
        AND status IN ('SENT', 'READ')
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.status === "READ",
    orderId: row.order_id,
    deliveryId: row.delivery_id,
    createdAt: row.created_at
  }));
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const result = await db.query(
    `
      UPDATE public.notifications
      SET status = 'READ', read_at = COALESCE(read_at, NOW()), updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND channel = 'IN_APP'
        AND status IN ('SENT', 'READ')
      RETURNING id
    `,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
  }

  return { id: notificationId, read: true };
}

export async function createInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  eventKey?: string | null;
  client?: PoolClient;
}) {
  const runner = params.client ?? db;
  await runner.query(
    `
      INSERT INTO public.notifications (
        user_id, order_id, type, channel, status, title, message, event_key
      )
      VALUES ($1, $2, $3::public.notification_type, 'IN_APP', 'SENT', $4, $5, $6)
      ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
    `,
    [
      params.userId,
      params.orderId ?? null,
      params.type,
      params.title,
      params.message,
      params.eventKey ?? null,
    ]
  );
}

export async function notifyAdmins(params: {
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  eventKeyPrefix?: string | null;
  client?: PoolClient;
}) {
  const runner = params.client ?? db;
  const admins = await runner.query<{ id: string }>(
    `SELECT id FROM public.users WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND is_active = TRUE`
  );
  for (const admin of admins.rows) {
    const key = params.eventKeyPrefix ? `${params.eventKeyPrefix}:${admin.id}` : null;
    await createInAppNotification({
      userId: admin.id,
      type: params.type,
      title: params.title,
      message: params.message,
      orderId: params.orderId,
      eventKey: key,
      client: params.client,
    });
  }
}

