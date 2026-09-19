import type { PoolClient } from "pg";

import { withTransaction } from "../../db/transaction";
import { db } from "../../db/database";

const DEFAULT_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_SECONDS = 30;
const STALE_PROCESSING_MINUTES = 5;

type ProcessorOptions = {
  simulateFailure?: boolean;
};

interface OutboxEvent {
  id: string;
  status: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempt_count: number;
}

interface NotificationJob {
  userId: string;
  orderId: string | null;
  type:
    | "ORDER_CONFIRMED"
    | "ORDER_PREPARING"
    | "ORDER_READY_FOR_PICKUP"
    | "ORDER_IN_TRANSIT"
    | "RIDER_ARRIVED"
    | "ORDER_DELIVERED"
    | "ORDER_CANCELLED"
    | "FULFILLMENT_FAILED"
    | "NEW_ORDER"
    | "RIDER_ASSIGNED"
    | "RIDER_APPROACHING"
    | "ORDER_PICKED_UP"
    | "DELIVERY_ASSIGNMENT"
    | "PICKUP_INSTRUCTIONS";
  title: string;
  message: string;
  recipientKey: string;
}

function retryDelaySeconds(attemptCount: number): number {
  return RETRY_BASE_SECONDS * (2 ** Math.max(0, attemptCount - 1));
}

