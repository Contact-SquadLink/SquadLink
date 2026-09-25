import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";
import { env } from "../../config/env";
import type { ProviderPaymentInput } from "./lifecycle.schemas";
import { creditDeliveryEarnings } from "../earnings/earnings.service";

function fail(message: string, status: number, code: string): never {
  throw new AppError(message, status, code);
}

function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function registerRider(
  userId: string,
  input: {
    vehicleType?: string;
    vehicleRegistration?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  }
) {
  return withTransaction(async (client) => {
    const userResult = await client.query<{
      id: string;
      role: string;
      email: string | null;
      phone_number: string | null;
      first_name: string | null;
      last_name: string | null;
    }>(
      `SELECT id, role, email, phone_number, first_name, last_name FROM public.users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      fail("User not found.", 404, "USER_NOT_FOUND");
    }

    const user = userResult.rows[0];
    if (user.role !== "CUSTOMER") {
      if (user.role === "RIDER") {
        return await getRiderProfile(userId);
      }
      fail("Only customer accounts can register as a rider.", 403, "RIDER_REGISTRATION_ROLE_REQUIRED");
    }

    const vehicleType = (input.vehicleType ?? "MOTORCYCLE").toUpperCase();
    const typeResult = await client.query<{ id: string }>(
      `SELECT id FROM public.vehicle_types WHERE code = $1 AND is_active = TRUE LIMIT 1`,
      [vehicleType]
    );

    if (typeResult.rows.length === 0) {
      fail("The requested vehicle type is not available.", 400, "INVALID_VEHICLE_TYPE");
    }

    const riderResult = await client.query<{ id: string }>(
      `SELECT id FROM public.riders WHERE user_id = $1`,
      [userId]
    );

    let riderId: string;
    if (riderResult.rows.length > 0) {
      riderId = riderResult.rows[0].id;
    } else {
      const createdRider = await client.query<{ id: string }>(
        `INSERT INTO public.riders (user_id, is_active, is_available, current_location) VALUES ($1, FALSE, FALSE, NULL) RETURNING id`,
        [userId]
      );
      riderId = createdRider.rows[0].id;
    }

    const vehicleRegistration = (input.vehicleRegistration ?? "").trim();
    if (vehicleRegistration) {
      const existingVehicle = await client.query<{ rider_id: string }>(
        `SELECT rider_id FROM public.vehicles WHERE registration_number = $1 LIMIT 1`,
        [vehicleRegistration]
      );
      if (existingVehicle.rows.length > 0 && existingVehicle.rows[0].rider_id !== riderId) {
        fail("That vehicle registration is already registered to another rider.", 409, "VEHICLE_REGISTRATION_ALREADY_EXISTS");
      }
      await client.query(
        `INSERT INTO public.vehicles (rider_id, vehicle_type_id, registration_number, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (registration_number) DO UPDATE SET rider_id = EXCLUDED.rider_id, vehicle_type_id = EXCLUDED.vehicle_type_id, is_active = TRUE, updated_at = NOW()`,
        [riderId, typeResult.rows[0].id, vehicleRegistration]
      );
    }

    await client.query(
      `UPDATE public.users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone_number = COALESCE($3, phone_number), updated_at = NOW() WHERE id = $4`,
      [input.firstName ?? null, input.lastName ?? null, input.phoneNumber ?? null, userId]
    );

    await client.query(
      `
        INSERT INTO public.rider_verifications (rider_id, status)
        VALUES ($1, 'PENDING')
        ON CONFLICT (rider_id) DO UPDATE SET updated_at = NOW()
      `,
      [riderId]
    );

    await client.query(
      `
        INSERT INTO public.notifications (
          user_id, type, channel, status, title, message, event_key
        )
        VALUES ($1, 'RIDER_APPLICATION_SUBMITTED'::public.notification_type, 'IN_APP', 'SENT', $2, $3, $4)
        ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
      `,
      [
        userId,
        "Rider application submitted",
        "Your rider application was submitted and is awaiting admin verification.",
        `rider-application:${riderId}:SUBMITTED`
      ]
    );

    await client.query(
      `INSERT INTO public.rider_wallets (rider_id, current_balance_amount, currency)
       VALUES ($1, 0, 'NGN')
       ON CONFLICT (rider_id) DO NOTHING`,
      [riderId]
    );

    const riderProfileResult = await client.query<{
      user_id: string;
      email: string | null;
      phone_number: string | null;
      first_name: string | null;
      last_name: string | null;
      role: string;
      rider_id: string | null;
      is_active: boolean | null;
      is_available: boolean | null;
      current_balance_amount: string | number | null;
      vehicle_type: string | null;
      vehicle_registration: string | null;
      verification_status: string | null;
    }>(`
      SELECT
        u.id AS user_id,
        u.email,
        u.phone_number,
        u.first_name,
        u.last_name,
        u.role,
        r.id AS rider_id,
        r.is_active,
        r.is_available,
        rw.current_balance_amount,
        vt.code AS vehicle_type,
        v.registration_number AS vehicle_registration,
        rv.status AS verification_status
      FROM public.users u
      LEFT JOIN public.riders r ON r.user_id = u.id
      LEFT JOIN public.rider_wallets rw ON rw.rider_id = r.id
      LEFT JOIN public.vehicles v ON v.rider_id = r.id AND v.is_active = TRUE
      LEFT JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN public.rider_verifications rv ON rv.rider_id = r.id
      WHERE u.id = $1
      LIMIT 1
    `, [userId]);

    const row = riderProfileResult.rows[0];
    if (!row) {
      fail("Rider profile not found.", 404, "RIDER_NOT_FOUND");
    }

    return {
      userId: row.user_id,
      email: row.email,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      riderId: row.rider_id,
      active: row.is_active ?? false,
      available: row.is_available ?? false,
      currentBalance: Number(row.current_balance_amount ?? 0),
      vehicleType: row.vehicle_type ?? null,
      vehicleRegistration: row.vehicle_registration ?? null,
      verificationStatus: row.verification_status ?? null,
    };
  });
}

export async function getRiderProfile(userId: string) {
  const { db } = await import("../../db/database");
  const result = await db.query<{
    user_id: string;
    email: string | null;
    phone_number: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    rider_id: string | null;
    is_active: boolean | null;
    is_available: boolean | null;
    current_balance_amount: string | number | null;
    vehicle_type: string | null;
    vehicle_registration: string | null;
    verification_status: string | null;
  }>(`
    SELECT
      u.id AS user_id,
      u.email,
      u.phone_number,
      u.first_name,
      u.last_name,
      u.role,
      r.id AS rider_id,
      r.is_active,
      r.is_available,
      rw.current_balance_amount,
      vt.code AS vehicle_type,
      v.registration_number AS vehicle_registration,
      rv.status AS verification_status
    FROM public.users u
    LEFT JOIN public.riders r ON r.user_id = u.id
    LEFT JOIN public.rider_wallets rw ON rw.rider_id = r.id
    LEFT JOIN public.vehicles v ON v.rider_id = r.id AND v.is_active = TRUE
    LEFT JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id
    LEFT JOIN public.rider_verifications rv ON rv.rider_id = r.id
    WHERE u.id = $1
    LIMIT 1
  `, [userId]);

  if (result.rows.length === 0) {
    fail("Rider profile not found.", 404, "RIDER_NOT_FOUND");
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    email: row.email,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    riderId: row.rider_id,
    active: row.is_active ?? false,
    available: row.is_available ?? false,
    currentBalance: Number(row.current_balance_amount ?? 0),
    vehicleType: row.vehicle_type ?? null,
    vehicleRegistration: row.vehicle_registration ?? null,
    verificationStatus: row.verification_status ?? null,
  };
}

export async function setRiderAvailability(userId: string, available: boolean) {
  const { db } = await import("../../db/database");
  const result = await db.query<{ id: string; is_available: boolean }>(
    `
      UPDATE public.riders r
      SET is_available = $1, updated_at = NOW()
      FROM public.rider_verifications rv
      WHERE r.user_id = $2
        AND rv.rider_id = r.id
        AND rv.status = 'VERIFIED'
        AND r.is_active = TRUE
      RETURNING r.id, r.is_available
    `,
    [available, userId]
  );

  if (result.rows.length === 0) {
    fail("Rider profile not found.", 404, "RIDER_NOT_FOUND");
  }

  if (available) {
    await assignWaitingDeliveries(userId);
  }

  return {
    userId,
    available: result.rows[0].is_available,
  };
}

export async function setRiderLocation(
  userId: string,
  latitude: number,
  longitude: number
) {
  const { db } = await import("../../db/database");
  const result = await db.query<{ id: string }>(
    `
      UPDATE public.riders r
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          updated_at = NOW()
      FROM public.rider_verifications rv
      WHERE r.user_id = $3
        AND rv.rider_id = r.id
        AND rv.status = 'VERIFIED'
        AND r.is_active = TRUE
      RETURNING r.id
    `,
    [longitude, latitude, userId]
  );

  if (result.rows.length === 0) {
    fail("Verified rider profile not found.", 404, "RIDER_NOT_FOUND");
  }

  await assignWaitingDeliveries(userId);

  return { userId, latitude, longitude };
}

async function assignWaitingDeliveries(actorUserId: string): Promise<void> {
  await withTransaction(async (client) => {
    const waiting = await client.query<{ order_id: string }>(
      `
        SELECT d.order_id
        FROM public.deliveries d
        INNER JOIN public.orders o ON o.id = d.order_id
        WHERE d.status = 'SEARCHING_RIDER'
          AND o.status = 'READY_FOR_PICKUP'
        ORDER BY d.updated_at ASC
        FOR UPDATE OF d SKIP LOCKED
        LIMIT 10
      `
    );

    for (const delivery of waiting.rows) {
      await assignRider(client, delivery.order_id, actorUserId);
    }
  });
}

async function writeAudit(
  client: PoolClient,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  description: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO public.audit_logs (
        actor_type, actor_user_id, action, entity_type, entity_id, description
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [actorUserId ? "USER" : "SYSTEM", actorUserId, action, entityType, entityId, description]
  );
}

async function writeOutbox(
  client: PoolClient,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
      INSERT INTO public.outbox_events (
        event_type, aggregate_type, aggregate_id, payload
      )
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [eventType, aggregateType, aggregateId, JSON.stringify(payload)]
  );
}

async function writeOrderHistory(
  client: PoolClient,
  orderId: string,
  previousStatus: string,
  newStatus: string,
  actorUserId: string | null,
  reason: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, reason
      )
      VALUES ($1, $2::order_status, $3::order_status, $4, $5)
    `,
    [orderId, previousStatus, newStatus, actorUserId, reason]
  );
}

async function writeDeliveryHistory(
  client: PoolClient,
  deliveryId: string,
  previousStatus: string | null,
  newStatus: string,
  actorUserId: string | null,
  reason: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO public.delivery_status_history (
        delivery_id, previous_status, new_status, changed_by, reason
      )
      VALUES ($1, $2::delivery_status, $3::delivery_status, $4, $5)
    `,
    [deliveryId, previousStatus, newStatus, actorUserId, reason]
  );
}

async function writeFulfillmentHistory(
  client: PoolClient,
  fulfillmentId: string,
  previousStatus: string | null,
  newStatus: string,
  actorUserId: string | null,
  reason: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO public.fulfillment_status_history (
        fulfillment_id, previous_status, new_status, changed_by, reason
      )
      VALUES ($1, $2::fulfillment_status, $3::fulfillment_status, $4, $5)
    `,
    [fulfillmentId, previousStatus, newStatus, actorUserId, reason]
  );
}

export async function processProviderPayment(
  actorUserId: string,
  paymentId: string,
  input: ProviderPaymentInput
) {
  return withTransaction(async (client) => {
    const ownership = await client.query(
      `
        SELECT pa.id
        FROM public.payment_attempts pa
        INNER JOIN public.payments p ON p.id = pa.payment_id
        WHERE pa.id = $1
          AND p.id = $2
        FOR UPDATE OF pa, p
      `,
      [input.paymentAttemptId, paymentId]
    );

    if (ownership.rows.length === 0) {
      fail("Payment attempt does not belong to this payment.", 409, "PAYMENT_ATTEMPT_MISMATCH");
    }

    const insertedEvent = await client.query<{ id: string; status: string }>(
      `
        INSERT INTO public.payment_provider_events (
          provider, provider_event_id, event_type, payment_attempt_id, payload
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (provider, provider_event_id)
        DO NOTHING
        RETURNING id, status
      `,
      ["test-provider", input.providerEventId, input.status, input.paymentAttemptId, JSON.stringify(input)]
    );

    let eventId: string;
    let eventStatus: string;

    if (insertedEvent.rows.length > 0) {
      eventId = insertedEvent.rows[0].id;
      eventStatus = insertedEvent.rows[0].status;
    } else {
      const existingEvent = await client.query<{
        id: string;
        status: string;
        payment_attempt_id: string | null;
        event_type: string;
        payload: ProviderPaymentInput;
      }>(
        `
          SELECT id, status, payment_attempt_id, event_type, payload
          FROM public.payment_provider_events
          WHERE provider = 'test-provider'
            AND provider_event_id = $1
          FOR UPDATE
        `,
        [input.providerEventId]
      );

      if (existingEvent.rows.length === 0) {
        fail("Payment provider event could not be loaded.", 409, "PAYMENT_EVENT_CONFLICT");
      }

      const event = existingEvent.rows[0];
      if (
        event.payment_attempt_id !== input.paymentAttemptId
        || event.event_type !== input.status
        || event.payload.providerReference !== input.providerReference
        || event.payload.failureReason !== input.failureReason
      ) {
        fail("Provider event ID was reused with different payment data.", 409, "PAYMENT_EVENT_REUSED");
      }

      eventId = event.id;
      eventStatus = event.status;
    }

    if (eventStatus === "PROCESSED") {
      return { status: "already_processed", paymentId };
    }

    const paymentResult = await client.query<{
      payment_id: string;
      payment_status: string;
      order_id: string;
      order_status: string;
      user_id: string;
    }>(
      `
        SELECT
          p.id AS payment_id,
          p.status AS payment_status,
          p.order_id,
          o.status AS order_status,
          o.user_id
        FROM public.payments p
        INNER JOIN public.orders o ON o.id = p.order_id
        WHERE p.id = $1
        FOR UPDATE OF p, o
      `,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      fail("Payment not found.", 404, "PAYMENT_NOT_FOUND");
    }

    const payment = paymentResult.rows[0];

    if (payment.order_status !== "PENDING") {
      fail("Payment cannot change an order in its current state.", 409, "PAYMENT_ORDER_STATE_INVALID");
    }
    const attemptResult = await client.query<{
      id: string;
      status: string;
    }>(
      `
        SELECT id, status
        FROM public.payment_attempts
        WHERE id = $1 AND payment_id = $2
        FOR UPDATE
      `,
      [input.paymentAttemptId, paymentId]
    );

    if (attemptResult.rows.length === 0) {
      fail("Payment attempt does not belong to this payment.", 409, "PAYMENT_ATTEMPT_MISMATCH");
    }

    if (!["INITIATED", "PENDING"].includes(attemptResult.rows[0].status)) {
      fail("Payment attempt is no longer actionable.", 409, "PAYMENT_ATTEMPT_STATE_INVALID");
    }

    if (payment.payment_status === "AUTHORIZED" && input.status === "SUCCESS") {
      await client.query(
        `UPDATE public.payment_provider_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1`,
        [eventId]
      );
      return { status: "already_processed", paymentId };
    }

    if (payment.payment_status !== "PENDING") {
      fail("Payment is no longer pending.", 409, "PAYMENT_STATE_INVALID");
    }

    if (input.status === "FAILED") {
      await client.query(
        `
          UPDATE public.payment_attempts
          SET status = 'FAILED', failure_reason = $1, completed_at = NOW()
          WHERE id = $2
        `,
        [input.failureReason ?? "Provider reported payment failure.", input.paymentAttemptId]
      );
      await client.query(
        `UPDATE public.payments SET status = 'FAILED', updated_at = NOW() WHERE id = $1`,
        [paymentId]
      );
      await client.query(
        `
          INSERT INTO public.payment_status_history (payment_id, previous_status, new_status, changed_by, reason)
          VALUES ($1, 'PENDING', 'FAILED', $2, 'Payment provider reported failure.')
        `,
        [paymentId, actorUserId]
      );
      await client.query(
        `
          INSERT INTO public.payment_attempt_status_history (payment_attempt_id, previous_status, new_status, changed_by, reason)
          VALUES ($1, $2::payment_attempt_status, 'FAILED', $3, $4)
        `,
        [input.paymentAttemptId, attemptResult.rows[0].status, actorUserId, input.failureReason ?? "Payment failed."]
      );
      await releaseReservations(client, payment.order_id, actorUserId, "Payment failed.");
      await client.query(
        `UPDATE public.orders SET status = 'CANCELLED', cancellation_reason = 'SYSTEM_ERROR', cancelled_by = 'SYSTEM', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'PENDING'`,
        [payment.order_id]
      );
      await writeOutbox(client, "PAYMENT_FAILED", "ORDER", payment.order_id, { orderId: payment.order_id });
      await client.query(
        `UPDATE public.payment_provider_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1`,
        [eventId]
      );
      await writeAudit(client, actorUserId, "PAYMENT_FAILED", "PAYMENT", paymentId, "Payment failure processed.");
      return { paymentId, status: "FAILED", orderId: payment.order_id };
    }

    await client.query(
      `
        UPDATE public.payment_attempts
        SET status = 'SUCCESS', provider_reference = COALESCE($1, provider_reference), completed_at = NOW()
        WHERE id = $2
      `,
      [input.providerReference ?? null, input.paymentAttemptId]
    );
    await client.query(
      `UPDATE public.payments SET status = 'AUTHORIZED', provider = 'test-provider', provider_reference = COALESCE($1, provider_reference), updated_at = NOW() WHERE id = $2`,
      [input.providerReference ?? null, paymentId]
    );
    await client.query(
      `
        INSERT INTO public.payment_status_history (payment_id, previous_status, new_status, changed_by, reason)
        VALUES ($1, 'PENDING', 'AUTHORIZED', $2, 'Payment provider reported success.')
      `,
      [paymentId, actorUserId]
    );
    await client.query(
      `
        INSERT INTO public.payment_attempt_status_history (payment_attempt_id, previous_status, new_status, changed_by, reason)
        VALUES ($1, $2::payment_attempt_status, 'SUCCESS', $3, 'Payment provider reported success.')
      `,
      [input.paymentAttemptId, attemptResult.rows[0].status, actorUserId]
    );
    await writeOrderHistory(client, payment.order_id, payment.order_status, "CONFIRMED", actorUserId, "Payment authorized.");
    await client.query(
      `UPDATE public.orders SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1 AND status = 'PENDING'`,
      [payment.order_id]
    );
    const delivery = await createDelivery(client, payment.order_id, actorUserId);
    await client.query(
      `UPDATE public.payment_provider_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1`,
      [eventId]
    );
    await writeOutbox(client, "PAYMENT_SUCCESSFUL", "ORDER", payment.order_id, { orderId: payment.order_id, deliveryId: delivery.id });
    await writeAudit(client, actorUserId, "PAYMENT_SUCCESSFUL", "PAYMENT", paymentId, "Payment authorized and delivery initialized.");
    return { paymentId, status: "AUTHORIZED", orderId: payment.order_id, deliveryId: delivery.id };
  });
}

export async function processSandboxPayment(
  userId: string,
  paymentId: string,
  paymentAttemptId: string,
  cardNumber: string
) {
  if (!env.SANDBOX_PAYMENTS_ENABLED) {
    fail("Sandbox payments are disabled. Configure a live payment provider before accepting real payments.", 503, "SANDBOX_PAYMENT_UNAVAILABLE");
  }

  const normalizedCardNumber = cardNumber.replace(/[\s-]/g, "");
  if (normalizedCardNumber !== "4084084084084081") {
    fail("Use the configured sandbox test card.", 402, "SANDBOX_CARD_DECLINED");
  }

  const { db } = await import("../../db/database");
  const ownership = await db.query<{ id: string }>(
    `
      SELECT p.id
      FROM public.payments p
      INNER JOIN public.orders o ON o.id = p.order_id
      WHERE p.id = $1 AND o.user_id = $2
      LIMIT 1
    `,
    [paymentId, userId]
  );

  if (ownership.rows.length === 0) {
    fail("Payment not found.", 404, "PAYMENT_NOT_FOUND");
  }

  return processProviderPayment(userId, paymentId, {
    providerEventId: `sandbox-${paymentId}`,
    paymentAttemptId,
    status: "SUCCESS",
    providerReference: `sandbox-reference-${paymentId}`
  });
}

async function createDelivery(client: PoolClient, orderId: string, actorUserId: string) {
  const existing = await client.query<{ id: string; status: string }>(
    `SELECT id, status FROM public.deliveries WHERE order_id = $1 FOR UPDATE`,
    [orderId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }
  const result = await client.query<{ id: string; status: string }>(
    `
      INSERT INTO public.deliveries (order_id, status, pickup_location, delivery_location)
      SELECT o.id, 'SEARCHING_RIDER', b.location, o.delivery_location
      FROM public.orders o
      INNER JOIN public.fulfillments f ON f.order_id = o.id
      INNER JOIN public.businesses b ON b.id = f.business_id
      WHERE o.id = $1
      RETURNING id, status
    `,
    [orderId]
  );
  if (result.rows.length === 0) {
    fail("Unable to initialize delivery.", 500, "DELIVERY_INITIALIZATION_FAILED");
  }
  await writeDeliveryHistory(client, result.rows[0].id, null, "SEARCHING_RIDER", actorUserId, "Delivery initialized after payment.");
  return result.rows[0];
}

async function releaseReservations(client: PoolClient, orderId: string, actorUserId: string | null, reason: string) {
  const reservations = await client.query<{ id: string; inventory_id: string; quantity: number }>(
    `SELECT id, inventory_id, quantity FROM public.inventory_reservations WHERE order_id = $1 AND status = 'ACTIVE' FOR UPDATE`,
    [orderId]
  );
  for (const reservation of reservations.rows) {
    const update = await client.query(
      `UPDATE public.inventory SET quantity_reserved = quantity_reserved - $1, updated_at = NOW(), last_updated_at = NOW() WHERE id = $2 AND quantity_reserved >= $1`,
      [reservation.quantity, reservation.inventory_id]
    );
    if (update.rowCount !== 1) {
      fail("Inventory reservation state is invalid.", 409, "INVENTORY_RESERVATION_INVALID");
    }
    await client.query(`UPDATE public.inventory_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = $1`, [reservation.id]);
    await client.query(
      `INSERT INTO public.inventory_reservation_history (reservation_id, previous_status, new_status, quantity, changed_by, reason) VALUES ($1, 'ACTIVE', 'RELEASED', $2, $3, $4)`,
      [reservation.id, reservation.quantity, actorUserId, reason]
    );
  }
}

async function commitReservations(client: PoolClient, orderId: string, actorUserId: string) {
  const reservations = await client.query<{ id: string; inventory_id: string; quantity: number }>(
    `SELECT id, inventory_id, quantity FROM public.inventory_reservations WHERE order_id = $1 AND status = 'ACTIVE' FOR UPDATE`,
    [orderId]
  );
  for (const reservation of reservations.rows) {
    const update = await client.query(
      `UPDATE public.inventory SET quantity_on_hand = quantity_on_hand - $1, quantity_reserved = quantity_reserved - $1, updated_at = NOW(), last_updated_at = NOW() WHERE id = $2 AND quantity_on_hand >= $1 AND quantity_reserved >= $1`,
      [reservation.quantity, reservation.inventory_id]
    );
    if (update.rowCount !== 1) {
      fail("Inventory finalization would produce an invalid quantity.", 409, "INVENTORY_FINALIZATION_INVALID");
    }
    await client.query(`UPDATE public.inventory_reservations SET status = 'COMMITTED', updated_at = NOW() WHERE id = $1`, [reservation.id]);
    await client.query(
      `INSERT INTO public.inventory_reservation_history (reservation_id, previous_status, new_status, quantity, changed_by, reason) VALUES ($1, 'ACTIVE', 'COMMITTED', $2, $3, 'Inventory finalized after delivery confirmation.')`,
      [reservation.id, reservation.quantity, actorUserId]
    );
  }
}

async function loadBusinessOrder(client: PoolClient, orderId: string, userId: string) {
  const result = await client.query<{
    order_id: string;
    order_status: string;
    fulfillment_id: string;
    fulfillment_status: string;
    business_id: string;
  }>(
    `
      SELECT o.id AS order_id, o.status AS order_status, f.id AS fulfillment_id,
             f.status AS fulfillment_status, f.business_id
      FROM public.orders o
      INNER JOIN public.fulfillments f ON f.order_id = o.id
      INNER JOIN public.businesses b ON b.id = f.business_id
      WHERE o.id = $1 AND b.owner_user_id = $2
      FOR UPDATE OF o, f
    `,
    [orderId, userId]
  );
  if (result.rows.length === 0) {
    fail("Order not found for this business.", 404, "ORDER_NOT_FOUND");
  }
  return result.rows[0];
}

export async function listBusinessOrders(userId: string) {
  const result = await (await import("../../db/database")).db.query(
    `
      SELECT o.id AS "orderId", o.status, f.status AS "fulfillmentStatus", o.created_at AS "createdAt"
      FROM public.orders o
      INNER JOIN public.fulfillments f ON f.order_id = o.id
      INNER JOIN public.businesses b ON b.id = f.business_id
      WHERE b.owner_user_id = $1
      ORDER BY o.created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function listRiderDeliveries(userId: string) {
  const result = await (await import("../../db/database")).db.query(
    `
      SELECT d.id,
             d.status,
             d.order_id AS "orderId",
             d.assigned_at AS "assignedAt",
             d.picked_up_at AS "pickedUpAt",
             d.delivered_at AS "deliveredAt",
             dad.status AS "assignmentStatus",
             b.address_line AS "pickupAddressLine",
             b.city AS "pickupCity",
             b.state AS "pickupState",
             o.delivery_address_line AS "deliveryAddressLine",
             o.delivery_city AS "deliveryCity",
             o.delivery_state AS "deliveryState",
             o.delivery_contact_phone AS "deliveryContactPhone",
             o.user_id AS "customerUserId"
      FROM public.deliveries d
      INNER JOIN public.riders r ON r.id = d.rider_id
      INNER JOIN public.orders o ON o.id = d.order_id
      LEFT JOIN public.delivery_assignment_decisions dad ON dad.delivery_id = d.id AND dad.status IN ('PENDING', 'ACCEPTED')
      LEFT JOIN public.fulfillments f ON f.order_id = o.id
      LEFT JOIN public.businesses b ON b.id = f.business_id
      WHERE r.user_id = $1
        AND d.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED')
      ORDER BY d.updated_at DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    assignmentStatus: row.assignmentStatus ?? null,
    pickupAddress: [row.pickupAddressLine, row.pickupCity, row.pickupState].filter(Boolean).join(", "),
    deliveryAddress: [row.deliveryAddressLine, row.deliveryCity, row.deliveryState].filter(Boolean).join(", "),
    deliveryContactPhone: row.deliveryContactPhone,
    assignedAt: row.assignedAt,
    pickedUpAt: row.pickedUpAt,
    deliveredAt: row.deliveredAt,
  }));
}

export async function getRiderDelivery(userId: string, deliveryId: string) {
  const result = await (await import("../../db/database")).db.query(
    `
      SELECT d.id,
             d.status,
             d.order_id AS "orderId",
             d.assigned_at AS "assignedAt",
             d.picked_up_at AS "pickedUpAt",
             d.delivered_at AS "deliveredAt",
             dad.status AS "assignmentStatus",
             b.address_line AS "pickupAddressLine",
             b.city AS "pickupCity",
             b.state AS "pickupState",
             o.delivery_address_line AS "deliveryAddressLine",
             o.delivery_city AS "deliveryCity",
             o.delivery_state AS "deliveryState",
             o.delivery_contact_phone AS "deliveryContactPhone",
             o.user_id AS "customerUserId"
      FROM public.deliveries d
      INNER JOIN public.riders r ON r.id = d.rider_id
      INNER JOIN public.orders o ON o.id = d.order_id
      LEFT JOIN public.delivery_assignment_decisions dad ON dad.delivery_id = d.id AND dad.status IN ('PENDING', 'ACCEPTED')
      LEFT JOIN public.fulfillments f ON f.order_id = o.id
      LEFT JOIN public.businesses b ON b.id = f.business_id
      WHERE r.user_id = $1 AND d.id = $2
    `,
    [userId, deliveryId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Delivery not found for this rider.", 404, "DELIVERY_NOT_FOUND");
  }

  const row = result.rows[0];
  return {
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    assignmentStatus: row.assignmentStatus ?? null,
    pickupAddress: [row.pickupAddressLine, row.pickupCity, row.pickupState].filter(Boolean).join(", "),
    deliveryAddress: [row.deliveryAddressLine, row.deliveryCity, row.deliveryState].filter(Boolean).join(", "),
    deliveryContactPhone: row.deliveryContactPhone,
    assignedAt: row.assignedAt,
    pickedUpAt: row.pickedUpAt,
    deliveredAt: row.deliveredAt,
  };
}

export async function acceptBusinessOrder(userId: string, orderId: string) {
  return withTransaction(async (client) => {
    const order = await loadBusinessOrder(client, orderId, userId);
    if (order.order_status !== "CONFIRMED") {
      fail("Only confirmed orders can be accepted.", 409, "INVALID_ORDER_TRANSITION");
    }
    await client.query(`UPDATE public.orders SET status = 'PREPARING', updated_at = NOW() WHERE id = $1`, [orderId]);
    await writeOrderHistory(client, orderId, "CONFIRMED", "PREPARING", userId, "Business accepted the order.");
    await writeOutbox(client, "ORDER_ACCEPTED", "ORDER", orderId, { orderId });
    await writeAudit(client, userId, "ORDER_ACCEPTED", "ORDER", orderId, "Business accepted the order.");
    return { orderId, status: "PREPARING" };
  });
}

export async function markBusinessReady(userId: string, orderId: string) {
  return withTransaction(async (client) => {
    const order = await loadBusinessOrder(client, orderId, userId);
    if (order.order_status !== "PREPARING") {
      fail("Only preparing orders can be marked ready.", 409, "INVALID_ORDER_TRANSITION");
    }
    await client.query(`UPDATE public.orders SET status = 'READY_FOR_PICKUP', updated_at = NOW() WHERE id = $1`, [orderId]);
    await writeOrderHistory(client, orderId, "PREPARING", "READY_FOR_PICKUP", userId, "Business marked the order ready for pickup.");
    const delivery = await assignRider(client, orderId, userId);
    await writeOutbox(client, "ORDER_READY_FOR_PICKUP", "ORDER", orderId, { orderId, deliveryId: delivery.deliveryId, pickupCredential: delivery.pickupCredential ?? null });
    await writeAudit(client, userId, "ORDER_READY_FOR_PICKUP", "ORDER", orderId, "Business marked the order ready.");
    return { orderId, status: "READY_FOR_PICKUP", delivery };
  });
}

export async function retryRiderAssignment(userId: string, orderId: string) {
  return withTransaction(async (client) => {
    const order = await loadBusinessOrder(client, orderId, userId);
    if (order.order_status !== "READY_FOR_PICKUP") {
      fail("Only orders ready for pickup can retry rider assignment.", 409, "INVALID_ORDER_TRANSITION");
    }
    const delivery = await assignRider(client, orderId, userId);
    await writeOutbox(client, "ORDER_READY_FOR_PICKUP", "ORDER", orderId, { orderId, deliveryId: delivery.deliveryId, pickupCredential: delivery.pickupCredential ?? null });
    return { orderId, status: order.order_status, delivery };
  });
}

async function assignRider(
  client: PoolClient,
  orderId: string,
  actorUserId: string,
  excludedRiderIds: string[] = []
) {
  const deliveryResult = await client.query<{ delivery_id: string; rider_id: string | null; status: string }>(
    `SELECT id AS delivery_id, rider_id, status FROM public.deliveries WHERE order_id = $1 FOR UPDATE`,
    [orderId]
  );
  if (deliveryResult.rows.length === 0) {
    fail("Delivery has not been initialized.", 409, "DELIVERY_NOT_READY");
  }
  const delivery = deliveryResult.rows[0];
  if (delivery.status === "ASSIGNED") {
    const assignmentResult = await client.query<{ rider_id: string; status: string }>(
      `
        SELECT rider_id, status
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [delivery.delivery_id]
    );

    if (assignmentResult.rows.length === 0 && delivery.rider_id) {
      await client.query(
        `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [delivery.delivery_id, delivery.rider_id]
      );
    }
    return { deliveryId: delivery.delivery_id, status: delivery.status };
  }
  const riderResult = await client.query<{ rider_id: string; vehicle_id: string }>(
    `
      SELECT r.id AS rider_id, v.id AS vehicle_id
      FROM public.riders r
      INNER JOIN public.vehicles v ON v.rider_id = r.id AND v.is_active = TRUE
      INNER JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id AND vt.code IN ('MOTORCYCLE', 'KEKE')
      INNER JOIN public.deliveries d ON d.id = $1
      INNER JOIN public.rider_verifications rv ON rv.rider_id = r.id AND rv.status = 'VERIFIED'
      WHERE r.is_active = TRUE
        AND r.is_available = TRUE
        AND r.current_location IS NOT NULL
        AND NOT (r.id = ANY($2::uuid[]))
      ORDER BY ST_Distance(r.current_location, d.pickup_location) ASC, r.id
      FOR UPDATE OF r SKIP LOCKED
      LIMIT 1
    `,
    [delivery.delivery_id, excludedRiderIds]
  );
  if (riderResult.rows.length === 0) {
    return { deliveryId: delivery.delivery_id, status: "SEARCHING_RIDER", pickupCredential: undefined };
  }
  const rider = riderResult.rows[0];
  await client.query(`UPDATE public.riders SET is_available = FALSE, updated_at = NOW() WHERE id = $1`, [rider.rider_id]);
  await client.query(`UPDATE public.deliveries SET rider_id = $1, vehicle_id = $2, status = 'ASSIGNED', assigned_at = NOW(), updated_at = NOW() WHERE id = $3`, [rider.rider_id, rider.vehicle_id, delivery.delivery_id]);
  await client.query(`INSERT INTO public.delivery_assignment_history (delivery_id, rider_id, vehicle_id, action, changed_by, reason) VALUES ($1, $2, $3, 'ASSIGNED', $4, 'Automatic MVP proximity assignment.')`, [delivery.delivery_id, rider.rider_id, rider.vehicle_id, actorUserId]);
  const credential = sixDigitCode() + sixDigitCode();
  const credentialHash = await bcrypt.hash(credential, 12);
  const verification = await client.query<{ id: string }>(
    `INSERT INTO public.pickup_verifications (delivery_id, rider_id, business_id, credential_hash, expires_at) SELECT $1, $2, f.business_id, $3, NOW() + INTERVAL '2 hours' FROM public.fulfillments f WHERE f.order_id = $4 RETURNING id`,
    [delivery.delivery_id, rider.rider_id, credentialHash, orderId]
  );
  await client.query(`INSERT INTO public.pickup_verification_history (pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason) SELECT $1, NULL, 'ACTIVE', $2, business_id, $3, 'Pickup credential issued.' FROM public.pickup_verifications WHERE id = $1`, [verification.rows[0].id, rider.rider_id, actorUserId]);
  await client.query(
    `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id) VALUES ($1, $2)`,
    [delivery.delivery_id, rider.rider_id]
  );
  await writeDeliveryHistory(client, delivery.delivery_id, "SEARCHING_RIDER", "ASSIGNED", actorUserId, "Rider automatically assigned.");
  await writeOutbox(client, "RIDER_ASSIGNED", "DELIVERY", delivery.delivery_id, { deliveryId: delivery.delivery_id, riderId: rider.rider_id, pickupCredential: credential });
  return { deliveryId: delivery.delivery_id, riderId: rider.rider_id, status: "ASSIGNED", pickupCredential: credential };
}

async function loadRiderDelivery(client: PoolClient, deliveryId: string, userId: string) {
  const result = await client.query<{
    delivery_id: string;
    delivery_status: string;
    order_id: string;
    order_status: string;
    rider_id: string;
    rider_user_id: string;
    business_owner_user_id: string | null;
  }>(
    `SELECT d.id AS delivery_id, d.status AS delivery_status, d.order_id, o.status AS order_status, r.id AS rider_id, r.user_id AS rider_user_id, b.owner_user_id AS business_owner_user_id FROM public.deliveries d INNER JOIN public.orders o ON o.id = d.order_id INNER JOIN public.riders r ON r.id = d.rider_id LEFT JOIN public.fulfillments f ON f.order_id = o.id LEFT JOIN public.businesses b ON b.id = f.business_id WHERE d.id = $1 AND r.user_id = $2 FOR UPDATE OF d, o`,
    [deliveryId, userId]
  );
  if (result.rows.length === 0) {
    fail("Delivery not found for this rider.", 404, "DELIVERY_NOT_FOUND");
  }
  return result.rows[0];
}

export async function acceptRiderAssignment(
  userId: string,
  deliveryId: string
) {
  return withTransaction(async (client) => {
    const delivery = await loadRiderDelivery(client, deliveryId, userId);
    if (delivery.delivery_status !== "ASSIGNED") {
      fail("This delivery is no longer awaiting rider acceptance.", 409, "ASSIGNMENT_NOT_PENDING");
    }

    const result = await client.query<{ status: string; expires_at: Date }>(
      `
        SELECT status, expires_at
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1 AND rider_id = $2
        FOR UPDATE
      `,
      [deliveryId, delivery.rider_id]
    );
    if (result.rows.length === 0 || result.rows[0].status !== "PENDING") {
      fail("This delivery assignment is no longer pending.", 409, "ASSIGNMENT_NOT_PENDING");
    }
    if (result.rows[0].expires_at < new Date()) {
      fail("This delivery assignment has expired.", 409, "ASSIGNMENT_EXPIRED");
    }

    await client.query(
      `UPDATE public.delivery_assignment_decisions SET status = 'ACCEPTED', decided_at = NOW(), updated_at = NOW() WHERE delivery_id = $1 AND rider_id = $2`,
      [deliveryId, delivery.rider_id]
    );
    await writeAudit(client, userId, "DELIVERY_ASSIGNMENT_ACCEPTED", "DELIVERY", deliveryId, "Rider accepted the delivery assignment.");
    return { deliveryId, status: "ASSIGNED" };
  });
}

export async function reissuePickupCredential(userId: string, deliveryId: string) {
  return withTransaction(async (client) => {
    const delivery = await loadRiderDelivery(client, deliveryId, userId);
    if (delivery.delivery_status !== "ASSIGNED") {
      fail("A pickup credential can only be reissued before pickup.", 409, "PICKUP_CREDENTIAL_NOT_AVAILABLE");
    }

    const assignment = await client.query<{ status: string }>(
      `SELECT status
       FROM public.delivery_assignment_decisions
       WHERE delivery_id = $1 AND rider_id = $2
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [deliveryId, delivery.rider_id]
    );
    if (assignment.rows.length === 0 || assignment.rows[0].status !== "ACCEPTED") {
      fail("Accept the delivery assignment before requesting a pickup credential.", 409, "ASSIGNMENT_NOT_ACCEPTED");
    }

    const verificationResult = await client.query<{
      id: string;
      status: string;
      rider_id: string;
      business_id: string;
    }>(
      `SELECT id, status, rider_id, business_id
       FROM public.pickup_verifications
       WHERE delivery_id = $1
       FOR UPDATE`,
      [deliveryId]
    );
    if (verificationResult.rows.length === 0) {
      fail("Pickup verification is not available.", 409, "PICKUP_VERIFICATION_NOT_FOUND");
    }

    const verification = verificationResult.rows[0];
    const credential = sixDigitCode() + sixDigitCode();
    const credentialHash = await bcrypt.hash(credential, 12);

    if (verification.status !== "INVALIDATED") {
      await client.query(
        `UPDATE public.pickup_verifications
         SET status = 'INVALIDATED', updated_at = NOW()
         WHERE id = $1`,
        [verification.id]
      );
      await client.query(
        `INSERT INTO public.pickup_verification_history
          (pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason)
         VALUES ($1, $2::pickup_verification_status, 'INVALIDATED', $3, $4, $5, 'Pickup credential reissued to assigned rider.')`,
        [verification.id, verification.status, verification.rider_id, verification.business_id, userId]
      );
    }

    await client.query(
      `UPDATE public.pickup_verifications
       SET credential_hash = $1, status = 'ACTIVE', expires_at = NOW() + INTERVAL '2 hours',
           verified_at = NULL, attempt_count = 0, updated_at = NOW()
       WHERE id = $2`,
      [credentialHash, verification.id]
    );
    await client.query(
      `INSERT INTO public.pickup_verification_history
        (pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason)
       VALUES ($1, 'INVALIDATED', 'ACTIVE', $2, $3, $4, 'Replacement pickup credential issued to assigned rider.')`,
      [verification.id, verification.rider_id, verification.business_id, userId]
    );
    await writeAudit(client, userId, "PICKUP_CREDENTIAL_REISSUED", "DELIVERY", deliveryId, "Pickup credential reissued to the assigned rider.");

    return { deliveryId, credential, expiresInHours: 2 };
  });
}

export async function rejectRiderAssignment(
  userId: string,
  deliveryId: string,
  reason?: string
) {
  return withTransaction(async (client) => {
    const delivery = await loadRiderDelivery(client, deliveryId, userId);
    if (delivery.delivery_status !== "ASSIGNED") {
      fail("This delivery is no longer awaiting rider acceptance.", 409, "ASSIGNMENT_NOT_PENDING");
    }

    const result = await client.query<{ status: string }>(
      `
        SELECT status
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1 AND rider_id = $2
        FOR UPDATE
      `,
      [deliveryId, delivery.rider_id]
    );
    if (result.rows.length === 0 || result.rows[0].status !== "PENDING") {
      fail("This delivery assignment is no longer pending.", 409, "ASSIGNMENT_NOT_PENDING");
    }

    await client.query(
      `UPDATE public.delivery_assignment_decisions SET status = 'REJECTED', reason = $1, decided_at = NOW(), updated_at = NOW() WHERE delivery_id = $2 AND rider_id = $3`,
      [reason ?? null, deliveryId, delivery.rider_id]
    );
    await client.query(
      `UPDATE public.pickup_verifications SET status = 'INVALIDATED', updated_at = NOW() WHERE delivery_id = $1 AND status = 'ACTIVE'`,
      [deliveryId]
    );
    await client.query(
      `UPDATE public.deliveries SET rider_id = NULL, vehicle_id = NULL, status = 'SEARCHING_RIDER', assigned_at = NULL, updated_at = NOW() WHERE id = $1`,
      [deliveryId]
    );
    await client.query(
      `UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`,
      [delivery.rider_id]
    );
    await client.query(
      `INSERT INTO public.delivery_assignment_history (delivery_id, rider_id, vehicle_id, action, changed_by, reason) VALUES ($1, $2, NULL, 'UNASSIGNED', $3, $4)`,
      [deliveryId, delivery.rider_id, userId, reason ?? "Rider rejected the assignment."]
    );
    await writeDeliveryHistory(client, deliveryId, "ASSIGNED", "SEARCHING_RIDER", userId, "Rider rejected the assignment.");
    const reassigned = await assignRider(client, delivery.order_id, userId, [delivery.rider_id]);
    if (reassigned.status === "SEARCHING_RIDER") {
      await writeOutbox(client, "RIDER_REASSIGNMENT_UNAVAILABLE", "DELIVERY", deliveryId, {
        deliveryId,
        orderId: delivery.order_id,
        reason: reason ?? "The assigned rider rejected the delivery and no replacement rider is currently available."
      });
    }
    await writeAudit(client, userId, "DELIVERY_ASSIGNMENT_REJECTED", "DELIVERY", deliveryId, reason ?? "Rider rejected the delivery assignment.");
    return { deliveryId, status: reassigned.status };
  });
}

export async function verifyPickup(userId: string, deliveryId: string, credential: string) {
  return withTransaction(async (client) => {
    const delivery = await loadRiderDelivery(client, deliveryId, userId);
    const assignmentResult = await client.query<{ status: string }>(
      `
        SELECT status
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1 AND rider_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [deliveryId, delivery.rider_id]
    );
    if (assignmentResult.rows.length === 0 || assignmentResult.rows[0].status !== "ACCEPTED") {
      fail("The rider must accept the delivery assignment before pickup.", 409, "ASSIGNMENT_NOT_ACCEPTED");
    }
    const verificationResult = await client.query<{ id: string; credential_hash: string; status: string; expires_at: Date; attempt_count: number; rider_id: string; business_id: string }>(
      `SELECT id, credential_hash, status, expires_at, attempt_count, rider_id, business_id FROM public.pickup_verifications WHERE delivery_id = $1 FOR UPDATE`,
      [deliveryId]
    );
    if (verificationResult.rows.length === 0) {
      fail("Pickup verification is not available.", 409, "PICKUP_VERIFICATION_NOT_FOUND");
    }
    const verification = verificationResult.rows[0];
    if (delivery.delivery_status === "PICKED_UP") {
      return { deliveryId, status: "PICKED_UP" };
    }
    if (
      verification.status !== "ACTIVE"
      || verification.expires_at < new Date()
      || verification.attempt_count >= 5
    ) {
      fail("Pickup verification has expired or is invalid.", 409, "PICKUP_VERIFICATION_INVALID");
    }
    if (!await bcrypt.compare(credential, verification.credential_hash)) {
      const nextAttempts = verification.attempt_count + 1;
      await client.query(`UPDATE public.pickup_verifications SET attempt_count = $1, status = CASE WHEN $1 >= 5 THEN 'INVALIDATED' ELSE status END, updated_at = NOW() WHERE id = $2`, [nextAttempts, verification.id]);
      fail("Invalid pickup credential.", 403, "INVALID_PICKUP_CREDENTIAL");
    }
    await client.query(`UPDATE public.pickup_verifications SET status = 'VERIFIED', verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [verification.id]);
    await client.query(`UPDATE public.deliveries SET status = 'PICKED_UP', picked_up_at = NOW(), updated_at = NOW() WHERE id = $1`, [deliveryId]);
    await client.query(`UPDATE public.orders SET status = 'OUT_FOR_DELIVERY', updated_at = NOW() WHERE id = $1`, [delivery.order_id]);
    await client.query(`INSERT INTO public.pickup_verification_history (pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason) VALUES ($1, 'ACTIVE', 'VERIFIED', $2, $3, $4, 'Assigned rider verified pickup.')`, [verification.id, verification.rider_id, verification.business_id, userId]);
    await writeDeliveryHistory(client, deliveryId, "ASSIGNED", "PICKED_UP", userId, "Pickup verified.");
    await writeOrderHistory(client, delivery.order_id, "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", userId, "Rider collected the order.");
    await writeOutbox(client, "ORDER_PICKED_UP", "DELIVERY", deliveryId, { deliveryId, orderId: delivery.order_id });
    await writeAudit(client, userId, "PICKUP_VERIFIED", "DELIVERY", deliveryId, "Pickup verified for assigned rider.");
    return { deliveryId, status: "PICKED_UP", orderId: delivery.order_id };
  });
}

export async function updateRiderDeliveryStatus(userId: string, deliveryId: string, nextStatus: "IN_TRANSIT" | "ARRIVED") {
  return withTransaction(async (client) => {
    const delivery = await loadRiderDelivery(client, deliveryId, userId);
    const expected = nextStatus === "IN_TRANSIT" ? "PICKED_UP" : "IN_TRANSIT";
    if (delivery.delivery_status !== expected) {
      fail("Invalid delivery state transition.", 409, "INVALID_DELIVERY_TRANSITION");
    }
    await client.query(`UPDATE public.deliveries SET status = $1::delivery_status, updated_at = NOW() WHERE id = $2`, [nextStatus, deliveryId]);
    await writeDeliveryHistory(client, deliveryId, expected, nextStatus, userId, `Rider updated delivery to ${nextStatus}.`);
    await writeOutbox(client, `DELIVERY_${nextStatus}`, "DELIVERY", deliveryId, { deliveryId, orderId: delivery.order_id });
    await writeAudit(client, userId, `DELIVERY_${nextStatus}`, "DELIVERY", deliveryId, `Delivery status changed to ${nextStatus}.`);
    return { deliveryId, status: nextStatus };
  });
}

export async function issueDeliveryOtp(userId: string, deliveryId: string) {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string; order_id: string; status: string }>(
      `SELECT d.id, d.order_id, d.status FROM public.deliveries d INNER JOIN public.orders o ON o.id = d.order_id WHERE d.id = $1 AND o.user_id = $2 FOR UPDATE`,
      [deliveryId, userId]
    );
    if (result.rows.length === 0) {
      fail("Delivery not found for this customer.", 404, "DELIVERY_NOT_FOUND");
    }
    if (!["IN_TRANSIT", "ARRIVED"].includes(result.rows[0].status)) {
      fail("Delivery is not ready for OTP confirmation.", 409, "DELIVERY_NOT_READY");
    }
    const existingOtp = await client.query<{
      is_used: boolean;
      expires_at: Date;
      locked_at: Date | null;
    }>(
      `
        SELECT is_used, expires_at, locked_at
        FROM public.delivery_otps
        WHERE delivery_id = $1
        FOR UPDATE
      `,
      [deliveryId]
    );

    if (existingOtp.rows.length > 0) {
      const storedOtp = existingOtp.rows[0];

      if (storedOtp.locked_at !== null) {
        fail("Delivery OTP is locked.", 409, "DELIVERY_OTP_LOCKED");
      }

      if (!storedOtp.is_used && storedOtp.expires_at >= new Date()) {
        fail("A delivery OTP is already active.", 409, "DELIVERY_OTP_ALREADY_ISSUED");
      }
    }

    const otp = sixDigitCode();
    const hash = await bcrypt.hash(otp, 12);
    await client.query(`DELETE FROM public.delivery_otps WHERE delivery_id = $1`, [deliveryId]);
    await client.query(`INSERT INTO public.delivery_otps (delivery_id, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`, [deliveryId, hash]);
    return { deliveryId, otp, expiresInMinutes: 15 };
  });
}

export async function confirmDelivery(userId: string, deliveryId: string, otp: string) {
  return withTransaction(async (client) => {
    const result = await client.query<{ delivery_id: string; delivery_status: string; order_id: string; order_status: string; rider_id: string | null; rider_user_id: string | null; business_owner_user_id: string | null }>(
      `SELECT d.id AS delivery_id, d.status AS delivery_status, d.order_id, o.status AS order_status, d.rider_id, r.user_id AS rider_user_id, b.owner_user_id AS business_owner_user_id FROM public.deliveries d INNER JOIN public.orders o ON o.id = d.order_id LEFT JOIN public.riders r ON r.id = d.rider_id LEFT JOIN public.fulfillments f ON f.order_id = o.id LEFT JOIN public.businesses b ON b.id = f.business_id WHERE d.id = $1 AND r.user_id = $2 FOR UPDATE OF d, o`,
      [deliveryId, userId]
    );
    if (result.rows.length === 0) {
      fail("Delivery not found for this customer.", 404, "DELIVERY_NOT_FOUND");
    }
    const delivery = result.rows[0];
    if (delivery.delivery_status === "DELIVERED") {
      return { deliveryId, orderId: delivery.order_id, status: "DELIVERED" };
    }
    if (delivery.delivery_status !== "ARRIVED") {
      fail("Delivery has not arrived.", 409, "DELIVERY_NOT_READY");
    }
    const otpResult = await client.query<{
      id: string;
      otp_hash: string;
      expires_at: Date;
      is_used: boolean;
      attempt_count: number;
      locked_at: Date | null;
    }>(`SELECT id, otp_hash, expires_at, is_used, attempt_count, locked_at FROM public.delivery_otps WHERE delivery_id = $1 FOR UPDATE`, [deliveryId]);
    if (otpResult.rows.length === 0) {
      fail("Delivery OTP has not been issued.", 409, "DELIVERY_OTP_NOT_FOUND");
    }
    const storedOtp = otpResult.rows[0];
    if (storedOtp.is_used || storedOtp.expires_at < new Date() || storedOtp.locked_at !== null || storedOtp.attempt_count >= 5) {
      fail("Delivery OTP is expired or already used.", 409, "DELIVERY_OTP_INVALID");
    }
    if (!await bcrypt.compare(otp, storedOtp.otp_hash)) {
      const attempts = storedOtp.attempt_count + 1;
      await client.query(`UPDATE public.delivery_otps SET attempt_count = $1, locked_at = CASE WHEN $1 >= 5 THEN NOW() ELSE locked_at END, last_attempt_at = NOW(), updated_at = NOW() WHERE id = $2`, [attempts, storedOtp.id]);
      fail("Invalid delivery OTP.", 403, "INVALID_DELIVERY_OTP");
    }
    await client.query(`UPDATE public.delivery_otps SET is_used = TRUE, verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [storedOtp.id]);
    await client.query(`UPDATE public.deliveries SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW() WHERE id = $1`, [deliveryId]);
    await client.query(`UPDATE public.orders SET status = 'DELIVERED', updated_at = NOW() WHERE id = $1`, [delivery.order_id]);
    await commitReservations(client, delivery.order_id, userId);
    if (delivery.rider_id) {
      const orderResult = await client.query<{ subtotal_amount: number | string }>(
        `SELECT subtotal_amount FROM public.orders WHERE id = $1`,
        [delivery.order_id]
      );
      const subtotal = Number(orderResult.rows[0]?.subtotal_amount ?? 0);
      const payout = Math.max(250, subtotal * 0.1);
      await creditDeliveryEarnings(
        client,
        deliveryId,
        delivery.order_id,
        delivery.rider_user_id,
        delivery.business_owner_user_id,
        subtotal
      );
      await client.query(
        `INSERT INTO public.rider_wallets (rider_id, current_balance_amount, currency)
         VALUES ($1, 0, 'NGN')
         ON CONFLICT (rider_id) DO NOTHING`,
        [delivery.rider_id]
      );
      await client.query(
        `UPDATE public.rider_wallets SET current_balance_amount = current_balance_amount + $1, updated_at = NOW() WHERE rider_id = $2`,
        [payout, delivery.rider_id]
      );
      await client.query(`UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`, [delivery.rider_id]);
    }
    await writeDeliveryHistory(client, deliveryId, "ARRIVED", "DELIVERED", userId, "Customer confirmed delivery with OTP.");
    await writeOrderHistory(client, delivery.order_id, "OUT_FOR_DELIVERY", "DELIVERED", userId, "Customer confirmed delivery.");
    await writeOutbox(client, "ORDER_DELIVERED", "ORDER", delivery.order_id, { orderId: delivery.order_id, deliveryId });
    await writeAudit(client, userId, "DELIVERY_CONFIRMED", "DELIVERY", deliveryId, "Delivery confirmed by customer OTP.");
    return { deliveryId, orderId: delivery.order_id, status: "DELIVERED" };
  });
}
