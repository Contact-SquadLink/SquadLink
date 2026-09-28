import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";
import { env } from "../../config/env";
import type { ProviderPaymentInput } from "./lifecycle.schemas";
import { creditDeliveryEarnings } from "../earnings/earnings.service";
import { calculateAndRecordOrderSettlement } from "../ledger/ledger.service";
import { notifyFeaturePhoneRiderAssignment } from "../sms/sms.service";
import { createInAppNotification, notifyAdmins } from "../notification/notification.service";

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
    deviceType?: "SMARTPHONE" | "FEATURE_PHONE";
    serviceZoneCode?: string;
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

    const deviceType = input.deviceType === "FEATURE_PHONE" ? "FEATURE_PHONE" : "SMARTPHONE";
    const regPhone = input.phoneNumber?.trim() || user.phone_number || null;

    let serviceZoneId: string | null = null;
    if (input.serviceZoneCode) {
      const zoneRes = await client.query<{ id: string }>(
        `SELECT id FROM public.service_zones WHERE code = $1 LIMIT 1`,
        [input.serviceZoneCode]
      );
      if (zoneRes.rows.length > 0) serviceZoneId = zoneRes.rows[0].id;
    }
    if (!serviceZoneId) {
      const defaultZone = await client.query<{ id: string }>(
        `SELECT id FROM public.service_zones WHERE code = 'GWALLAMEJI_YELWA' LIMIT 1`
      );
      if (defaultZone.rows.length > 0) serviceZoneId = defaultZone.rows[0].id;
    }

    let riderId: string;
    if (riderResult.rows.length > 0) {
      riderId = riderResult.rows[0].id;
      await client.query(
        `UPDATE public.riders
         SET device_type = $1,
             registered_phone_number = COALESCE($2, registered_phone_number),
             service_zone_id = COALESCE($3, service_zone_id),
             updated_at = NOW()
         WHERE id = $4`,
        [deviceType, regPhone, serviceZoneId, riderId]
      );
    } else {
      const createdRider = await client.query<{ id: string }>(
        `INSERT INTO public.riders (user_id, is_active, is_available, current_location, device_type, registered_phone_number, service_zone_id)
         VALUES ($1, FALSE, FALSE, NULL, $2, $3, $4)
         RETURNING id`,
        [userId, deviceType, regPhone, serviceZoneId]
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

    await notifyAdmins({
      type: "RIDER_APPLICATION_SUBMITTED",
      title: "New Rider Registration",
      message: `A new rider (${input.firstName || 'Applicant'} ${input.lastName || ''}) has submitted an application awaiting verification.`,
      eventKeyPrefix: `admin-rider-submitted:${riderId}`,
      client,
    });

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

  // 1. Fetch current rider status and verification
  const checkResult = await db.query<{
    id: string;
    is_active: boolean;
    is_available: boolean;
    verification_status: string | null;
  }>(
    `
      SELECT r.id, r.is_active, r.is_available, rv.status AS verification_status
      FROM public.riders r
      LEFT JOIN public.rider_verifications rv ON rv.rider_id = r.id
      WHERE r.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (checkResult.rows.length === 0) {
    fail("Rider profile not found.", 404, "RIDER_NOT_FOUND");
  }

  const rider = checkResult.rows[0];

  if (!rider.is_active && available) {
    fail("Rider account is deactivated or inactive.", 403, "RIDER_INACTIVE");
  }

  // 2. If attempting to go online, enforce verified status
  if (available && rider.verification_status !== "VERIFIED") {
    fail("Your rider application is currently pending verification. You cannot go online until approved.", 403, "RIDER_NOT_VERIFIED");
  }

  // 3. Update availability (going offline is always permitted for safety)
  const result = await db.query<{ id: string; is_available: boolean }>(
    `
      UPDATE public.riders
      SET is_available = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, is_available
    `,
    [available, rider.id]
  );

  // 4. If going online, trigger waiting deliveries in the background safely
  if (available) {
    try {
      await assignWaitingDeliveries(userId);
    } catch (err) {
      console.error("[ASSIGN WAITING DELIVERIES BACKGROUND ERROR]", err);
    }
  }

  return {
    userId,
    available: Boolean(result.rows[0]?.is_available),
  };
}

export async function setRiderLocation(
  userId: string,
  latitude: number,
  longitude: number
) {
  if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
    fail("Valid latitude and longitude coordinates are required.", 400, "INVALID_COORDINATES");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    fail("Coordinates out of range. Latitude must be between -90 and 90, Longitude between -180 and 180.", 400, "COORDINATES_OUT_OF_RANGE");
  }

  const { db } = await import("../../db/database");

  // Update current location in PostGIS point geography format (lng, lat, 4326)
  const result = await db.query<{ id: string; is_available: boolean }>(
    `
      UPDATE public.riders r
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          updated_at = NOW()
      WHERE r.user_id = $3
        AND r.is_active = TRUE
      RETURNING r.id, r.is_available
    `,
    [longitude, latitude, userId]
  );

  if (result.rows.length === 0) {
    const riderExists = await db.query<{ id: string; is_active: boolean }>(
      `SELECT id, is_active FROM public.riders WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (riderExists.rows.length === 0) {
      fail("Rider profile not found.", 404, "RIDER_NOT_FOUND");
    }

    fail("Rider account is inactive.", 403, "RIDER_INACTIVE");
  }

  // If rider is online and available, attempt waiting deliveries dispatch safely
  if (result.rows[0].is_available) {
    try {
      await assignWaitingDeliveries(userId);
    } catch (err) {
      console.error("[ASSIGN WAITING DELIVERIES BACKGROUND ERROR]", err);
    }
  }

  return { userId, latitude, longitude };
}

async function assignWaitingDeliveries(actorUserId: string): Promise<void> {
  try {
    await withTransaction(async (client) => {
      const waiting = await client.query<{ order_id: string }>(
        `
          SELECT d.order_id
          FROM public.deliveries d
          INNER JOIN public.orders o ON o.id = d.order_id
          WHERE d.status = 'SEARCHING_RIDER'
            AND o.status = 'READY_FOR_PICKUP'
          ORDER BY d.updated_at ASC
          LIMIT 10
          FOR UPDATE OF d SKIP LOCKED
        `
      );

      for (const delivery of waiting.rows) {
        try {
          await assignRider(client, delivery.order_id, actorUserId);
        } catch (assignErr) {
          // Individual delivery assignment failures should not abort other waiting deliveries
        }
      }
    });
  } catch (err) {
    console.error("[ASSIGN WAITING DELIVERIES BACKGROUND ERROR]", err);
  }
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

    // Instant in-app notification for the customer
    await createInAppNotification({
      userId: payment.user_id,
      orderId: payment.order_id,
      type: "ORDER_CONFIRMED",
      title: "Payment Confirmed",
      message: `Your payment for Order #${payment.order_id.slice(0, 8)} was successful. The store has been notified to prepare your items.`,
      eventKey: `payment-captured-customer:${payment.order_id}`,
      client,
    });

    // Instant in-app notification for the fulfilling merchant
    const merchantResult = await client.query<{ owner_user_id: string }>(
      `SELECT b.owner_user_id FROM public.fulfillments f INNER JOIN public.businesses b ON b.id = f.business_id WHERE f.order_id = $1 LIMIT 1`,
      [payment.order_id]
    );
    if (merchantResult.rows[0]?.owner_user_id) {
      await createInAppNotification({
        userId: merchantResult.rows[0].owner_user_id,
        orderId: payment.order_id,
        type: "NEW_ORDER",
        title: "New Paid Order",
        message: `Order #${payment.order_id.slice(0, 8)} has been paid and confirmed. Please prepare the package for rider pickup.`,
        eventKey: `payment-captured-merchant:${payment.order_id}`,
        client,
      });
    }

    // Instant notification for platform administrators
    await notifyAdmins({
      type: "NEW_ORDER",
      title: "New Confirmed Order",
      message: `Order #${payment.order_id.slice(0, 8)} has been confirmed with successful payment.`,
      orderId: payment.order_id,
      eventKeyPrefix: `admin-order-paid:${payment.order_id}`,
      client,
    });

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
            SELECT o.id AS "orderId", o.status, f.status AS "fulfillmentStatus",
              d.status AS "deliveryStatus", (d.rider_id IS NOT NULL) AS "riderAssigned",
              o.created_at AS "createdAt"
      FROM public.orders o
      INNER JOIN public.fulfillments f ON f.order_id = o.id
      INNER JOIN public.businesses b ON b.id = f.business_id
            LEFT JOIN public.deliveries d ON d.order_id = o.id
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
             dad.expires_at AS "assignmentExpiresAt",
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
      LEFT JOIN LATERAL (
        SELECT status, expires_at
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = d.id AND rider_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) dad ON TRUE
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
    assignmentExpiresAt: row.assignmentExpiresAt ?? null,
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
             dad.expires_at AS "assignmentExpiresAt",
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
      LEFT JOIN LATERAL (
        SELECT status, expires_at
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = d.id AND rider_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) dad ON TRUE
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
    assignmentExpiresAt: row.assignmentExpiresAt ?? null,
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
    if (order.order_status === "CONFIRMED" || order.order_status === "PREPARING") {
      await client.query(`UPDATE public.orders SET status = 'READY_FOR_PICKUP', updated_at = NOW() WHERE id = $1`, [orderId]);
      await writeOrderHistory(client, orderId, order.order_status, "READY_FOR_PICKUP", userId, "Business marked order ready for pickup on retry.");
    } else if (order.order_status !== "READY_FOR_PICKUP") {
      fail("Only orders being prepared or ready for pickup can retry rider assignment.", 409, "INVALID_ORDER_TRANSITION");
    }

    // Check delivery state
    const deliveryResult = await client.query<{
      id: string;
      rider_id: string | null;
      vehicle_id: string | null;
      status: string;
    }>(
      `SELECT id, rider_id, vehicle_id, status FROM public.deliveries WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );

    let deliveryId: string;

    if (deliveryResult.rows.length === 0) {
      const initialized = await createDelivery(client, orderId, userId);
      deliveryId = initialized.id;
    } else {
      const existing = deliveryResult.rows[0];
      deliveryId = existing.id;

      // 1. Release previous rider if assigned
      if (existing.rider_id) {
        await client.query(
          `UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`,
          [existing.rider_id]
        );
        await client.query(
          `INSERT INTO public.delivery_assignment_history (
             delivery_id, rider_id, vehicle_id, action, changed_by, reason
           ) VALUES ($1, $2, $3, 'UNASSIGNED', $4, 'Business requested rider re-assignment.')`,
          [existing.id, existing.rider_id, existing.vehicle_id, userId]
        );
      }

      // 2. Expire any existing pending decisions
      await client.query(
        `UPDATE public.delivery_assignment_decisions
         SET status = 'EXPIRED', decided_at = NOW(), updated_at = NOW()
         WHERE delivery_id = $1 AND status = 'PENDING'`,
        [existing.id]
      );

      // 3. Invalidate active pickup verifications
      await client.query(
        `UPDATE public.pickup_verifications
         SET status = 'INVALIDATED', updated_at = NOW()
         WHERE delivery_id = $1 AND status = 'ACTIVE'`,
        [existing.id]
      );

      // 4. Reset delivery to SEARCHING_RIDER
      await client.query(
        `UPDATE public.deliveries
         SET rider_id = NULL, vehicle_id = NULL, status = 'SEARCHING_RIDER', assigned_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [existing.id]
      );

      if (existing.status !== "SEARCHING_RIDER") {
        await writeDeliveryHistory(
          client,
          existing.id,
          existing.status,
          "SEARCHING_RIDER",
          userId,
          "Delivery assignment reset by business for re-dispatch."
        );
      }
    }

    // 5. Write audit logs
    await writeAudit(
      client,
      userId,
      "RETRY_RIDER_ASSIGNMENT",
      "ORDER",
      orderId,
      `Business retried rider assignment for order ${orderId}.`
    );
    await writeAudit(
      client,
      userId,
      "RETRY_RIDER_ASSIGNMENT",
      "DELIVERY",
      deliveryId,
      `Delivery assignment reset and re-dispatch initiated for delivery ${deliveryId}.`
    );

    // 6. Search for available riders in the zone and dispatch
    const delivery = await assignRider(client, orderId, userId, []);

    await writeOutbox(client, "ORDER_READY_FOR_PICKUP", "ORDER", orderId, {
      orderId,
      deliveryId: delivery.deliveryId,
      pickupCredential: delivery.pickupCredential ?? null
    });

    return {
      orderId,
      status: "READY_FOR_PICKUP",
      delivery
    };
  });
}