async function claimNextEvent(
  client: PoolClient
): Promise<OutboxEvent | null> {
  const result = await client.query<OutboxEvent>(
    `
      SELECT
        oe.id,
        oe.status,
        oe.event_type,
        oe.aggregate_type,
        oe.aggregate_id,
        oe.payload,
        oe.attempt_count
      FROM public.outbox_events oe
      WHERE (
        oe.status = 'PENDING'
        OR (
          oe.status = 'PROCESSING'
          AND oe.updated_at < NOW() - ($1::integer * INTERVAL '1 minute')
        )
      )
        AND oe.available_at <= NOW()
        AND NOT EXISTS (
          SELECT 1
          FROM public.outbox_events earlier
          WHERE earlier.aggregate_type = oe.aggregate_type
            AND earlier.aggregate_id = oe.aggregate_id
            AND earlier.status <> 'PROCESSED'
            AND (earlier.created_at, earlier.id)
              < (oe.created_at, oe.id)
        )
      ORDER BY oe.created_at ASC, oe.id ASC
      FOR UPDATE OF oe SKIP LOCKED
      LIMIT 1
    `,
    [STALE_PROCESSING_MINUTES]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const event = result.rows[0];
  await client.query(
    `
      UPDATE public.outbox_events
      SET status = 'PROCESSING',
          attempt_count = attempt_count + 1,
          updated_at = NOW()
      WHERE id = $1
    `,
    [event.id]
  );

  return {
    ...event,
    attempt_count: event.attempt_count + 1
  };
}

async function loadEvent(
  client: PoolClient,
  eventId: string
): Promise<OutboxEvent | null> {
  const result = await client.query<OutboxEvent>(
    `
      SELECT id, status, event_type, aggregate_type, aggregate_id, payload, attempt_count
      FROM public.outbox_events
      WHERE id = $1
      FOR UPDATE
    `,
    [eventId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const event = result.rows[0];
  if (event.status === "PROCESSED" || event.status === "FAILED") {
    return null;
  }

  await client.query(
    `
      UPDATE public.outbox_events
      SET status = 'PROCESSING',
          attempt_count = attempt_count + 1,
          updated_at = NOW()
      WHERE id = $1
    `,
    [event.id]
  );

  return {
    ...event,
    attempt_count: event.attempt_count + 1
  };
}

async function notificationJobs(
  client: PoolClient,
  event: OutboxEvent
): Promise<NotificationJob[]> {
  const orderResult = await client.query<{
    order_id: string;
    customer_user_id: string;
    business_owner_user_id: string | null;
    rider_user_id: string | null;
  }>(
    `
      SELECT
        o.id AS order_id,
        o.user_id AS customer_user_id,
        b.owner_user_id AS business_owner_user_id,
        rider_user.id AS rider_user_id
      FROM public.orders o
      LEFT JOIN public.fulfillments f ON f.order_id = o.id
      LEFT JOIN public.businesses b ON b.id = f.business_id
      LEFT JOIN public.deliveries d ON d.order_id = o.id
      LEFT JOIN public.riders rider ON rider.id = d.rider_id
      LEFT JOIN public.users rider_user ON rider_user.id = rider.user_id
      WHERE o.id = $1
    `,
    [event.aggregate_type === "ORDER" ? event.aggregate_id : null]
  );

  const deliveryResult = event.aggregate_type === "DELIVERY"
    ? await client.query<{
        order_id: string;
        customer_user_id: string;
        business_owner_user_id: string | null;
        rider_user_id: string | null;
      }>(
        `
          SELECT
            o.id AS order_id,
            o.user_id AS customer_user_id,
            b.owner_user_id AS business_owner_user_id,
            rider_user.id AS rider_user_id
          FROM public.deliveries d
          INNER JOIN public.orders o ON o.id = d.order_id
          LEFT JOIN public.fulfillments f ON f.order_id = o.id
          LEFT JOIN public.businesses b ON b.id = f.business_id
          LEFT JOIN public.riders rider ON rider.id = d.rider_id
          LEFT JOIN public.users rider_user ON rider_user.id = rider.user_id
          WHERE d.id = $1
        `,
        [event.aggregate_id]
      )
    : { rows: [] };

  const context = orderResult.rows[0] ?? deliveryResult.rows[0];
  if (!context) {
    throw new Error("OUTBOX_AGGREGATE_NOT_FOUND");
  }

  const jobs: NotificationJob[] = [];
  const addCustomer = (
    type: NotificationJob["type"],
    title: string,
    message: string
  ) => jobs.push({
    userId: context.customer_user_id,
    orderId: context.order_id,
    type,
    title,
    message,
    recipientKey: "customer"
  });
  const addBusiness = (
    type: NotificationJob["type"],
    title: string,
    message: string
  ) => {
    if (context.business_owner_user_id) {
      jobs.push({
        userId: context.business_owner_user_id,
        orderId: context.order_id,
        type,
        title,
        message,
        recipientKey: "business"
      });
    }
  };
  const addRider = (
    type: NotificationJob["type"],
    title: string,
    message: string
  ) => {
    if (context.rider_user_id) {
      jobs.push({
        userId: context.rider_user_id,
        orderId: context.order_id,
        type,
        title,
        message,
        recipientKey: "rider"
      });
    }
  };

  switch (event.event_type) {
    case "ORDER_PLACED":
      addBusiness("NEW_ORDER", "New order", "A new customer order is ready for processing.");
      break;
    case "PAYMENT_SUCCESSFUL":
      addCustomer("ORDER_CONFIRMED", "Order confirmed", "Your payment was confirmed and your order is being prepared.");
      break;
    case "PAYMENT_FAILED":
      addCustomer("ORDER_CANCELLED", "Order cancelled", "Your order was cancelled because payment was not completed.");
      break;
    case "ORDER_ACCEPTED":
      addCustomer("ORDER_PREPARING", "Order accepted", "Your order is being prepared.");
      break;
    case "ORDER_READY_FOR_PICKUP":
      addCustomer("ORDER_READY_FOR_PICKUP", "Order ready", "Your order is ready for pickup.");
      break;
    case "RIDER_ASSIGNED":
      addCustomer("DELIVERY_ASSIGNMENT", "Rider assigned", "A rider has been assigned to your delivery.");
      addBusiness("DELIVERY_ASSIGNMENT", "Rider assigned", "A rider has been assigned to this order.");
      addRider("RIDER_ASSIGNED", "Delivery assigned", "A delivery has been assigned to you.");
      break;
    case "ORDER_PICKED_UP":
      addCustomer("ORDER_IN_TRANSIT", "Order picked up", "Your order is now on its way.");
      break;
    case "DELIVERY_IN_TRANSIT":
      addCustomer("ORDER_IN_TRANSIT", "Order in transit", "Your order is on its way.");
      break;
    case "DELIVERY_ARRIVED":
      addCustomer("RIDER_ARRIVED", "Rider arrived", "Your rider has arrived with your order.");
      break;
    case "ORDER_DELIVERED":
      addCustomer("ORDER_DELIVERED", "Order delivered", "Your order has been delivered.");
      break;
    default:
      throw new Error(`OUTBOX_EVENT_UNSUPPORTED:${event.event_type}`);
  }

  return jobs;
}

async function deliverNotification(
  client: PoolClient,
  event: OutboxEvent,
  job: NotificationJob,
  simulateFailure: boolean
): Promise<boolean> {
  const eventKey = `${event.id}:${job.recipientKey}`;
  const notificationResult = await client.query<{ id: string; status: string }>(
    `
      INSERT INTO public.notifications (
        user_id, order_id, type, channel, status, title, message, event_key
      )
      VALUES ($1, $2, $3, 'IN_APP', 'PENDING', $4, $5, $6)
      ON CONFLICT (event_key) WHERE event_key IS NOT NULL
      DO UPDATE SET updated_at = public.notifications.updated_at
      RETURNING id, status
    `,
    [job.userId, job.orderId, job.type, job.title, job.message, eventKey]
  );
  const notification = notificationResult.rows[0];

  if (notification.status === "SENT") {
    return true;
  }

  const attemptResult = await client.query<{ attempt_number: number }>(
    `
      SELECT COALESCE(MAX(attempt_number), 0) + 1 AS attempt_number
      FROM public.notification_attempts
      WHERE notification_id = $1
    `,
    [notification.id]
  );
  const attemptNumber = Number(attemptResult.rows[0].attempt_number);

  await client.query(
    `
      INSERT INTO public.notification_attempts (
        notification_id, attempt_number, status, provider
      )
      VALUES ($1, $2, 'PENDING', 'IN_APP')
    `,
    [notification.id, attemptNumber]
  );

  if (simulateFailure) {
    await client.query(
      `
        UPDATE public.notification_attempts
        SET status = 'FAILED', failure_reason = 'Simulated notification delivery failure', completed_at = NOW()
        WHERE notification_id = $1 AND attempt_number = $2
      `,
      [notification.id, attemptNumber]
    );
    await client.query(
      `
        UPDATE public.notifications
        SET status = 'FAILED', updated_at = NOW()
        WHERE id = $1
      `,
      [notification.id]
    );
    return false;
  }

  await client.query(
    `
      UPDATE public.notification_attempts
      SET status = 'SENT', completed_at = NOW()
      WHERE notification_id = $1 AND attempt_number = $2
    `,
    [notification.id, attemptNumber]
  );
  await client.query(
    `
      UPDATE public.notifications
      SET status = 'SENT', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [notification.id]
  );
  return true;
}

async function processEvent(
  client: PoolClient,
  event: OutboxEvent,
  options: ProcessorOptions
): Promise<{ eventId: string; status: string; notifications: number }> {
  await client.query("SAVEPOINT outbox_event_processing");

  try {
    const jobs = await notificationJobs(client, event);
    let delivered = 0;
    let failed = false;

    for (const job of jobs) {
      const successful = await deliverNotification(
        client,
        event,
        job,
        options.simulateFailure === true
      );
      if (successful) {
        delivered += 1;
      } else {
        failed = true;
      }
    }

    if (failed) {
      const terminal = event.attempt_count >= MAX_ATTEMPTS;
      await client.query(
        `
          UPDATE public.outbox_events
          SET status = $1::outbox_event_status,
              available_at = CASE WHEN $1 = 'PENDING' THEN NOW() + ($2::integer * INTERVAL '1 second') ELSE available_at END,
              last_error = $3,
              updated_at = NOW()
          WHERE id = $4
        `,
        [
          terminal ? "FAILED" : "PENDING",
          retryDelaySeconds(event.attempt_count),
          terminal ? "Maximum notification delivery attempts reached." : "Notification delivery failed.",
          event.id
        ]
      );
      return {
        eventId: event.id,
        status: terminal ? "FAILED" : "PENDING",
        notifications: delivered
      };
    }

    await client.query(
      `
        UPDATE public.outbox_events
        SET status = 'PROCESSED', processed_at = NOW(), last_error = NULL, updated_at = NOW()
        WHERE id = $1
      `,
      [event.id]
    );
    return { eventId: event.id, status: "PROCESSED", notifications: delivered };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outbox processing failed.";
    const terminal = event.attempt_count >= MAX_ATTEMPTS;
    console.error("Outbox event processing failed:", event.id, message);
    await client.query("ROLLBACK TO SAVEPOINT outbox_event_processing");
    await client.query(
      `
        UPDATE public.outbox_events
        SET status = $1::outbox_event_status,
            available_at = CASE WHEN $1 = 'PENDING' THEN NOW() + ($2::integer * INTERVAL '1 second') ELSE available_at END,
            last_error = $3,
            updated_at = NOW()
        WHERE id = $4
      `,
      [
        terminal ? "FAILED" : "PENDING",
        retryDelaySeconds(event.attempt_count),
        message.slice(0, 1000),
        event.id
      ]
    );
    return {
      eventId: event.id,
      status: terminal ? "FAILED" : "PENDING",
      notifications: 0
    };
  }
}

export async function processNextOutboxEvent(
  options: ProcessorOptions = {}
) {
  return withTransaction(async (client) => {
    const event = await claimNextEvent(client);
    if (!event) {
      return null;
    }
    return processEvent(client, event, options);
  });
}

export async function processOutboxEventById(
  eventId: string,
  options: ProcessorOptions = {}
) {
  return withTransaction(async (client) => {
    const event = await loadEvent(client, eventId);
    if (!event) {
      return null;
    }
    return processEvent(client, event, options);
  });
}

export async function processOutboxBatch(
  limit = DEFAULT_BATCH_SIZE,
  options: ProcessorOptions = {}
): Promise<number> {
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const result = await processNextOutboxEvent(options);
    if (!result) {
      break;
    }
    processed += 1;
  }
  return processed;
}

export async function runOutboxWorker(): Promise<void> {
  const batchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
  const intervalMs = Number(process.env.OUTBOX_INTERVAL_MS ?? 1000);

  while (true) {
    const processed = await processOutboxBatch(batchSize);
    if (processed === 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

if (process.argv[1]?.endsWith("outbox.processor.ts")) {
  void runOutboxWorker().catch(async (error) => {
    console.error("Outbox worker stopped:", error);
    await db.end();
    process.exitCode = 1;
  });
}
