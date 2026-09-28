import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

const SUPER_ADMIN_ID = "88888888-8888-4888-8888-888888888888";
const CUSTOMER_ID = "33333333-3333-4333-8333-333333333333";
const BUSINESS_OWNER_ID = "44444444-4444-4444-8444-444444444444";
const RIDER_ID = "55555555-5555-4555-8555-555555555555";

let app: Awaited<ReturnType<typeof buildApp>>;
let testOrderId: string;

function token(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET);
}

function auth(userId: string, role: string) {
  return {
    authorization: `Bearer ${token(userId, role)}`,
  };
}

async function seedSuperAdminFixtures() {
  // 1. Create Super Admin user
  await db.query(
    `INSERT INTO public.users (id, email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', TRUE, 'SquadLink', 'SuperAdmin')
     ON CONFLICT (id) DO UPDATE SET role = 'SUPER_ADMIN', is_active = TRUE`,
    [SUPER_ADMIN_ID, "superadmin@squadlink.app", "+2348000000001", "password-hash"]
  );

  // 2. Create customer, business, rider
  await db.query(
    `INSERT INTO public.users (id, email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ($1, 'cust@example.com', '+2348000000002', 'pwd', 'CUSTOMER', TRUE, 'Test', 'Customer')
     ON CONFLICT (id) DO NOTHING`,
    [CUSTOMER_ID]
  );

  await db.query(
    `INSERT INTO public.users (id, email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ($1, 'biz@example.com', '+2348000000003', 'pwd', 'BUSINESS_USER', TRUE, 'Biz', 'Owner')
     ON CONFLICT (id) DO NOTHING`,
    [BUSINESS_OWNER_ID]
  );

  await db.query(
    `INSERT INTO public.businesses (id, name, address_line, city, state, location, is_active, is_verified)
     VALUES ($1, 'Bauchi Grills', 'Yelwa Road', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), TRUE, TRUE)
     ON CONFLICT (id) DO NOTHING`,
    ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"]
  );

  // 3. Create a test order
  const orderRes = await db.query<{ id: string }>(
    `INSERT INTO public.orders (
       user_id, status, subtotal_amount, delivery_fee_amount, platform_fee_amount,
       business_fee_amount, total_amount, currency, delivery_address_line, delivery_city,
       delivery_state, delivery_location, delivery_contact_phone
     ) VALUES (
       $1, 'PENDING', 3000, 500, 150,
       150, 3650, 'NGN', 'Gwallameji Campus Gate', 'Bauchi', 'Bauchi',
       ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326), '+2348000000002'
     ) RETURNING id`,
    [CUSTOMER_ID]
  );
  testOrderId = orderRes.rows[0].id;

  // Create payment & delivery row for test order
  const payRes = await db.query<{ id: string }>(
    `INSERT INTO public.payments (order_id, amount, currency, status)
     VALUES ($1, 3650, 'NGN', 'PENDING') RETURNING id`,
    [testOrderId]
  );

  await db.query(
    `INSERT INTO public.payment_attempts (payment_id, provider, amount, currency, status)
     VALUES ($1, 'PAYSTACK', 3650, 'NGN', 'PENDING')`,
    [payRes.rows[0].id]
  );

  await db.query(
    `INSERT INTO public.deliveries (order_id, status, pickup_location, delivery_location)
     VALUES ($1, 'PENDING', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326))`,
    [testOrderId]
  );
}

before(async () => {
  await seedSuperAdminFixtures();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("Super Admin Absolute Authority Control Center & Ledger Invariant", () => {
  it("allows SUPER_ADMIN to fetch global observability dashboard metrics and service zones", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/platform/observability",
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.data.financials.grossMerchandiseValue, "number");
    assert.equal(typeof body.data.financials.totalPlatformRevenue, "number");
    assert.equal(typeof body.data.financials.averageContributionPerOrder, "number");
    assert.equal(typeof body.data.health.healthScore, "number");
    assert.ok(Array.isArray(body.data.serviceZones));
    assert.ok(body.data.serviceZones.length > 0, "Service zones should include Gwallameji-Yelwa corridor");
  });

  it("lists platform orders for super admin inspection across lifecycle stages", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/platform/orders",
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find((o: { id: string }) => o.id === testOrderId);
    assert.ok(found, "Test order should be listed in super admin orders");
  });

  it("permits SUPER_ADMIN to force-transition an order across lifecycle stages with mandatory audit reason", async () => {
    // Force transition to DELIVERED
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/admin/platform/orders/${testOrderId}/force-transition`,
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
      payload: {
        targetStage: "DELIVERED",
        reason: "Field pilot supervisor confirmed manual handoff at Gwallameji Gate",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.targetStage, "DELIVERED");
    assert.equal(body.data.newOrderStatus, "DELIVERED");
    assert.equal(body.data.newDeliveryStatus, "DELIVERED");

    // Verify immutable audit log recorded
    const auditRes = await db.query<{ action: string; description: string }>(
      `SELECT action, description FROM public.audit_logs WHERE entity_id = $1 AND action = 'SUPER_ADMIN_FORCE_TRANSITION'`,
      [testOrderId]
    );
    assert.ok(auditRes.rows.length > 0, "Audit log must be immutably recorded");
    assert.ok(auditRes.rows[0].description.includes("Gwallameji Gate"));
  });

  it("verifies double-entry ledger calculation and balanced invariant upon order completion", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/admin/platform/ledger?orderId=${testOrderId}`,
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.ok(body.data.entries.length >= 2, "Must contain balanced debits and credits");

    // Invariant: Total Debits == Total Credits (Variance == 0)
    assert.equal(body.data.summary.isBalanced, true, "Double-entry ledger invariant must strictly balance");
    assert.equal(body.data.summary.variance, 0, "Ledger variance must be 0");
    assert.equal(body.data.summary.totalDebits, body.data.summary.totalCredits, "Debits must equal Credits");
  });

  it("allows SUPER_ADMIN to inspect and update platform pilot parameters", async () => {
    // 1. Fetch current config
    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/platform/config",
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
    });
    assert.equal(getRes.statusCode, 200);
    const configData = getRes.json().data;
    assert.ok(configData.customer_fee_target || configData.PILOT_CUSTOMER_FEES);

    // 2. Update parameter
    const putRes = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/platform/config",
      headers: auth(SUPER_ADMIN_ID, "SUPER_ADMIN"),
      payload: {
        key: "PILOT_CUSTOMER_FEES",
        value: { minFee: 120, maxFee: 150, defaultFee: 150, currency: "NGN" },
        reason: "Adjusted minimum pilot customer fee to ₦120 as per business model framework",
      },
    });
    assert.equal(putRes.statusCode, 200);
    const updated = putRes.json().data;
    assert.equal(updated.value.minFee, 120);
  });
});