async function assignRider(
  client: PoolClient,
  orderId: string,
  actorUserId: string,
  excludedRiderIds: string[] = []
) {
  let deliveryResult = await client.query<{ delivery_id: string; rider_id: string | null; status: string }>(
    `SELECT id AS delivery_id, rider_id, status FROM public.deliveries WHERE order_id = $1 FOR UPDATE`,
    [orderId]
  );
  if (deliveryResult.rows.length === 0) {
    const initialized = await createDelivery(client, orderId, actorUserId);
    deliveryResult = {
      rows: [{ delivery_id: initialized.id, rider_id: null, status: initialized.status }]
    } as any;
  }
  const delivery = deliveryResult.rows[0];

  if (delivery.status === "ASSIGNED") {
    const assignmentResult = await client.query<{ id: string; rider_id: string; status: string; expires_at: Date }>(
      `
        SELECT id, rider_id, status, expires_at
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
    const currentDecision = assignmentResult.rows[0];
    if (currentDecision?.status === "PENDING" && currentDecision.expires_at <= new Date()) {
      await client.query(
        `UPDATE public.delivery_assignment_decisions SET status = 'EXPIRED', decided_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [currentDecision.id]
      );
      await client.query(
        `UPDATE public.deliveries SET rider_id = NULL, vehicle_id = NULL, status = 'SEARCHING_RIDER', assigned_at = NULL, updated_at = NOW() WHERE id = $1`,
        [delivery.delivery_id]
      );
      if (delivery.rider_id) {
        await client.query(
          `UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`,
          [delivery.rider_id]
        );
      }
      return assignRider(client, orderId, actorUserId, delivery.rider_id ? [delivery.rider_id] : []);
    }
    return { deliveryId: delivery.delivery_id, riderId: delivery.rider_id ?? undefined, status: delivery.status, isNewAssignment: false };
  }

  // Preemptively expire any lingering pending decisions for this delivery to guarantee no unique constraint conflict
  await client.query(
    `UPDATE public.delivery_assignment_decisions
     SET status = 'EXPIRED', decided_at = NOW(), updated_at = NOW()
     WHERE delivery_id = $1 AND status = 'PENDING'`,
    [delivery.delivery_id]
  );

  const riderResult = await client.query<{
    rider_id: string;
    user_id: string;
    vehicle_id: string;
    device_type: string;
    phone_number: string | null;
  }>(
    `
      SELECT r.id AS rider_id, r.user_id, v.id AS vehicle_id, r.device_type,
             COALESCE(r.registered_phone_number, u.phone_number) AS phone_number
      FROM public.riders r
      INNER JOIN public.users u ON u.id = r.user_id
      LEFT JOIN public.service_zones sz ON sz.id = r.service_zone_id
      INNER JOIN public.vehicles v ON v.rider_id = r.id AND v.is_active = TRUE
      INNER JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id AND vt.code IN ('MOTORCYCLE', 'KEKE')
      INNER JOIN public.deliveries d ON d.id = $1
      LEFT JOIN public.orders o ON o.id = d.order_id
      LEFT JOIN public.fulfillments f ON f.order_id = o.id
      LEFT JOIN public.businesses b ON b.id = f.business_id
      INNER JOIN public.rider_verifications rv ON rv.rider_id = r.id AND rv.status = 'VERIFIED'
      WHERE r.is_active = TRUE
        AND r.is_available = TRUE
        AND ($2::uuid[] IS NULL OR cardinality($2::uuid[]) = 0 OR NOT (r.id = ANY($2::uuid[])))
        AND NOT EXISTS (
          SELECT 1
          FROM public.deliveries active_delivery
          INNER JOIN public.delivery_assignment_decisions active_decision
            ON active_decision.delivery_id = active_delivery.id
           AND active_decision.status IN ('PENDING', 'ACCEPTED')
          WHERE active_delivery.rider_id = r.id
            AND active_delivery.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.delivery_assignment_decisions rejected
          WHERE rejected.delivery_id = d.id
            AND rejected.rider_id = r.id
            AND rejected.status = 'REJECTED'
        )
      ORDER BY
        -- PostGIS Equitable Spatial Dispatch:
        -- Evaluate distance using continuous GPS coordinates if available, or static service zone
        -- center location for button-phone riders, ensuring equitable opportunity rather than exclusion.
        ST_Distance(
          COALESCE(r.current_location, sz.center_location, ST_SetSRID(ST_MakePoint(9.8167, 10.2833), 4326)::geography),
          COALESCE(d.pickup_location, b.location, ST_SetSRID(ST_MakePoint(9.8167, 10.2833), 4326)::geography)
        ) ASC NULLS LAST,
        r.updated_at ASC,
        r.id
      LIMIT 1
      FOR UPDATE OF r SKIP LOCKED
    `,
    [delivery.delivery_id, excludedRiderIds.length ? excludedRiderIds : []]
  );
  if (riderResult.rows.length === 0) {
    return { deliveryId: delivery.delivery_id, status: "SEARCHING_RIDER", pickupCredential: undefined, isNewAssignment: false };
  }
  const rider = riderResult.rows[0];
  await client.query(`UPDATE public.riders SET is_available = FALSE, updated_at = NOW() WHERE id = $1`, [rider.rider_id]);
  await client.query(`UPDATE public.deliveries SET rider_id = $1, vehicle_id = $2, status = 'ASSIGNED', assigned_at = NOW(), updated_at = NOW() WHERE id = $3`, [rider.rider_id, rider.vehicle_id, delivery.delivery_id]);
  await client.query(`INSERT INTO public.delivery_assignment_history (delivery_id, rider_id, vehicle_id, action, changed_by, reason) VALUES ($1, $2, $3, 'ASSIGNED', $4, 'Automatic MVP proximity assignment.')`, [delivery.delivery_id, rider.rider_id, rider.vehicle_id, actorUserId]);
  const credential = sixDigitCode() + sixDigitCode();
  const credentialHash = await bcrypt.hash(credential, 12);
  const verification = await client.query<{ id: string }>(
    `INSERT INTO public.pickup_verifications (
       delivery_id, rider_id, business_id, credential_hash, status, expires_at, verified_at, attempt_count, updated_at
     )
     SELECT $1, $2, f.business_id, $3, 'ACTIVE', NOW() + INTERVAL '2 hours', NULL, 0, NOW()
     FROM public.fulfillments f
     WHERE f.order_id = $4
     ON CONFLICT (delivery_id) DO UPDATE
     SET
       rider_id = EXCLUDED.rider_id,
       business_id = EXCLUDED.business_id,
       credential_hash = EXCLUDED.credential_hash,
       status = 'ACTIVE',
       expires_at = NOW() + INTERVAL '2 hours',
       verified_at = NULL,
       attempt_count = 0,
       updated_at = NOW()
     RETURNING id`,
    [delivery.delivery_id, rider.rider_id, credentialHash, orderId]
  );
  if (verification.rows.length > 0) {
    await client.query(
      `INSERT INTO public.pickup_verification_history (
         pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason
       )
       SELECT $1, NULL, 'ACTIVE', $2, business_id, $3, 'Pickup credential issued.'
       FROM public.pickup_verifications WHERE id = $1`,
      [verification.rows[0].id, rider.rider_id, actorUserId]
    );
  }
  await client.query(
    `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id) VALUES ($1, $2)`,
    [delivery.delivery_id, rider.rider_id]
  );
  await writeDeliveryHistory(client, delivery.delivery_id, delivery.status, "ASSIGNED", actorUserId, "Rider automatically assigned.");
  await writeOutbox(client, "RIDER_ASSIGNED", "DELIVERY", delivery.delivery_id, { deliveryId: delivery.delivery_id, riderId: rider.rider_id, pickupCredential: credential });

  // In-app notification for the newly assigned rider
  if (rider.user_id) {
    await createInAppNotification({
      userId: rider.user_id,
      orderId,
      type: "DELIVERY_ASSIGNMENT",
      title: "New Delivery Assignment",
      message: `You have been assigned to order #${orderId.slice(0, 8)}. Please review and accept the task in your rider dashboard.`,
      eventKey: `rider-assigned:${delivery.delivery_id}:${rider.rider_id}`,
      client,
    });
  }

  // In-app notifications for customer and fulfilling merchant
  const orderStakeholders = await client.query<{
    customer_user_id: string;
    merchant_user_id: string | null;
  }>(
    `SELECT o.user_id AS customer_user_id, b.owner_user_id AS merchant_user_id
     FROM public.orders o
     LEFT JOIN public.fulfillments f ON f.order_id = o.id
     LEFT JOIN public.businesses b ON b.id = f.business_id
     WHERE o.id = $1`,
    [orderId]
  );
  if (orderStakeholders.rows[0]) {
    const { customer_user_id, merchant_user_id } = orderStakeholders.rows[0];
    if (customer_user_id) {
      await createInAppNotification({
        userId: customer_user_id,
        orderId,
        type: "RIDER_ASSIGNED",
        title: "Rider Assigned",
        message: `A rider has been assigned to pick up your order #${orderId.slice(0, 8)}.`,
        eventKey: `customer-rider-assigned:${delivery.delivery_id}:${rider.rider_id}`,
        client,
      });
    }
    if (merchant_user_id) {
      await createInAppNotification({
        userId: merchant_user_id,
        orderId,
        type: "RIDER_ASSIGNED",
        title: "Rider Assigned to Order",
        message: `A delivery rider has been assigned to pick up order #${orderId.slice(0, 8)}.`,
        eventKey: `merchant-rider-assigned:${delivery.delivery_id}:${rider.rider_id}`,
        client,
      });
    }
  }

  // Outbound SMS dispatch notification for button-phone riders upon assignment
  if (rider.device_type === "FEATURE_PHONE" && rider.phone_number) {
    try {
      const details = await client.query<{
        pickup_address: string;
        delivery_address: string;
        delivery_fee_amount: number | string;
      }>(
        `SELECT
           CONCAT_WS(', ', b.address_line, b.city) AS pickup_address,
           CONCAT_WS(', ', o.delivery_address_line, o.delivery_city) AS delivery_address,
           o.delivery_fee_amount
         FROM public.orders o
         INNER JOIN public.fulfillments f ON f.order_id = o.id
         INNER JOIN public.businesses b ON b.id = f.business_id
         WHERE o.id = $1`,
        [orderId]
      );
      const detail = details.rows[0];
      const payout = Math.max(300, Math.round(Number(detail?.delivery_fee_amount ?? 500) * 0.8));
      void notifyFeaturePhoneRiderAssignment({
        riderPhone: rider.phone_number,
        orderId,
        pickupAddress: detail?.pickup_address || "Merchant store",
        deliveryAddress: detail?.delivery_address || "Customer address",
        payout,
      }).catch((err) => console.error("[SMS DISPATCH NOTIFICATION ERROR]", err));
    } catch (err) {
      console.error("[SMS DISPATCH ERROR]", err);
    }
  }

  return { deliveryId: delivery.delivery_id, riderId: rider.rider_id, status: "ASSIGNED", pickupCredential: credential, isNewAssignment: true };
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

    const result = await client.query<{ id: string; status: string; expires_at: Date }>(
      `
        SELECT id, status, expires_at
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1 AND rider_id = $2
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [deliveryId, delivery.rider_id]
    );

    if (result.rows.length > 0 && result.rows[0].status === "ACCEPTED") {
      // Idempotent: rider already accepted this assignment
      return { deliveryId, status: "ASSIGNED", assignmentStatus: "ACCEPTED", alreadyAccepted: true };
    }

    if (result.rows.length === 0 || result.rows[0].status !== "PENDING") {
      fail("This delivery assignment is no longer pending.", 409, "ASSIGNMENT_NOT_PENDING");
    }

    const decision = result.rows[0];

    if (decision.expires_at < new Date()) {
      await client.query(
        `UPDATE public.delivery_assignment_decisions SET status = 'EXPIRED', decided_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [decision.id]
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
      const reassigned = await assignRider(client, delivery.order_id, userId, [delivery.rider_id]);
      if (reassigned.status === "SEARCHING_RIDER") {
        await writeOutbox(client, "RIDER_REASSIGNMENT_UNAVAILABLE", "DELIVERY", deliveryId, {
          deliveryId,
          orderId: delivery.order_id,
          reason: "The rider assignment expired and no replacement rider is currently available."
        });
      }
      fail("This delivery assignment has expired and was reassigned to another rider.", 410, "ASSIGNMENT_EXPIRED");
    }

    await client.query(
      `UPDATE public.delivery_assignment_decisions SET status = 'ACCEPTED', decided_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [decision.id]
    );

    if (delivery.business_owner_user_id) {
      await createInAppNotification({
        userId: delivery.business_owner_user_id,
        orderId: delivery.order_id,
        type: "RIDER_APPROACHING",
        title: "Rider Accepted Delivery",
        message: `The assigned rider has accepted order #${delivery.order_id.slice(0, 8)} and is heading to your store for pickup.`,
        eventKey: `merchant-rider-accepted:${deliveryId}:${decision.id}`,
        client,
      });
    }

    const customerRes = await client.query<{ user_id: string }>(
      `SELECT user_id FROM public.orders WHERE id = $1`,
      [delivery.order_id]
    );
    if (customerRes.rows[0]?.user_id) {
      await createInAppNotification({
        userId: customerRes.rows[0].user_id,
        orderId: delivery.order_id,
        type: "RIDER_APPROACHING",
        title: "Rider Heading to Store",
        message: `Your assigned rider is en route to collect order #${delivery.order_id.slice(0, 8)} from the store.`,
        eventKey: `customer-rider-accepted:${deliveryId}:${decision.id}`,
        client,
      });
    }

    await writeAudit(client, userId, "DELIVERY_ASSIGNMENT_ACCEPTED", "DELIVERY", deliveryId, "Rider accepted the delivery assignment.");
    return { deliveryId, status: "ASSIGNED", assignmentStatus: "ACCEPTED" };
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

