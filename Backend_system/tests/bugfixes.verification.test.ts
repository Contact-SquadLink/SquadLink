import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

let superAdminUserId: string;
let businessOwnerUserId: string;
let customerUserId: string;
let riderUserId: string;
let unverifiedRiderUserId: string;

let businessId: string;
let orderId: string;
let riderRowId: string;
let unverifiedRiderRowId: string;

let app: Awaited<ReturnType<typeof buildApp>>;

function token(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET);
}

function auth(userId: string, role: string) {
  return {
    authorization: `Bearer ${token(userId, role)}`,
  };
}

before(async () => {
  app = await buildApp();

  const passwordHash = await bcrypt.hash("SuperSecret123!", 10);

  // 1. Seed SUPER_ADMIN
  const superAdminRes = await db.query<{ id: string }>(
    `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ('contact.squadlink@gmail.com', '+2348011111111', $1, 'SUPER_ADMIN', TRUE, 'Squad', 'SuperAdmin')
     ON CONFLICT (email) DO UPDATE SET
       role = 'SUPER_ADMIN',
       is_active = TRUE,
       password_hash = '$2b$12$d/6BnZY4VsEPBKVIADtcb.KwX61C.1T5TMIZt3CEVgDR/vR3zJVTa'
     RETURNING id`,
    [passwordHash]
  );
  superAdminUserId = superAdminRes.rows[0].id;

  // 2. Seed Customer
  const custRes = await db.query<{ id: string }>(
    `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ('customer.bugfix@squadlink.app', '+2348022222222', $1, 'CUSTOMER', TRUE, 'Test', 'Customer')
     ON CONFLICT (email) DO UPDATE SET is_active = TRUE
     RETURNING id`,
    [passwordHash]
  );
  customerUserId = custRes.rows[0].id;

  // 3. Seed Business User & Business
  const bizUserRes = await db.query<{ id: string }>(
    `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ('business.bugfix@squadlink.app', '+2348033333333', $1, 'BUSINESS_USER', TRUE, 'Bauchi', 'Kitchen')
     ON CONFLICT (email) DO UPDATE SET is_active = TRUE
     RETURNING id`,
    [passwordHash]
  );
  businessOwnerUserId = bizUserRes.rows[0].id;

  const existingBiz = await db.query<{ id: string }>(
    `SELECT id FROM public.businesses WHERE owner_user_id = $1`,
    [businessOwnerUserId]
  );
  if (existingBiz.rows.length > 0) {
    businessId = existingBiz.rows[0].id;
  } else {
    const bizRes = await db.query<{ id: string }>(
      `INSERT INTO public.businesses (owner_user_id, name, address_line, city, state, location, is_active, is_verified)
       VALUES ($1, 'Bauchi Grills Express', 'Yelwa Road', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), TRUE, TRUE)
       RETURNING id`,
      [businessOwnerUserId]
    );
    businessId = bizRes.rows[0].id;
  }

  // 4. Seed Verified Rider
  const riderUserRes = await db.query<{ id: string }>(
    `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ('rider.verified.bugfix@squadlink.app', '+2348044444444', $1, 'RIDER', TRUE, 'Musa', 'Rider')
     ON CONFLICT (email) DO UPDATE SET is_active = TRUE
     RETURNING id`,
    [passwordHash]
  );
  riderUserId = riderUserRes.rows[0].id;

  const riderRes = await db.query<{ id: string }>(
    `INSERT INTO public.riders (user_id, registered_phone_number, device_type, is_active, is_available)
     VALUES ($1, '+2348044444444', 'SMARTPHONE', TRUE, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, is_available = TRUE
     RETURNING id`,
    [riderUserId]
  );
  riderRowId = riderRes.rows[0].id;

  await db.query(
    `INSERT INTO public.rider_verifications (rider_id, status, verification_notes, verified_at)
     VALUES ($1, 'VERIFIED', 'Verified for dispatch tests', NOW())
     ON CONFLICT (rider_id) DO UPDATE SET status = 'VERIFIED', verified_at = NOW()`,
    [riderRowId]
  );

  // Seed vehicle for verified rider
  const vtRes = await db.query<{ id: string }>(
    `SELECT id FROM public.vehicle_types WHERE code = 'MOTORCYCLE' LIMIT 1`
  );
  const vehicleTypeId = vtRes.rows[0]?.id;

  if (vehicleTypeId) {
    await db.query(
      `INSERT INTO public.vehicles (rider_id, vehicle_type_id, registration_number, is_active)
       VALUES ($1, $2, 'BAU-990-RDR', TRUE)
       ON CONFLICT DO NOTHING`,
      [riderRowId, vehicleTypeId]
    );
  }

  // 5. Seed Unverified Rider
  const unverifiedUserRes = await db.query<{ id: string }>(
    `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ('rider.pending.bugfix@squadlink.app', '+2348055555555', $1, 'RIDER', TRUE, 'Aliyu', 'Pending')
     ON CONFLICT (email) DO UPDATE SET role = 'RIDER', is_active = TRUE
     RETURNING id`,
    [passwordHash]
  );
  unverifiedRiderUserId = unverifiedUserRes.rows[0].id;

  const unverifiedRes = await db.query<{ id: string }>(
    `INSERT INTO public.riders (user_id, registered_phone_number, device_type, is_active, is_available)
     VALUES ($1, '+2348055555555', 'SMARTPHONE', TRUE, FALSE)
     ON CONFLICT (user_id) DO UPDATE SET is_active = TRUE, is_available = FALSE
     RETURNING id`,
    [unverifiedRiderUserId]
  );
  unverifiedRiderRowId = unverifiedRes.rows[0].id;

  await db.query(
    `INSERT INTO public.rider_verifications (rider_id, status, verification_notes)
     VALUES ($1, 'PENDING', 'Awaiting document approval')
     ON CONFLICT (rider_id) DO UPDATE SET status = 'PENDING', verified_at = NULL`,
    [unverifiedRiderRowId]
  );
});

