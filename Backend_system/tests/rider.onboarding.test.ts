import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

import { buildApp } from "../src/app";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const RIDER_ID = "22222222-2222-4222-8222-222222222222";

let app: Awaited<ReturnType<typeof buildApp>>;

async function ensureCustomerUser(userId: string) {
  await db.query(
    `
      INSERT INTO public.users (id, email, phone_number, password_hash, role, is_active, first_name, last_name)
      VALUES ($1, $2, $3, $4, 'CUSTOMER', TRUE, 'Onboard', 'Customer')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        password_hash = EXCLUDED.password_hash,
        role = 'CUSTOMER',
        is_active = TRUE,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW()
    `,
    [userId, `customer-${userId.slice(0, 8)}@example.com`, `+1555000${userId.slice(0, 6)}`, "hashed-password"]
  );
}

function token(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET);
}

function auth(userId: string, role: string) {
  return {
    authorization: `Bearer ${token(userId, role)}`
  };
}

before(async () => {
  await ensureCustomerUser(CUSTOMER_ID);
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("rider onboarding and availability", () => {
  it("registers a customer as a rider and returns a rider profile", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/rider/register",
      headers: auth(CUSTOMER_ID, "CUSTOMER"),
      payload: {
        vehicleType: "MOTORCYCLE",
        vehicleRegistration: "RDR-1001",
        phoneNumber: "+2348000001001",
        firstName: "Aisha",
        lastName: "Rider"
      }
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().data.role, "RIDER");
    assert.equal(response.json().data.vehicleType, "MOTORCYCLE");
  });

  it("reads rider availability and balance data for the same rider", async () => {
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/rider/me",
      headers: auth(CUSTOMER_ID, "RIDER")
    });

    assert.equal(me.statusCode, 200);
    assert.ok(me.json().data.userId);
    assert.equal(me.json().data.role, "RIDER");
    assert.equal(typeof me.json().data.currentBalance, "number");

    const availability = await app.inject({
      method: "POST",
      url: "/api/v1/rider/availability",
      headers: auth(CUSTOMER_ID, "RIDER"),
      payload: { available: true }
    });

    assert.equal(availability.statusCode, 200);
    assert.equal(availability.json().data.available, true);
  });
});