export async function reissuePickupCredentialForBusiness(userId: string, orderId: string) {
  return withTransaction(async (client) => {
    const deliveryResult = await client.query<{
      delivery_id: string;
      rider_id: string;
      delivery_status: string;
      pickup_verification_id: string;
      pickup_status: string;
      business_id: string;
    }>(
      `
        SELECT d.id AS delivery_id, d.rider_id, d.status AS delivery_status,
               pv.id AS pickup_verification_id, pv.status AS pickup_status,
               b.id AS business_id
        FROM public.deliveries d
        INNER JOIN public.orders o ON o.id = d.order_id
        INNER JOIN public.fulfillments f ON f.order_id = o.id
        INNER JOIN public.businesses b ON b.id = f.business_id
        INNER JOIN public.pickup_verifications pv ON pv.delivery_id = d.id
        WHERE d.order_id = $1 AND b.owner_user_id = $2
        FOR UPDATE OF d, pv
      `,
      [orderId, userId]
    );
    if (deliveryResult.rows.length === 0) {
      fail("Delivery not found for this business.", 404, "DELIVERY_NOT_FOUND");
    }
    const delivery = deliveryResult.rows[0];
    if (delivery.delivery_status !== "ASSIGNED") {
      fail("A pickup credential can only be reissued before pickup.", 409, "PICKUP_CREDENTIAL_NOT_AVAILABLE");
    }

    const assignment = await client.query<{ status: string }>(
      `SELECT status FROM public.delivery_assignment_decisions WHERE delivery_id = $1 AND rider_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [delivery.delivery_id, delivery.rider_id]
    );
    if (assignment.rows.length === 0 || assignment.rows[0].status !== "ACCEPTED") {
      fail("The rider must accept the assignment before a pickup credential can be reissued.", 409, "ASSIGNMENT_NOT_ACCEPTED");
    }

    const credential = sixDigitCode() + sixDigitCode();
    const credentialHash = await bcrypt.hash(credential, 12);
    await client.query(
      `UPDATE public.pickup_verifications SET credential_hash = $1, status = 'ACTIVE', expires_at = NOW() + INTERVAL '2 hours', verified_at = NULL, attempt_count = 0, updated_at = NOW() WHERE id = $2`,
      [credentialHash, delivery.pickup_verification_id]
    );
    await client.query(
      `INSERT INTO public.pickup_verification_history (pickup_verification_id, previous_status, new_status, rider_id, business_id, changed_by, reason) VALUES ($1, $2::pickup_verification_status, 'ACTIVE', $3, $4, $5, 'Replacement pickup credential issued by business.')`,
      [delivery.pickup_verification_id, delivery.pickup_status, delivery.rider_id, delivery.business_id, userId]
    );
    await writeAudit(client, userId, "PICKUP_CREDENTIAL_REISSUED", "DELIVERY", delivery.delivery_id, "Pickup credential reissued by the business.");
    return { deliveryId: delivery.delivery_id, credential, expiresInHours: 2 };
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

    const result = await client.query<{ id: string; status: string }>(
      `
        SELECT id, status
        FROM public.delivery_assignment_decisions
        WHERE delivery_id = $1 AND rider_id = $2
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [deliveryId, delivery.rider_id]
    );

    if (result.rows.length > 0 && result.rows[0].status === "REJECTED") {
      return { deliveryId, status: delivery.delivery_status, assignmentStatus: "REJECTED", alreadyRejected: true };
    }

    if (result.rows.length > 0 && result.rows[0].status === "ACCEPTED") {
      fail("You have already accepted this delivery assignment.", 409, "ASSIGNMENT_ALREADY_ACCEPTED");
    }

    if (result.rows.length === 0 || result.rows[0].status !== "PENDING") {
      fail("This delivery assignment is no longer pending.", 409, "ASSIGNMENT_NOT_PENDING");
    }

    const decision = result.rows[0];

    await client.query(
      `UPDATE public.delivery_assignment_decisions SET status = 'REJECTED', reason = $1, decided_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [reason ?? null, decision.id]
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
      const riderPool = await client.query<{ total_riders: string; rejected_riders: string }>(
        `
          SELECT
            COUNT(*)::text AS total_riders,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1
                FROM public.delivery_assignment_decisions rejected
                WHERE rejected.delivery_id = $1
                  AND rejected.rider_id = r.id
                  AND rejected.status = 'REJECTED'
              )
            )::text AS rejected_riders
          FROM public.riders r
          INNER JOIN public.rider_verifications rv
            ON rv.rider_id = r.id
           AND rv.status = 'VERIFIED'
          WHERE r.is_active = TRUE
            AND EXISTS (
              SELECT 1
              FROM public.vehicles v
              INNER JOIN public.vehicle_types vt
                ON vt.id = v.vehicle_type_id
               AND vt.code IN ('MOTORCYCLE', 'KEKE')
              WHERE v.rider_id = r.id
                AND v.is_active = TRUE
            )
        `,
        [deliveryId]
      );
      const totalRiders = Number(riderPool.rows[0]?.total_riders ?? 0);
      const rejectedRiders = Number(riderPool.rows[0]?.rejected_riders ?? 0);

      if (totalRiders > 0 && rejectedRiders >= totalRiders) {
        await releaseReservations(
          client,
          delivery.order_id,
          userId,
          "All currently verified riders rejected the delivery."
        );
        await client.query(
          `UPDATE public.deliveries SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
          [deliveryId]
        );
        await client.query(
          `UPDATE public.orders
           SET status = 'CANCELLED',
               cancellation_reason = 'NO_RIDER_AVAILABLE',
               cancelled_by = 'SYSTEM',
               cancelled_at = NOW(),
               updated_at = NOW()
           WHERE id = $1 AND status = 'READY_FOR_PICKUP'`,
          [delivery.order_id]
        );
        const fulfillment = await client.query<{ id: string; status: string }>(
          `SELECT id, status FROM public.fulfillments WHERE order_id = $1 FOR UPDATE`,
          [delivery.order_id]
        );
        if (fulfillment.rows.length > 0 && fulfillment.rows[0].status !== "FAILED") {
          await client.query(
            `UPDATE public.fulfillments SET status = 'FAILED', failed_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [fulfillment.rows[0].id]
          );
          await writeFulfillmentHistory(client, fulfillment.rows[0].id, fulfillment.rows[0].status, "FAILED", userId, "All currently verified riders rejected the delivery.");
        }
        await writeDeliveryHistory(client, deliveryId, "SEARCHING_RIDER", "CANCELLED", userId, "All currently verified riders rejected the delivery.");
        await writeOrderHistory(client, delivery.order_id, "READY_FOR_PICKUP", "CANCELLED", userId, "Order cancelled because all currently verified riders rejected the delivery.");
        await writeOutbox(client, "ORDER_CANCELLED", "ORDER", delivery.order_id, {
          orderId: delivery.order_id,
          reason: "Your order was cancelled because all currently verified riders rejected the delivery."
        });
      } else {
        await writeOutbox(client, "RIDER_REASSIGNMENT_UNAVAILABLE", "DELIVERY", deliveryId, {
          deliveryId,
          orderId: delivery.order_id,
          reason: reason ?? "No replacement rider is currently available."
        });
      }
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

    // In-app notifications for customer and merchant
    const customerOrderInfo = await client.query<{ user_id: string }>(
      `SELECT user_id FROM public.orders WHERE id = $1`,
      [delivery.order_id]
    );
    if (customerOrderInfo.rows[0]?.user_id) {
      await createInAppNotification({
        userId: customerOrderInfo.rows[0].user_id,
        orderId: delivery.order_id,
        type: "ORDER_IN_TRANSIT",
        title: "Order Picked Up",
        message: `Your order #${delivery.order_id.slice(0, 8)} has been picked up from the merchant and is on the way!`,
        eventKey: `customer-pickedup:${deliveryId}`,
        client,
      });
    }
    if (delivery.business_owner_user_id) {
      await createInAppNotification({
        userId: delivery.business_owner_user_id,
        orderId: delivery.order_id,
        type: "ORDER_PICKED_UP",
        title: "Order Picked Up by Rider",
        message: `Order #${delivery.order_id.slice(0, 8)} was collected by the rider with valid pickup credential.`,
        eventKey: `merchant-pickedup:${deliveryId}`,
        client,
      });
    }

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

    if (nextStatus === "ARRIVED") {
      const customerOrderInfo = await client.query<{ user_id: string }>(
        `SELECT user_id FROM public.orders WHERE id = $1`,
        [delivery.order_id]
      );
      if (customerOrderInfo.rows[0]?.user_id) {
        await createInAppNotification({
          userId: customerOrderInfo.rows[0].user_id,
          orderId: delivery.order_id,
          type: "RIDER_ARRIVED",
          title: "Rider Has Arrived",
          message: `Your rider has arrived at your location with order #${delivery.order_id.slice(0, 8)}. Please generate your confirmation code in order details.`,
          eventKey: `customer-arrived:${deliveryId}`,
          client,
        });
      }
    }

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
    const result = await client.query<{
      delivery_id: string;
      delivery_status: string;
      order_id: string;
      order_status: string;
      rider_id: string | null;
      rider_user_id: string | null;
      business_id: string | null;
      business_owner_user_id: string | null;
    }>(
      `SELECT d.id AS delivery_id, d.status AS delivery_status, d.order_id, o.status AS order_status,
              d.rider_id, r.user_id AS rider_user_id, b.id AS business_id, b.owner_user_id AS business_owner_user_id
       FROM public.deliveries d
       INNER JOIN public.orders o ON o.id = d.order_id
       LEFT JOIN public.riders r ON r.id = d.rider_id
       LEFT JOIN public.fulfillments f ON f.order_id = o.id
       LEFT JOIN public.businesses b ON b.id = f.business_id
       WHERE d.id = $1 AND r.user_id = $2 FOR UPDATE OF d, o`,
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

    // Double-Entry Financial Ledger & Unit Economics Engine:
    // Calculates GMV, Customer Platform Fee (₦100–₦150 pilot targets), dynamic merchant commissions,
    // gateway transaction costs (1.5%), and Net Platform Contribution per Order:
    // Contribution = (Customer Fee + Merchant Commission + Delivery Fee) - (Rider Payout + Gateway Fee)
    // Automatically splits and credits verified earnings to recipient wallets while retaining platform contribution margin.
    await calculateAndRecordOrderSettlement(client, {
      orderId: delivery.order_id,
      deliveryId,
      riderId: delivery.rider_id,
      riderUserId: delivery.rider_user_id,
      businessId: delivery.business_id,
      businessOwnerUserId: delivery.business_owner_user_id,
    });

    if (delivery.rider_id) {
      await client.query(`UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`, [delivery.rider_id]);
    }

    // In-app notifications to all parties
    const customerOrderInfo = await client.query<{ user_id: string }>(
      `SELECT user_id FROM public.orders WHERE id = $1`,
      [delivery.order_id]
    );
    if (customerOrderInfo.rows[0]?.user_id) {
      await createInAppNotification({
        userId: customerOrderInfo.rows[0].user_id,
        orderId: delivery.order_id,
        type: "ORDER_DELIVERED",
        title: "Order Delivered Successfully",
        message: `Your order #${delivery.order_id.slice(0, 8)} has been delivered. Enjoy your purchase!`,
        eventKey: `customer-delivered:${delivery.order_id}`,
        client,
      });
    }
    if (delivery.rider_user_id) {
      await createInAppNotification({
        userId: delivery.rider_user_id,
        orderId: delivery.order_id,
        type: "ORDER_DELIVERED",
        title: "Delivery Completed",
        message: `Delivery for Order #${delivery.order_id.slice(0, 8)} is confirmed. Your earnings have been credited to your wallet.`,
        eventKey: `rider-delivered:${delivery.order_id}`,
        client,
      });
    }
    if (delivery.business_owner_user_id) {
      await createInAppNotification({
        userId: delivery.business_owner_user_id,
        orderId: delivery.order_id,
        type: "ORDER_DELIVERED",
        title: "Order Fulfillment Complete",
        message: `Order #${delivery.order_id.slice(0, 8)} was delivered and customer confirmed with OTP. Funds settled to your wallet.`,
        eventKey: `merchant-delivered:${delivery.order_id}`,
        client,
      });
    }
    await notifyAdmins({
      type: "ORDER_DELIVERED",
      title: "Order Delivered & Settled",
      message: `Order #${delivery.order_id.slice(0, 8)} completed delivery and double-entry settlement was recorded.`,
      orderId: delivery.order_id,
      eventKeyPrefix: `admin-delivered:${delivery.order_id}`,
      client,
    });

    await writeDeliveryHistory(client, deliveryId, "ARRIVED", "DELIVERED", userId, "Customer confirmed delivery with OTP.");
    await writeOrderHistory(client, delivery.order_id, "OUT_FOR_DELIVERY", "DELIVERED", userId, "Customer confirmed delivery.");
    await writeOutbox(client, "ORDER_DELIVERED", "ORDER", delivery.order_id, { orderId: delivery.order_id, deliveryId });
    await writeAudit(client, userId, "DELIVERY_CONFIRMED", "DELIVERY", deliveryId, "Delivery confirmed by customer OTP.");
    return { deliveryId, orderId: delivery.order_id, status: "DELIVERED" };
  });
}