after(async () => {
  // Cleanup test business
  if (businessId) {
    await db.query(`DELETE FROM public.businesses WHERE id = $1`, [businessId]).catch(() => {});
  }
  await app.close();
  await db.end();
});

describe("Bug Fix 1: Super Admin Authentication & Authorization", () => {
  it("allows SUPER_ADMIN account contact.squadlink@gmail.com to login without rejection", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        identifier: "contact.squadlink@gmail.com",
        password: "SquadLink@Admin2026!"
      }
    });

    assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, "SUPER_ADMIN");
    assert.ok(body.data.accessToken);
  });

  it("authorizes SUPER_ADMIN on admin-guarded routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/platform/observability",
      headers: auth(superAdminUserId, "SUPER_ADMIN")
    });

    assert.notEqual(res.statusCode, 401);
    assert.notEqual(res.statusCode, 403);
    assert.equal(res.statusCode, 200);
  });
});

describe("Bug Fix 2: Business Retry Rider Endpoint Fix", () => {
  it("safely resets delivery assignment state, avoids duplicate key collisions, and returns 200", async () => {
    // 1. Create order
    const orderRes = await db.query<{ id: string }>(
      `INSERT INTO public.orders (
         user_id, status, subtotal_amount, delivery_fee_amount, total_amount,
         delivery_address_line, delivery_city, delivery_state, delivery_location
       ) VALUES (
         $1, 'READY_FOR_PICKUP', 2500, 500, 3000,
         'ATBU Gate', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326)
       ) RETURNING id`,
      [customerUserId]
    );
    orderId = orderRes.rows[0].id;

    // 2. Create fulfillment linked to business
    await db.query(
      `INSERT INTO public.fulfillments (order_id, business_id, status)
       VALUES ($1, $2, 'CONFIRMED')`,
      [orderId, businessId]
    );

    // 3. Create existing delivery with rider assigned and pending decision
    const delRes = await db.query<{ id: string }>(
      `INSERT INTO public.deliveries (order_id, rider_id, status, pickup_location, delivery_location)
       VALUES ($1, $2, 'ASSIGNED', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326))
       RETURNING id`,
      [orderId, riderRowId]
    );
    const deliveryId = delRes.rows[0].id;

    // Create a pending decision for this delivery to test unique constraint collision fix
    await db.query(
      `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id, status, expires_at)
       VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '10 minutes')`,
      [deliveryId, riderRowId]
    );

    // 4. Invoke retry rider endpoint
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/business/orders/${orderId}/retry-rider`,
      headers: auth(businessOwnerUserId, "BUSINESS_USER")
    });

    assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.orderId, orderId);
    assert.equal(body.data.status, "READY_FOR_PICKUP");
    assert.ok(body.data.delivery);

    // 5. Verify audit history logged
    const auditRes = await db.query(
      `SELECT action, entity_type FROM public.audit_logs
       WHERE entity_id = $1 AND action = 'RETRY_RIDER_ASSIGNMENT'
       LIMIT 1`,
      [orderId]
    );
    assert.equal(auditRes.rows.length, 1);
  });
});

describe("Bug Fix 3: Rider Location Update & Real-Time Tracking Fix", () => {
  it("updates GPS coordinates formatted into PostGIS point geography", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/rider/location",
      headers: auth(riderUserId, "RIDER"),
      payload: {
        latitude: 10.312456,
        longitude: 9.824123
      }
    });

    assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.latitude, 10.312456);
    assert.equal(body.data.longitude, 9.824123);

    // Verify coordinates stored in database
    const dbRes = await db.query<{ lat: number; lng: number }>(
      `SELECT ST_Y(current_location::geometry) AS lat, ST_X(current_location::geometry) AS lng
       FROM public.riders WHERE user_id = $1`,
      [riderUserId]
    );
    assert.ok(dbRes.rows[0]);
    assert.ok(Math.abs(dbRes.rows[0].lat - 10.312456) < 0.0001);
    assert.ok(Math.abs(dbRes.rows[0].lng - 9.824123) < 0.0001);
  });

  it("handles invalid coordinates gracefully with 400 Bad Request, not 500", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/rider/location",
      headers: auth(riderUserId, "RIDER"),
      payload: {
        latitude: 150.0, // Invalid latitude > 90
        longitude: 9.824
      }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.json().success, false);
  });

  it("allows verified riders to go online and offline", async () => {
    // Go offline
    const offlineRes = await app.inject({
      method: "POST",
      url: "/api/v1/rider/availability",
      headers: auth(riderUserId, "RIDER"),
      payload: { available: false }
    });
    assert.equal(offlineRes.statusCode, 200);
    assert.equal(offlineRes.json().data.available, false);

    // Go online
    const onlineRes = await app.inject({
      method: "POST",
      url: "/api/v1/rider/availability",
      headers: auth(riderUserId, "RIDER"),
      payload: { available: true }
    });
    assert.equal(onlineRes.statusCode, 200);
    assert.equal(onlineRes.json().data.available, true);
  });

  it("allows unverified rider to go offline unconditionally, but blocks going online with 403", async () => {
    // Go offline: always permitted
    const offlineRes = await app.inject({
      method: "POST",
      url: "/api/v1/rider/availability",
      headers: auth(unverifiedRiderUserId, "RIDER"),
      payload: { available: false }
    });
    assert.equal(offlineRes.statusCode, 200);
    assert.equal(offlineRes.json().data.available, false);

    // Go online: blocked because verification status is PENDING
    const onlineRes = await app.inject({
      method: "POST",
      url: "/api/v1/rider/availability",
      headers: auth(unverifiedRiderUserId, "RIDER"),
      payload: { available: true }
    });
    assert.equal(onlineRes.statusCode, 403);
    assert.equal(onlineRes.json().error.code, "RIDER_NOT_VERIFIED");
  });
});

describe("Bug Fix 4: Rider Assignment Acceptance, Rejection & Decision Lifecycle", () => {
  it("fetches rider delivery with LATERAL join returning correct assignmentStatus and expiresAt", async () => {
    // 1. Create order and delivery assigned to rider
    const orderRes = await db.query<{ id: string }>(
      `INSERT INTO public.orders (
         user_id, status, subtotal_amount, delivery_fee_amount, total_amount,
         delivery_address_line, delivery_city, delivery_state, delivery_location
       ) VALUES (
         $1, 'READY_FOR_PICKUP', 3000, 500, 3500,
         'Wunti Market', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326)
       ) RETURNING id`,
      [customerUserId]
    );
    const testOrderId = orderRes.rows[0].id;

    await db.query(
      `INSERT INTO public.fulfillments (order_id, business_id, status)
       VALUES ($1, $2, 'CONFIRMED')`,
      [testOrderId, businessId]
    );

    const delRes = await db.query<{ id: string }>(
      `INSERT INTO public.deliveries (order_id, rider_id, status, pickup_location, delivery_location)
       VALUES ($1, $2, 'ASSIGNED', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326))
       RETURNING id`,
      [testOrderId, riderRowId]
    );
    const testDeliveryId = delRes.rows[0].id;

    // 2. Insert older EXPIRED decision and current PENDING decision
    await db.query(
      `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id, status, expires_at, created_at)
       VALUES ($1, $2, 'EXPIRED', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour')`,
      [testDeliveryId, riderRowId]
    );

    await db.query(
      `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id, status, expires_at, created_at)
       VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '15 minutes', NOW())`,
      [testDeliveryId, riderRowId]
    );

    // 3. GET /rider/deliveries/:deliveryId returns PENDING status (not expired!)
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/rider/deliveries/${testDeliveryId}`,
      headers: auth(riderUserId, "RIDER")
    });
    assert.equal(getRes.statusCode, 200);
    const body = getRes.json();
    assert.equal(body.data.id, testDeliveryId);
    assert.equal(body.data.status, "ASSIGNED");
    assert.equal(body.data.assignmentStatus, "PENDING");
    assert.ok(body.data.assignmentExpiresAt);

    // 4. Accept assignment
    const acceptRes = await app.inject({
      method: "POST",
      url: `/api/v1/rider/deliveries/${testDeliveryId}/accept`,
      headers: auth(riderUserId, "RIDER")
    });
    assert.equal(acceptRes.statusCode, 200);
    const acceptBody = acceptRes.json();
    assert.equal(acceptBody.data.status, "ASSIGNED");
    assert.equal(acceptBody.data.assignmentStatus, "ACCEPTED");

    // 5. Accept again (idempotent test)
    const acceptAgainRes = await app.inject({
      method: "POST",
      url: `/api/v1/rider/deliveries/${testDeliveryId}/accept`,
      headers: auth(riderUserId, "RIDER")
    });
    assert.equal(acceptAgainRes.statusCode, 200);
    assert.equal(acceptAgainRes.json().data.alreadyAccepted, true);
  });

  it("handles rejection and prevents accepting an already rejected assignment", async () => {
    // 1. Create new order and delivery assigned to rider
    const orderRes = await db.query<{ id: string }>(
      `INSERT INTO public.orders (
         user_id, status, subtotal_amount, delivery_fee_amount, total_amount,
         delivery_address_line, delivery_city, delivery_state, delivery_location
       ) VALUES (
         $1, 'READY_FOR_PICKUP', 2000, 500, 2500,
         'Yelwa Tudu', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326)
       ) RETURNING id`,
      [customerUserId]
    );
    const testOrderId = orderRes.rows[0].id;

    await db.query(
      `INSERT INTO public.fulfillments (order_id, business_id, status)
       VALUES ($1, $2, 'CONFIRMED')`,
      [testOrderId, businessId]
    );

    const delRes = await db.query<{ id: string }>(
      `INSERT INTO public.deliveries (order_id, rider_id, status, pickup_location, delivery_location)
       VALUES ($1, $2, 'ASSIGNED', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326))
       RETURNING id`,
      [testOrderId, riderRowId]
    );
    const testDeliveryId = delRes.rows[0].id;

    await db.query(
      `INSERT INTO public.delivery_assignment_decisions (delivery_id, rider_id, status, expires_at)
       VALUES ($1, $2, 'PENDING', NOW() + INTERVAL '15 minutes')`,
      [testDeliveryId, riderRowId]
    );

    // 2. Reject assignment
    const rejectRes = await app.inject({
      method: "POST",
      url: `/api/v1/rider/deliveries/${testDeliveryId}/reject`,
      headers: auth(riderUserId, "RIDER"),
      payload: { reason: "Vehicle mechanical fault" }
    });
    assert.equal(rejectRes.statusCode, 200);

    // 3. Verify decision in DB is REJECTED
    const decRes = await db.query<{ status: string }>(
      `SELECT status FROM public.delivery_assignment_decisions
       WHERE delivery_id = $1 AND rider_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [testDeliveryId, riderRowId]
    );
    assert.equal(decRes.rows[0].status, "REJECTED");
  });
});

