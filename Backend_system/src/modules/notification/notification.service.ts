import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";

export async function listNotificationsForUser(userId: string) {
  const result = await db.query<{
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    order_id: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, type, title, message, status, order_id, created_at
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
