import type { FastifyRequest } from "fastify";
import { db } from "../../db/database";
import { AppError } from "../../utils/app-error";
import type { z } from "zod";
import { withdrawalSchema, withdrawalReviewSchema } from "./earnings.schemas";
import { createInAppNotification, notifyAdmins } from "../notification/notification.service";

export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type WithdrawalReviewInput = z.infer<typeof withdrawalReviewSchema>;

async function resolveRecipient(userId: string): Promise<"RIDER" | "BUSINESS" | "CUSTOMER"> {
  const result = await db.query<{ type: "RIDER" | "BUSINESS" | "CUSTOMER" }>(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM public.riders r INNER JOIN public.rider_verifications rv ON rv.rider_id = r.id AND rv.status = 'VERIFIED' WHERE r.user_id = $1) THEN 'RIDER'
      WHEN EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_user_id = $1) THEN 'BUSINESS'
      ELSE 'CUSTOMER'
    END AS type
  `, [userId]);
  return result.rows[0]?.type ?? "CUSTOMER";
}

export async function getMyEarnings(userId: string) {
  const type = await resolveRecipient(userId);
  const [earnings, withdrawals] = await Promise.all([
    db.query(`SELECT id, amount, currency, description, delivery_id AS "deliveryId", order_id AS "orderId", created_at AS "createdAt" FROM public.earning_transactions WHERE recipient_user_id = $1 ORDER BY created_at DESC`, [userId]),
    db.query(`SELECT id, amount, currency, status, payout_details AS "payoutDetails", review_reason AS "reviewReason", created_at AS "createdAt" FROM public.withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC`, [userId])
  ]);
  const totalEarned = earnings.rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const withdrawn = withdrawals.rows.filter((row) => row.status === "PENDING" || row.status === "APPROVED" || row.status === "PAID").reduce((sum, row) => sum + Number(row.amount), 0);
  return {
    recipientType: type,
    totalEarned,
    totalWithdrawn: withdrawn,
    availableBalance: Math.max(0, totalEarned - withdrawn),
    earnings: earnings.rows,
    withdrawals: withdrawals.rows
  };
}

export async function requestWithdrawal(userId: string, input: WithdrawalInput) {
  await resolveRecipient(userId);
  const summary = await getMyEarnings(userId);
  if (input.amount > summary.availableBalance) {
    throw new AppError("Withdrawal amount exceeds your available balance.", 409, "INSUFFICIENT_EARNINGS");
  }

  const result = await db.query(
    `INSERT INTO public.withdrawal_requests (user_id, amount, payout_details) VALUES ($1, $2, $3) RETURNING id, user_id, amount, currency, status, payout_details AS "payoutDetails", created_at AS "createdAt"`,
    [userId, input.amount, JSON.stringify(input.payoutDetails)]
  );

  const row = result.rows[0];

  try {
    await createInAppNotification({
      userId,
      type: "GENERAL",
      title: "Withdrawal Request Received",
      message: `Your withdrawal request of ₦${input.amount.toLocaleString()} has been submitted and is pending administrator review.`,
      eventKey: `withdrawal-request:${row.id}`
    });

    await notifyAdmins({
      type: "GENERAL",
      title: "New Withdrawal Request",
      message: `A user has requested a withdrawal of ₦${input.amount.toLocaleString()}. Payout details: ${JSON.stringify(input.payoutDetails)}`,
      eventKeyPrefix: `admin-withdrawal:${row.id}`
    });
  } catch (err) {
    console.error("[NOTIFICATION WARNING] Failed to deliver withdrawal notifications:", err);
  }

  return row;
}

export async function listWithdrawalRequests(request: FastifyRequest) {
  if (request.user.email !== "contact.squadlink@gmail.com") {
    throw new AppError("Only the main admin can review withdrawals.", 403, "MAIN_ADMIN_REQUIRED");
  }
  const result = await db.query(`
    SELECT wr.id,
           wr.user_id AS "userId",
           u.email,
           u.username,
           u.first_name AS "firstName",
           u.last_name AS "lastName",
           u.role,
           wr.amount,
           wr.currency,
           wr.status,
           wr.payout_details AS "payoutDetails",
           wr.review_reason AS "reviewReason",
           wr.created_at AS "createdAt"
    FROM public.withdrawal_requests wr
    INNER JOIN public.users u ON u.id = wr.user_id
    ORDER BY wr.created_at DESC
  `);
  return result.rows;
}

export async function reviewWithdrawal(request: FastifyRequest, withdrawalId: string, input: WithdrawalReviewInput) {
  if (request.user.email !== "contact.squadlink@gmail.com") {
    throw new AppError("Only the main admin can review withdrawals.", 403, "MAIN_ADMIN_REQUIRED");
  }

  const result = await db.query(
    `UPDATE public.withdrawal_requests
     SET status = $1,
         review_reason = $2,
         reviewed_by = $3,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, user_id, amount, status, review_reason AS "reviewReason", reviewed_at AS "reviewedAt"`,
    [input.status, input.reason ?? null, request.user.id, withdrawalId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Withdrawal request not found.", 404, "WITHDRAWAL_NOT_FOUND");
  }

  const withdrawal = result.rows[0];

  try {
    const outcomeText =
      input.status === "APPROVED"
        ? "approved and is being scheduled for transfer"
        : input.status === "PAID"
        ? "marked as paid. Funds have been dispatched to your account"
        : `declined. Reason: ${input.reason || "Administrative review"}`;

    await createInAppNotification({
      userId: withdrawal.user_id,
      type: "GENERAL",
      title: `Withdrawal ${input.status === "PAID" ? "Completed" : input.status}`,
      message: `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} was ${outcomeText}.`,
      eventKey: `withdrawal-review:${withdrawalId}:${Date.now()}`
    });
  } catch (err) {
    console.error("[NOTIFICATION WARNING] Failed to deliver withdrawal review notification:", err);
  }

  return withdrawal;
}

export async function creditDeliveryEarnings(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> }, deliveryId: string, orderId: string, riderUserId: string | null, businessUserId: string | null, subtotal: number, businessFee = 150) {
  const riderPayout = Math.max(250, Math.round(subtotal * 0.1));
  const businessPayout = Math.max(0, subtotal - riderPayout - businessFee);
  if (riderUserId && riderPayout > 0) await client.query(`INSERT INTO public.earning_transactions (recipient_user_id, recipient_type, delivery_id, order_id, amount, description) VALUES ($1, 'RIDER', $2, $3, $4, 'Delivery rider earnings') ON CONFLICT DO NOTHING`, [riderUserId, deliveryId, orderId, riderPayout]);
  if (businessUserId && businessPayout > 0) await client.query(`INSERT INTO public.earning_transactions (recipient_user_id, recipient_type, delivery_id, order_id, amount, description) VALUES ($1, 'BUSINESS', $2, $3, $4, 'Business fulfillment earnings') ON CONFLICT DO NOTHING`, [businessUserId, deliveryId, orderId, businessPayout]);
}
