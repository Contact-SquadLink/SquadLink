import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { db } from "../src/db/database";
import {
  processOutboxEventById
} from "../src/modules/outbox/outbox.processor";

const ORDER_ID = "1f43ac8a-11ce-465a-ab80-4a497b0a59e2";
const CUSTOMER_ID = "a0621d6d-b0ad-4e57-896f-0413f8caaae0";
const BUSINESS_USER_ID = "9f9f2a3e-aa42-4a8d-97b3-c0ab173c2fcc";
const temporaryEventIds: string[] = [];

before(async () => {
  await db.query(
    `DELETE FROM public.notifications WHERE event_key LIKE 'outbox-test:%'`
  );
});

after(async () => {
  for (const eventId of temporaryEventIds) {
    await db.query(
      `
        DELETE FROM public.notification_attempts
        WHERE notification_id IN (
          SELECT id FROM public.notifications WHERE event_key LIKE $1
        )
      `,
      [`${eventId}:%`]
    );
    await db.query(
      `DELETE FROM public.notifications WHERE event_key LIKE $1`,
      [`${eventId}:%`]
    );
    await db.query(
      `DELETE FROM public.outbox_events WHERE id = $1`,
      [eventId]
    );
  }
  await db.end();
});

async function createEvent(eventType: string): Promise<string> {
  const eventKey = `outbox-test:${randomUUID()}`;
  const result = await db.query<{ id: string }>(
    `
      INSERT INTO public.outbox_events (
        event_type, aggregate_type, aggregate_id, payload
      )
      VALUES ($1, 'ORDER', $2, '{}'::jsonb)
      RETURNING id
    `,
    [eventType, ORDER_ID]
  );
  const eventId = result.rows[0].id;
  temporaryEventIds.push(eventId);
  await db.query(
    `UPDATE public.outbox_events SET payload = jsonb_build_object('testKey', $1::text) WHERE id = $2`,
    [eventKey, eventId]
  );
  return eventId;
}

describe("outbox processor", () => {
  it("processes an event and creates one scoped notification", async () => {
    const eventId = await createEvent("ORDER_DELIVERED");
    const result = await processOutboxEventById(eventId);

    assert.equal(result?.status, "PROCESSED");

    const state = await db.query<{
      event_status: string;
      notification_count: string;
      attempt_status: string;
      notification_user_id: string;
      notification_order_id: string;
    }>(
      `
        SELECT
          oe.status AS event_status,
          COUNT(n.id)::text AS notification_count,
          MAX(na.status)::text AS attempt_status,
          MAX(n.user_id::text) AS notification_user_id,
          MAX(n.order_id::text) AS notification_order_id
        FROM public.outbox_events oe
        LEFT JOIN public.notifications n ON n.event_key = oe.id::text || ':customer'
        LEFT JOIN public.notification_attempts na ON na.notification_id = n.id
        WHERE oe.id = $1
        GROUP BY oe.status
      `,
      [eventId]
    );

    assert.equal(state.rows[0].event_status, "PROCESSED");
    assert.equal(state.rows[0].notification_count, "1");
    assert.equal(state.rows[0].attempt_status, "SENT");
    assert.equal(state.rows[0].notification_user_id, CUSTOMER_ID);
    assert.equal(state.rows[0].notification_order_id, ORDER_ID);
  });

  it("does not process a processed event twice", async () => {
    const eventId = await createEvent("ORDER_DELIVERED");
    await processOutboxEventById(eventId);
    const replay = await processOutboxEventById(eventId);

    assert.equal(replay, null);

    const count = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.notifications WHERE event_key LIKE $1`,
      [`${eventId}:%`]
    );
    assert.equal(count.rows[0].count, "1");
  });

  it("records notification failure and succeeds on retry", async () => {
    const eventId = await createEvent("ORDER_DELIVERED");
    const failed = await processOutboxEventById(eventId, {
      simulateFailure: true
    });

    assert.equal(failed?.status, "PENDING");

    await db.query(
      `UPDATE public.outbox_events SET available_at = NOW() WHERE id = $1`,
      [eventId]
    );
    const retried = await processOutboxEventById(eventId);

    assert.equal(retried?.status, "PROCESSED");

    const attempts = await db.query<{ attempt_count: string; status: string }>(
      `
        SELECT COUNT(*)::text AS attempt_count,
               (
                 SELECT na2.status::text
                 FROM public.notification_attempts na2
                 INNER JOIN public.notifications n2 ON n2.id = na2.notification_id
                 WHERE n2.event_key LIKE $1
                 ORDER BY na2.attempt_number DESC
                 LIMIT 1
               ) AS status
        FROM public.notification_attempts na
        INNER JOIN public.notifications n ON n.id = na.notification_id
        WHERE n.event_key LIKE $1
      `,
      [`${eventId}:%`]
    );
    assert.equal(attempts.rows[0].attempt_count, "2");
    assert.equal(attempts.rows[0].status, "SENT");
  });

  it("serializes concurrent workers for one event", async () => {
    const eventId = await createEvent("ORDER_DELIVERED");
    const results = await Promise.all([
      processOutboxEventById(eventId),
      processOutboxEventById(eventId)
    ]);

    assert.equal(results.filter((result) => result?.status === "PROCESSED").length, 1);
    assert.equal(results.filter((result) => result === null).length, 1);

    const count = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.notifications WHERE event_key LIKE $1`,
      [`${eventId}:%`]
    );
    assert.equal(count.rows[0].count, "1");
  });

  it("does not send a customer notification for a business-only event", async () => {
    const eventId = await createEvent("ORDER_PLACED");
    const result = await processOutboxEventById(eventId);

    assert.equal(result?.status, "PROCESSED");

    const recipients = await db.query<{ user_id: string; type: string }>(
      `
        SELECT user_id, type
        FROM public.notifications
        WHERE event_key LIKE $1
      `,
      [`${eventId}:%`]
    );
    assert.deepEqual(recipients.rows, [{
      user_id: BUSINESS_USER_ID,
      type: "NEW_ORDER"
    }]);
  });
});
