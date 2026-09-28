import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { notifyFeaturePhoneRiderAssignment } from "../src/modules/sms/sms.service";

let app: Awaited<ReturnType<typeof buildApp>>;

const TEST_RIDER_USER_ID = "66666666-6666-4666-8666-666666666666";
const TEST_RIDER_ID = "77777777-7777-4777-8777-777777777777";
const TEST_RIDER_PHONE = "+2348012345678";
const TEST_DELIVERY_ID = "99999999-9999-4999-8999-999999999999";
const TEST_ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function seedRiderAndAssignment() {
  // 1. Create User
  await db.query(
    `INSERT INTO public.users (id, email, phone_number, password_hash, role, is_active, first_name, last_name)
     VALUES ($1, 'feature.rider@squadlink.app', $2, 'pwd', 'RIDER', TRUE, 'Button', 'Rider')
     ON CONFLICT (id) DO UPDATE SET phone_number = $2, is_active = TRUE`,
    [TEST_RIDER_USER_ID, TEST_RIDER_PHONE]
  );

  // 2. Create Rider with FEATURE_PHONE
  await db.query(
    `INSERT INTO public.riders (id, user_id, device_type, registered_phone_number, is_active, is_available)
     VALUES ($1, $2, 'FEATURE_PHONE', $3, TRUE, TRUE)
     ON CONFLICT (id) DO UPDATE SET device_type = 'FEATURE_PHONE', registered_phone_number = $3, is_available = TRUE`,
    [TEST_RIDER_ID, TEST_RIDER_USER_ID, TEST_RIDER_PHONE]
  );

  // 3. Create Business, Order, Delivery for assignment decision
  await db.query(
    `INSERT INTO public.businesses (id, name, address_line, city, state, location, is_active, is_verified)
     VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Yelwa Eatery', 'Yelwa Road', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), TRUE, TRUE)
     ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO public.orders (id, user_id, status, subtotal_amount, delivery_fee_amount, platform_fee_amount, business_fee_amount, total_amount, currency, delivery_address_line, delivery_city, delivery_state, delivery_location, delivery_contact_phone)
     VALUES ($1, $2, 'CONFIRMED', 2000, 500, 150, 150, 2800, 'NGN', 'Bauchi Hostels', 'Bauchi', 'Bauchi', ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326), $3)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_ORDER_ID, TEST_RIDER_USER_ID, TEST_RIDER_PHONE]
  );

  await db.query(
    `INSERT INTO public.deliveries (id, order_id, status, pickup_location, delivery_location)
     VALUES ($1, $2, 'ASSIGNED', ST_SetSRID(ST_MakePoint(9.824, 10.312), 4326), ST_SetSRID(ST_MakePoint(9.825, 10.315), 4326))
     ON CONFLICT (id) DO NOTHING`,
    [TEST_DELIVERY_ID, TEST_ORDER_ID]
  );

  // 4. Create pending delivery assignment decision
  await db.query(`DELETE FROM public.delivery_assignment_decisions WHERE delivery_id = $1`, [TEST_DELIVERY_ID]);
  await db.query(
    `INSERT INTO public.delivery_assignment_decisions (id, delivery_id, rider_id, status, expires_at)
     VALUES (gen_random_uuid(), $1, $2, 'PENDING', NOW() + INTERVAL '10 minutes')`,
    [TEST_DELIVERY_ID, TEST_RIDER_ID]
  );
}

before(async () => {
  await seedRiderAndAssignment();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("Dual-Path Rider SMS & USSD Dispatch System", () => {
  it("rejects unknown phone numbers with RIDER_NOT_FOUND", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/sms",
      payload: {
        from: "+2348099990000",
        text: "1",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.action, "RIDER_NOT_FOUND");
  });

  it("handles unrecognized SMS commands from registered riders with UNKNOWN_COMMAND", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/sms",
      payload: {
        from: TEST_RIDER_PHONE,
        text: "HELLO",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.action, "UNKNOWN_COMMAND");
  });

  it("processes inbound SMS webhook command '1' (Accept) successfully for active rider assignment", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/sms",
      payload: {
        from: TEST_RIDER_PHONE,
        text: "1",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.action, "ACCEPTED");
  });

  it("processes Termii / Africa's Talking outbound dispatch notification for button-phone riders", async () => {
    // Should execute cleanly without throwing
    await notifyFeaturePhoneRiderAssignment({
      riderPhone: TEST_RIDER_PHONE,
      orderId: TEST_ORDER_ID,
      pickupAddress: "Yelwa Food Hub, Gwallameji Corridor",
      deliveryAddress: "Block B, Student Hostels",
      payout: 650,
    });
    assert.ok(true, "Outbound notification executed successfully");
  });
});
