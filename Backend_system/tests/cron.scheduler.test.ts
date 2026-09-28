import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { cronRoutes } from "../src/modules/cron/cron.routes";

describe("External Cron Scheduler & Outbox Trigger", () => {
  it("rejects unauthorized trigger when CRON_SECRET is set and token is missing or wrong", async () => {
    process.env.CRON_SECRET = "test-cron-secret-12345";

    const app = Fastify();
    await app.register(cronRoutes, { prefix: "/api/v1/cron" });

    // Request with no token
    const resNoAuth = await app.inject({
      method: "POST",
      url: "/api/v1/cron/outbox",
    });
    assert.strictEqual(resNoAuth.statusCode, 401);
    const bodyNoAuth = JSON.parse(resNoAuth.payload);
    assert.strictEqual(bodyNoAuth.success, false);
    assert.strictEqual(bodyNoAuth.error.code, "UNAUTHORIZED_CRON");

    // Request with invalid token
    const resInvalid = await app.inject({
      method: "POST",
      url: "/api/v1/cron/outbox",
      headers: {
        authorization: "Bearer wrong-token",
      },
    });
    assert.strictEqual(resInvalid.statusCode, 401);
    const bodyInvalid = JSON.parse(resInvalid.payload);
    assert.strictEqual(bodyInvalid.error.code, "UNAUTHORIZED_CRON");

    await app.close();
  });

  it("accepts trigger with Bearer token matching CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-cron-secret-12345";

    const app = Fastify();
    await app.register(cronRoutes, { prefix: "/api/v1/cron" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/cron/outbox",
      headers: {
        authorization: "Bearer test-cron-secret-12345",
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.ok("processedEvents" in body.data);
    assert.ok("pushedNotifications" in body.data);
    assert.ok("timestamp" in body.data);

    await app.close();
  });

  it("accepts trigger with x-cron-secret header matching CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-cron-secret-12345";

    const app = Fastify();
    await app.register(cronRoutes, { prefix: "/api/v1/cron" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/cron/outbox",
      headers: {
        "x-cron-secret": "test-cron-secret-12345",
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);

    await app.close();
  });

  it("supports GET /api/v1/cron/outbox for flexible webhook schedulers", async () => {
    process.env.CRON_SECRET = "test-cron-secret-12345";

    const app = Fastify();
    await app.register(cronRoutes, { prefix: "/api/v1/cron" });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/cron/outbox",
      headers: {
        authorization: "Bearer test-cron-secret-12345",
      },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);

    await app.close();
  });
});
