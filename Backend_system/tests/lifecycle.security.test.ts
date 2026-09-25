import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

const ORDER_ID = "1f43ac8a-11ce-465a-ab80-4a497b0a59e2";
const PAYMENT_ID = "76ff883c-4600-4f67-a448-ceb7eac2d811";
const PAYMENT_ATTEMPT_ID = "a9b7e7db-7aca-46d4-8ee3-4525bcdfb673";
const DELIVERY_ID = "fb0da105-05b2-4c71-b6fd-9c7b6922d6a9";
const CUSTOMER_ID = "a0621d6d-b0ad-4e57-896f-0413f8caaae0";
const OTHER_CUSTOMER_ID = "4baf9433-804c-4281-891d-a988669762f9";
const ADMIN_ID = "a63e03f7-b69b-421e-93e0-a14789e223d2";
const BUSINESS_USER_ID = "9f9f2a3e-aa42-4a8d-97b3-c0ab173c2fcc";
const RIDER_USER_ID = "c56220a0-251d-4f16-a217-6c9a647237cb";

let app: Awaited<ReturnType<typeof buildApp>>;

function token(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET);
}

function auth(userId: string, role: string) {
  return {
    authorization: `Bearer ${token(userId, role)}`
  };
}

before(async () => {
  await db.query(
    `UPDATE public.users
     SET role = 'ADMIN', is_active = TRUE, admin_approved = TRUE, updated_at = NOW()
     WHERE id = $1`,
    [ADMIN_ID]
  );
  await db.query(
    `INSERT INTO public.rider_verifications (rider_id, status, verified_at)
     SELECT r.id, 'VERIFIED', NOW()
     FROM public.riders r
     WHERE r.user_id = $1
     ON CONFLICT (rider_id) DO UPDATE
       SET status = 'VERIFIED', verified_at = COALESCE(public.rider_verifications.verified_at, NOW()), updated_at = NOW()`,
    [RIDER_USER_ID]
  );
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("lifecycle authorization and replay protection", () => {
  it("reads the customer's order list and rider delivery list from the backend", async () => {
    const customerOrders = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
      headers: auth(CUSTOMER_ID, "CUSTOMER")
    });

    assert.equal(customerOrders.statusCode, 200);
    assert.ok(Array.isArray(customerOrders.json().data));

    const riderDeliveries = await app.inject({
      method: "GET",
      url: "/api/v1/rider/deliveries",
      headers: auth(RIDER_USER_ID, "RIDER")
    });

    assert.equal(riderDeliveries.statusCode, 200);
    assert.ok(Array.isArray(riderDeliveries.json().data));
  });

  it("rejects a customer attempting a business action", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/business/orders/${ORDER_ID}/accept`,
      headers: auth(CUSTOMER_ID, "CUSTOMER")
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "FORBIDDEN");
  });

  it("rejects a rider attempting a payment provider event", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${PAYMENT_ID}/provider-event`,
      headers: auth(RIDER_USER_ID, "RIDER"),
      payload: {
        providerEventId: "security-test-rider-event",
        paymentAttemptId: PAYMENT_ATTEMPT_ID,
        status: "SUCCESS"
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "FORBIDDEN");
  });

  it("prevents another customer from requesting the delivery OTP", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/deliveries/${DELIVERY_ID}/otp`,
      headers: auth(OTHER_CUSTOMER_ID, "CUSTOMER")
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "DELIVERY_NOT_FOUND");
  });

  it("rejects a provider event ID reused with different payment data", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${PAYMENT_ID}/provider-event`,
      headers: auth(ADMIN_ID, "ADMIN"),
      payload: {
        providerEventId: "manual-test-success-20260911-1",
          paymentAttemptId: PAYMENT_ATTEMPT_ID,
          status: "SUCCESS",
          providerReference: "different-reference"
      }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "PAYMENT_EVENT_REUSED");
  });

  it("rejects a payment event with an unrelated payment attempt", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${PAYMENT_ID}/provider-event`,
      headers: auth(ADMIN_ID, "ADMIN"),
      payload: {
        providerEventId: "security-test-wrong-attempt",
        paymentAttemptId: "00000000-0000-4000-8000-000000000001",
        status: "SUCCESS"
      }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "PAYMENT_ATTEMPT_MISMATCH");
  });

  it("normalizes malformed JSON into a validation error", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/deliveries/${DELIVERY_ID}/confirm`,
      headers: {
        ...auth(CUSTOMER_ID, "CUSTOMER"),
        "content-type": "application/json"
      },
      payload: "{bad json}"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
    assert.doesNotMatch(response.body, /stack|SELECT|password_hash|otp_hash/i);
  });

  it("replays an already processed provider event without changing state", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/payments/${PAYMENT_ID}/provider-event`,
      headers: auth(ADMIN_ID, "ADMIN"),
      payload: {
        providerEventId: "manual-test-success-20260911-1",
        paymentAttemptId: PAYMENT_ATTEMPT_ID,
        status: "SUCCESS",
        providerReference: "manual-test-reference-1"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.status, "already_processed");
  });

  it("rejects invalid post-delivery state transitions", async () => {
    const businessResponse = await app.inject({
      method: "POST",
      url: `/api/v1/business/orders/${ORDER_ID}/ready`,
      headers: auth(BUSINESS_USER_ID, "BUSINESS_USER")
    });
    const riderResponse = await app.inject({
      method: "POST",
      url: `/api/v1/deliveries/${DELIVERY_ID}/in-transit`,
      headers: auth(RIDER_USER_ID, "RIDER")
    });

    assert.equal(businessResponse.statusCode, 409);
    assert.equal(businessResponse.json().error.code, "INVALID_ORDER_TRANSITION");
    assert.equal(riderResponse.statusCode, 409);
    assert.equal(riderResponse.json().error.code, "INVALID_DELIVERY_TRANSITION");
  });

  it("makes delivery confirmation replay-safe", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/deliveries/${DELIVERY_ID}/confirm`,
      headers: auth(RIDER_USER_ID, "RIDER"),
      payload: { otp: "000000" }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.status, "DELIVERED");
  });
});