/**
 * Super Admin Absolute Intervention & Override Authority
 * Allows force-transitioning orders across any of the 9 lifecycle stages with immutable audit logs
 */
export async function superAdminForceTransitionOrder(
  actorUserId: string,
  orderId: string,
  targetStage:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "ASSIGNED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "ARRIVED"
    | "DELIVERED"
    | "CANCELLED",
  reason: string
) {
  return withTransaction(async (client) => {
    const orderResult = await client.query<{
      id: string;
      status: string;
      subtotal_amount: number | string;
      delivery_fee_amount: number | string;
      total_amount: number | string;
    }>(
      `SELECT id, status, subtotal_amount, delivery_fee_amount, total_amount FROM public.orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      fail("Order not found.", 404, "ORDER_NOT_FOUND");
    }

    const order = orderResult.rows[0];
    const previousOrderStatus = order.status;

    let newOrderStatus: string;
    if (["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(targetStage)) {
      newOrderStatus = targetStage;
    } else if (["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"].includes(targetStage)) {
      newOrderStatus = "OUT_FOR_DELIVERY";
    } else if (targetStage === "DELIVERED") {
      newOrderStatus = "DELIVERED";
    } else {
      newOrderStatus = "CANCELLED";
    }

    await client.query(
      `UPDATE public.orders SET status = $1::public.order_status, updated_at = NOW() WHERE id = $2`,
      [newOrderStatus, orderId]
    );

    await writeOrderHistory(
      client,
      orderId,
      previousOrderStatus,
      newOrderStatus,
      actorUserId,
      `Super Admin forced transition to ${targetStage}: ${reason}`
    );

    const deliveryResult = await client.query<{
      id: string;
      status: string;
      rider_id: string | null;
    }>(
      `SELECT id, status, rider_id FROM public.deliveries WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );

    let deliveryId: string;
    let previousDeliveryStatus: string | null = null;
    let riderId: string | null = null;

    if (deliveryResult.rows.length > 0) {
      deliveryId = deliveryResult.rows[0].id;
      previousDeliveryStatus = deliveryResult.rows[0].status;
      riderId = deliveryResult.rows[0].rider_id;
    } else {
      const createdDelivery = await createDelivery(client, orderId, actorUserId);
      deliveryId = createdDelivery.id;
      previousDeliveryStatus = "SEARCHING_RIDER";
    }

    let newDeliveryStatus: string;
    if (targetStage === "PENDING" || targetStage === "CONFIRMED" || targetStage === "PREPARING" || targetStage === "READY_FOR_PICKUP") {
      newDeliveryStatus = "SEARCHING_RIDER";
    } else if (targetStage === "ASSIGNED") {
      newDeliveryStatus = "ASSIGNED";
    } else if (targetStage === "PICKED_UP") {
      newDeliveryStatus = "PICKED_UP";
    } else if (targetStage === "IN_TRANSIT") {
      newDeliveryStatus = "IN_TRANSIT";
    } else if (targetStage === "ARRIVED") {
      newDeliveryStatus = "ARRIVED";
    } else if (targetStage === "DELIVERED") {
      newDeliveryStatus = "DELIVERED";
    } else {
      newDeliveryStatus = "CANCELLED";
    }

    await client.query(
      `UPDATE public.deliveries
       SET status = $1::public.delivery_status,
           picked_up_at = CASE WHEN $1 IN ('PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED') AND picked_up_at IS NULL THEN NOW() ELSE picked_up_at END,
           delivered_at = CASE WHEN $1 = 'DELIVERED' THEN NOW() ELSE delivered_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [newDeliveryStatus, deliveryId]
    );

    await writeDeliveryHistory(
      client,
      deliveryId,
      previousDeliveryStatus,
      newDeliveryStatus,
      actorUserId,
      `Super Admin forced transition to ${targetStage}: ${reason}`
    );

    if (targetStage === "DELIVERED") {
      await commitReservations(client, orderId, actorUserId);

      const contextRes = await client.query<{
        rider_user_id: string | null;
        business_id: string | null;
        business_owner_user_id: string | null;
      }>(
        `SELECT r.user_id AS rider_user_id, b.id AS business_id, b.owner_user_id AS business_owner_user_id
         FROM public.deliveries d
         LEFT JOIN public.riders r ON r.id = d.rider_id
         LEFT JOIN public.fulfillments f ON f.order_id = d.order_id
         LEFT JOIN public.businesses b ON b.id = f.business_id
         WHERE d.id = $1`,
        [deliveryId]
      );
      const ctx = contextRes.rows[0];

      await calculateAndRecordOrderSettlement(client, {
        orderId,
        deliveryId,
        riderId,
        riderUserId: ctx?.rider_user_id ?? null,
        businessId: ctx?.business_id ?? null,
        businessOwnerUserId: ctx?.business_owner_user_id ?? null,
      });

      if (riderId) {
        await client.query(`UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`, [riderId]);
      }
    } else if (targetStage === "CANCELLED") {
      await releaseReservations(client, orderId, actorUserId, `Super Admin cancellation: ${reason}`);
      if (riderId) {
        await client.query(`UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE id = $1`, [riderId]);
      }
    }

    await writeAudit(
      client,
      actorUserId,
      "SUPER_ADMIN_FORCE_TRANSITION",
      "ORDER",
      orderId,
      `Order force-transitioned from ${previousOrderStatus} to ${targetStage}. Reason: ${reason}`
    );

    return {
      orderId,
      deliveryId,
      targetStage,
      previousOrderStatus,
      newOrderStatus,
      newDeliveryStatus,
      reason,
      transitionedAt: new Date().toISOString(),
    };
  });
}
