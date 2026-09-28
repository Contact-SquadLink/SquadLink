import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { buildApp } from "../src/app-builder";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

let adminUserId: string;
let riderUserId: string;
let app: Awaited<ReturnType<typeof buildApp>>;

function auth(userId: string, role: string) {
  const token = jwt.sign({ sub: userId, role }, env.JWT_SECRET);
  return {
    authorization: `Bearer ${token}`,
  };
}

describe("Account-Isolated Notification Controls & Push Subscriptions", () => {
  before(async () => {
    app = await buildApp();
    const passwordHash = await bcrypt.hash("TestPass123!", 10);

    // 1. Seed or fetch SUPER_ADMIN
    const adminRes = await db.query<{ id: string }>(
      `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
       VALUES ('admin.notif.test@squadlink.app', '+2348099990001', $1, 'SUPER_ADMIN', TRUE, 'Super', 'Admin')
       ON CONFLICT (email) DO UPDATE SET role = 'SUPER_ADMIN', is_active = TRUE
       RETURNING id`,
      [passwordHash]
    );
    adminUserId = adminRes.rows[0].id;

    // 2. Seed or fetch RIDER user
    const riderRes = await db.query<{ id: string }>(
      `INSERT INTO public.users (email, phone_number, password_hash, role, is_active, first_name, last_name)
       VALUES ('rider.notif.test@squadlink.app', '+2348099990002', $1, 'RIDER', TRUE, 'Fast', 'Rider')
       ON CONFLICT (email) DO UPDATE SET role = 'RIDER', is_active = TRUE
       RETURNING id`,
      [passwordHash]
    );
    riderUserId = riderRes.rows[0].id;

    // Clean up test subscriptions
    await db.query(
      `DELETE FROM public.push_subscriptions WHERE user_id IN ($1, $2)`,
      [adminUserId, riderUserId]
    );
  });

  after(async () => {
    await db.query(
      `DELETE FROM public.push_subscriptions WHERE user_id IN ($1, $2)`,
      [adminUserId, riderUserId]
    );
    await app.close();
  });

  it("authorizes SUPER_ADMIN on notifications endpoints without 403 Forbidden", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(adminUserId, "SUPER_ADMIN"),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(typeof body.data.enabled, "boolean");
    assert.strictEqual(body.data.role, "SUPER_ADMIN");
  });

  it("allows multiple accounts on the same device to independently register the same push endpoint", async () => {
    const sharedEndpoint = "https://fcm.googleapis.com/fcm/send/shared-device-token-12345";
    const sampleKeys = {
      p256dh: "BMV5Q2y78QvJ4x3Nq7y6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8",
      auth: "a1b2c3d4e5f6g7h8",
    };

    // 1. Admin enables push
    const adminSubRes = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(adminUserId, "SUPER_ADMIN"),
      payload: {
        endpoint: sharedEndpoint,
        keys: sampleKeys,
      },
    });
    assert.strictEqual(adminSubRes.statusCode, 201);

    // 2. Rider also enables push on the same browser/endpoint
    const riderSubRes = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(riderUserId, "RIDER"),
      payload: {
        endpoint: sharedEndpoint,
        keys: sampleKeys,
      },
    });
    assert.strictEqual(riderSubRes.statusCode, 201);

    // 3. Verify BOTH subscriptions exist and are active in the database
    const dbSubs = await db.query<{ user_id: string; is_active: boolean }>(
      `SELECT user_id, is_active FROM public.push_subscriptions WHERE endpoint = $1 ORDER BY created_at ASC`,
      [sharedEndpoint]
    );
    assert.strictEqual(dbSubs.rows.length, 2, "Expected 2 independent subscriptions for the same endpoint");
    assert.strictEqual(dbSubs.rows.every((r) => r.is_active === true), true);

    // 4. Verify subscription status for Admin is enabled
    const adminStatusRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(adminUserId, "SUPER_ADMIN"),
    });
    assert.strictEqual(adminStatusRes.statusCode, 200);
    assert.strictEqual(JSON.parse(adminStatusRes.body).data.enabled, true);

    // 5. Verify subscription status for Rider is enabled
    const riderStatusRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(riderUserId, "RIDER"),
    });
    assert.strictEqual(riderStatusRes.statusCode, 200);
    assert.strictEqual(JSON.parse(riderStatusRes.body).data.enabled, true);
  });

  it("switching off notifications for Rider does NOT switch off Admin notifications", async () => {
    const sharedEndpoint = "https://fcm.googleapis.com/fcm/send/shared-device-token-12345";

    // Rider switches off push notifications
    const riderUnsubRes = await app.inject({
      method: "DELETE",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(riderUserId, "RIDER"),
      payload: {
        endpoint: sharedEndpoint,
      },
    });
    assert.strictEqual(riderUnsubRes.statusCode, 200);

    // Check Rider status -> must be disabled (false)
    const riderStatusRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(riderUserId, "RIDER"),
    });
    assert.strictEqual(riderStatusRes.statusCode, 200);
    assert.strictEqual(JSON.parse(riderStatusRes.body).data.enabled, false);

    // CRITICAL: Check Admin status -> must STILL be enabled (true)!
    const adminStatusRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/push/subscription",
      headers: auth(adminUserId, "SUPER_ADMIN"),
    });
    assert.strictEqual(adminStatusRes.statusCode, 200);
    assert.strictEqual(
      JSON.parse(adminStatusRes.body).data.enabled,
      true,
      "Admin notifications must remain active when Rider turns off notifications!"
    );
  });

  it("enqueues push notifications only for active account subscriptions", async () => {
    // 1. Insert notification for Admin (active)
    const adminNotifRes = await db.query<{ id: string }>(
      `INSERT INTO public.notifications (user_id, type, channel, status, title, message)
       VALUES ($1, 'DELIVERY_ASSIGNMENT'::public.notification_type, 'IN_APP', 'SENT', 'Admin alert', 'You have a new admin alert')
       RETURNING id`,
      [adminUserId]
    );
    const adminNotifId = adminNotifRes.rows[0].id;

    // Check push delivery queued for Admin
    const adminDeliveries = await db.query(
      `SELECT id, status FROM public.notification_push_deliveries WHERE notification_id = $1`,
      [adminNotifId]
    );
    assert.strictEqual(adminDeliveries.rows.length, 1, "Expected push delivery queued for Admin");

    // 2. Insert notification for Rider (inactive)
    const riderNotifRes = await db.query<{ id: string }>(
      `INSERT INTO public.notifications (user_id, type, channel, status, title, message)
       VALUES ($1, 'DELIVERY_ASSIGNMENT'::public.notification_type, 'IN_APP', 'SENT', 'Rider alert', 'You have a new rider alert')
       RETURNING id`,
      [riderUserId]
    );
    const riderNotifId = riderNotifRes.rows[0].id;

    // Check push delivery queued for Rider -> should be 0 because Rider is inactive
    const riderDeliveries = await db.query(
      `SELECT id, status FROM public.notification_push_deliveries WHERE notification_id = $1`,
      [riderNotifId]
    );
    assert.strictEqual(
      riderDeliveries.rows.length,
      0,
      "No push delivery should be queued for Rider whose push is disabled"
    );
  });

  it("updates account notification preferences via PATCH /preferences", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/preferences",
      headers: auth(riderUserId, "RIDER"),
      payload: { enabled: true },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(JSON.parse(res.body).data.notificationsEnabled, true);

    const userRow = await db.query<{ notifications_enabled: boolean }>(
      `SELECT notifications_enabled FROM public.users WHERE id = $1`,
      [riderUserId]
    );
    assert.strictEqual(userRow.rows[0].notifications_enabled, true);
  });
});