describe("lifecycle database invariants", () => {
  it("keeps the completed order and inventory reservation consistent", async () => {
    const result = await db.query<{
      order_status: string;
      payment_status: string;
      delivery_status: string;
      reservation_status: string;
      quantity_on_hand: number;
      quantity_reserved: number;
    }>(
      `
        SELECT
          o.status AS order_status,
          p.status AS payment_status,
          d.status AS delivery_status,
          ir.status AS reservation_status,
          i.quantity_on_hand,
          i.quantity_reserved
        FROM public.orders o
        INNER JOIN public.payments p ON p.order_id = o.id
        INNER JOIN public.deliveries d ON d.order_id = o.id
        INNER JOIN public.inventory_reservations ir ON ir.order_id = o.id
        INNER JOIN public.inventory i ON i.id = ir.inventory_id
        WHERE o.id = $1
      `,
      [ORDER_ID]
    );

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].order_status, "DELIVERED");
    assert.equal(result.rows[0].payment_status, "AUTHORIZED");
    assert.equal(result.rows[0].delivery_status, "DELIVERED");
    assert.equal(result.rows[0].reservation_status, "COMMITTED");
    assert.equal(result.rows[0].quantity_reserved, 0);
    assert.ok(result.rows[0].quantity_on_hand >= 0);
  });

  it("stores a used OTP as a hash-backed record", async () => {
    const result = await db.query<{
      otp_hash: string;
      is_used: boolean;
      verified_at: Date | null;
    }>(
      `
        SELECT otp_hash, is_used, verified_at
        FROM public.delivery_otps
        WHERE delivery_id = $1
      `,
      [DELIVERY_ID]
    );

    assert.equal(result.rows.length, 1);
    assert.match(result.rows[0].otp_hash, /^\$2[aby]\$/);
    assert.equal(result.rows[0].is_used, true);
    assert.ok(result.rows[0].verified_at);
  });
});

describe("rider allocation concurrency", () => {
  it("assigns one available rider to at most one concurrent delivery", async () => {
    await db.query(
      `UPDATE public.deliveries
       SET rider_id = NULL, vehicle_id = NULL, status = 'SEARCHING_RIDER', assigned_at = NULL, updated_at = NOW()
       WHERE rider_id = (SELECT id FROM public.riders WHERE user_id = $1)
         AND status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED')`,
      [RIDER_USER_ID]
    );
    await db.query(
      `UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE user_id = $1`,
      [RIDER_USER_ID]
    );

    const temporaryOrders: Array<{
      orderId: string;
      deliveryId: string;
    }> = [];

    try {
      for (let index = 0; index < 2; index += 1) {
        const orderResult = await db.query<{ id: string }>(
          `
            INSERT INTO public.orders (
              user_id, status, delivery_address_line, delivery_city,
              delivery_state, delivery_location, subtotal_amount,
              delivery_fee_amount, total_amount, currency
            )
            VALUES (
              $1, 'PREPARING', $2, 'Test City', 'Test State',
              ST_SetSRID(ST_MakePoint(9.8442, 10.3158), 4326)::geography,
              1, 0, 1, 'NGN'
            )
            RETURNING id
          `,
          [CUSTOMER_ID, `Concurrency test ${randomUUID()}`]
        );
        const orderId = orderResult.rows[0].id;

        const fulfillmentResult = await db.query<{ id: string }>(
          `
            INSERT INTO public.fulfillments (order_id, business_id, status)
            VALUES ($1, 'e09e029d-811a-4aa8-9920-c1393cd38cff', 'CONFIRMED')
            RETURNING id
          `,
          [orderId]
        );

        const deliveryResult = await db.query<{ id: string }>(
          `
            INSERT INTO public.deliveries (
              order_id, status, pickup_location, delivery_location
            )
            VALUES (
              $1, 'SEARCHING_RIDER',
              ST_SetSRID(ST_MakePoint(9.8442, 10.3158), 4326)::geography,
              ST_SetSRID(ST_MakePoint(9.8442, 10.3158), 4326)::geography
            )
            RETURNING id
          `,
          [orderId]
        );

        temporaryOrders.push({
          orderId,
          deliveryId: deliveryResult.rows[0].id
        });

        assert.ok(fulfillmentResult.rows[0].id);
      }

      const responses = await Promise.all(
        temporaryOrders.map(({ orderId }) =>
          app.inject({
            method: "POST",
            url: `/api/v1/business/orders/${orderId}/ready`,
            headers: auth(BUSINESS_USER_ID, "BUSINESS_USER")
          })
        )
      );

      assert.equal(responses.filter((response) => response.statusCode === 200).length, 2);
      const statuses = responses.map((response) => response.json().data.delivery.status);
      assert.equal(statuses.filter((status: string) => status === "ASSIGNED").length, 1);
      assert.equal(statuses.filter((status: string) => status === "SEARCHING_RIDER").length, 1);
    } finally {
      for (const temporary of temporaryOrders) {
        await db.query(`DELETE FROM public.pickup_verification_history WHERE pickup_verification_id IN (SELECT id FROM public.pickup_verifications WHERE delivery_id = $1)`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.pickup_verifications WHERE delivery_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.delivery_assignment_decisions WHERE delivery_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.delivery_assignment_history WHERE delivery_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.delivery_status_history WHERE delivery_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.outbox_events WHERE aggregate_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.audit_logs WHERE entity_id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.deliveries WHERE id = $1`, [temporary.deliveryId]);
        await db.query(`DELETE FROM public.fulfillment_status_history WHERE fulfillment_id IN (SELECT id FROM public.fulfillments WHERE order_id = $1)`, [temporary.orderId]);
        await db.query(`DELETE FROM public.fulfillments WHERE order_id = $1`, [temporary.orderId]);
        await db.query(`DELETE FROM public.order_status_history WHERE order_id = $1`, [temporary.orderId]);
        await db.query(`DELETE FROM public.audit_logs WHERE entity_id = $1`, [temporary.orderId]);
        await db.query(`DELETE FROM public.outbox_events WHERE aggregate_id = $1`, [temporary.orderId]);
        await db.query(`DELETE FROM public.orders WHERE id = $1`, [temporary.orderId]);
      }
      await db.query(
        `UPDATE public.riders SET is_available = TRUE, updated_at = NOW() WHERE user_id = $1`,
        [RIDER_USER_ID]
      );
    }
  });
});
