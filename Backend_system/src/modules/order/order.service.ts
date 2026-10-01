import { createHash } from "node:crypto";

import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";
import {
  lockActiveCart,
  selectBusiness
} from "./order.repository";
import type { PlaceOrderInput } from "./order.schemas";
import { createInAppNotification, notifyAdmins } from "../notification/notification.service";
import { calculateDeliveryPricing, buildOrderEconomicSnapshot, type OrderEconomicSnapshot } from "./delivery-pricing";

const IDEMPOTENCY_ENDPOINT = "POST /api/v1/orders";

function serializeOrderRow(row: {
  id: string;
  status: string;
  created_at: string;
  subtotal_amount: number | string;
  delivery_fee_amount: number | string;
  platform_fee_amount: number | string;
  business_fee_amount: number | string;
  total_amount: number | string;
  delivery_contact_phone: string | null;
  delivery_id: string | null;
  delivery_status: string | null;
  rider_accepted?: boolean | null;
  rider_info?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    phoneNumber: string | null;
    vehicleType: string | null;
    vehicleRegistration: string | null;
  } | null;
  economic_snapshot?: OrderEconomicSnapshot | null;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}) {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    subtotal: Number(row.subtotal_amount),
    deliveryFee: Number(row.delivery_fee_amount),
    platformFee: Number(row.platform_fee_amount),
    businessFee: Number(row.business_fee_amount ?? 0),
    vat: 0,
    total: Number(row.total_amount),
    economicSnapshot: row.economic_snapshot ?? null,
    deliveryContactPhone: row.delivery_contact_phone,
    delivery: row.delivery_id
      ? {
          id: row.delivery_id,
          status: row.delivery_status,
          riderAccepted: Boolean(row.rider_accepted),
          rider: row.rider_accepted && row.rider_info
            ? {
                id: row.rider_info.id,
                firstName: row.rider_info.firstName,
                lastName: row.rider_info.lastName,
                username: row.rider_info.username,
                phoneNumber: row.rider_info.phoneNumber,
                vehicleType: row.rider_info.vehicleType,
                vehicleRegistration: row.rider_info.vehicleRegistration
              }
            : null
        }
      : null,
    items: (row.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      subtotal: Number(item.subtotal)
    }))
  };
}

export async function listOrdersForUser(userId: string) {
  // Self-healing sweep for abandoned unpaid orders
  try {
    await sweepAbandonedPendingOrders(15);
  } catch {
    // non-blocking
  }

  const result = await db.query<{
    id: string;
    status: string;
    created_at: string;
    subtotal_amount: number | string;
    delivery_fee_amount: number | string;
    platform_fee_amount: number | string;
    business_fee_amount: number | string;
    total_amount: number | string;
    delivery_contact_phone: string | null;
    delivery_id: string | null;
    delivery_status: string | null;
    rider_accepted?: boolean | null;
    rider_info?: any;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  }>(`
    SELECT o.id,
           o.status,
           o.created_at,
           o.subtotal_amount,
           o.delivery_fee_amount,
           o.platform_fee_amount,
           o.business_fee_amount,
           o.total_amount,
           o.economic_snapshot,
           o.delivery_contact_phone,
           d.id AS delivery_id,
           d.status AS delivery_status,
           CASE
             WHEN (latest_decision.status = 'ACCEPTED' OR d.status IN ('PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED')) THEN TRUE
             ELSE FALSE
           END AS rider_accepted,
           CASE
             WHEN (latest_decision.status = 'ACCEPTED' OR d.status IN ('PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED')) AND r.id IS NOT NULL THEN
               json_build_object(
                 'id', r.id,
                 'firstName', ru.first_name,
                 'lastName', ru.last_name,
                 'username', ru.username,
                 'phoneNumber', ru.phone_number,
                 'vehicleType', COALESCE(vt.name, vt.code::text, 'Motorcycle'),
                 'vehicleRegistration', v.registration_number
               )
             ELSE NULL
           END AS rider_info,
           COALESCE(
             json_agg(
               json_build_object(
                 'productId', oi.product_id,
                 'name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.unit_price_amount,
                 'subtotal', oi.subtotal_amount
               )
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM public.orders o
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.deliveries d ON d.order_id = o.id
    LEFT JOIN public.riders r ON r.id = d.rider_id
    LEFT JOIN public.users ru ON ru.id = r.user_id
    LEFT JOIN public.vehicles v ON v.id = d.vehicle_id
    LEFT JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id
    LEFT JOIN LATERAL (
      SELECT dad.status
      FROM public.delivery_assignment_decisions dad
      WHERE dad.delivery_id = d.id AND dad.rider_id = d.rider_id
      ORDER BY dad.created_at DESC
      LIMIT 1
    ) latest_decision ON TRUE
    WHERE o.user_id = $1
    GROUP BY o.id, o.status, o.created_at, o.subtotal_amount, o.delivery_fee_amount, o.platform_fee_amount, o.business_fee_amount, o.total_amount, o.economic_snapshot, o.delivery_contact_phone, d.id, d.status, latest_decision.status, r.id, ru.first_name, ru.last_name, ru.username, ru.phone_number, vt.name, vt.code, v.registration_number
    ORDER BY o.created_at DESC
  `, [userId]);

  return result.rows.map(serializeOrderRow);
}

export async function getOrderForUser(userId: string, orderId: string) {
  // Self-healing sweep for abandoned unpaid orders
  try {
    await sweepAbandonedPendingOrders(15);
  } catch {
    // non-blocking
  }

  const result = await db.query<{
    id: string;
    status: string;
    created_at: string;
    subtotal_amount: number | string;
    delivery_fee_amount: number | string;
    platform_fee_amount: number | string;
    business_fee_amount: number | string;
    total_amount: number | string;
    economic_snapshot?: any;
    delivery_contact_phone: string | null;
    delivery_id: string | null;
    delivery_status: string | null;
    rider_accepted?: boolean | null;
    rider_info?: any;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  }>(`
    SELECT o.id,
           o.status,
           o.created_at,
           o.subtotal_amount,
           o.delivery_fee_amount,
           o.platform_fee_amount,
           o.business_fee_amount,
           o.total_amount,
           o.economic_snapshot,
           o.delivery_contact_phone,
           d.id AS delivery_id,
           d.status AS delivery_status,
           CASE
             WHEN (latest_decision.status = 'ACCEPTED' OR d.status IN ('PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED')) THEN TRUE
             ELSE FALSE
           END AS rider_accepted,
           CASE
             WHEN (latest_decision.status = 'ACCEPTED' OR d.status IN ('PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED')) AND r.id IS NOT NULL THEN
               json_build_object(
                 'id', r.id,
                 'firstName', ru.first_name,
                 'lastName', ru.last_name,
                 'username', ru.username,
                 'phoneNumber', ru.phone_number,
                 'vehicleType', COALESCE(vt.name, vt.code::text, 'Motorcycle'),
                 'vehicleRegistration', v.registration_number
               )
             ELSE NULL
           END AS rider_info,
           COALESCE(
             json_agg(
               json_build_object(
                 'productId', oi.product_id,
                 'name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.unit_price_amount,
                 'subtotal', oi.subtotal_amount
               )
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM public.orders o
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.deliveries d ON d.order_id = o.id
    LEFT JOIN public.riders r ON r.id = d.rider_id
    LEFT JOIN public.users ru ON ru.id = r.user_id
    LEFT JOIN public.vehicles v ON v.id = d.vehicle_id
    LEFT JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id
    LEFT JOIN LATERAL (
      SELECT dad.status
      FROM public.delivery_assignment_decisions dad
      WHERE dad.delivery_id = d.id AND dad.rider_id = d.rider_id
      ORDER BY dad.created_at DESC
      LIMIT 1
    ) latest_decision ON TRUE
    WHERE o.user_id = $1 AND o.id = $2
    GROUP BY o.id, o.status, o.created_at, o.subtotal_amount, o.delivery_fee_amount, o.platform_fee_amount, o.business_fee_amount, o.total_amount, o.economic_snapshot, o.delivery_contact_phone, d.id, d.status, latest_decision.status, r.id, ru.first_name, ru.last_name, ru.username, ru.phone_number, vt.name, vt.code, v.registration_number
  `, [userId, orderId]);

  if (result.rows.length === 0) {
    throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  }

  return serializeOrderRow(result.rows[0]);
}

export async function cancelCustomerOrderBeforePayment(
  userId: string,
  orderId: string,
  reason?: string
) {
  return withTransaction(async (client) => {
    const orderRes = await client.query<{ id: string; status: string; user_id: string }>(
      `SELECT id, status, user_id FROM public.orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [orderId, userId]
    );

    if (orderRes.rows.length === 0) {
      throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
    }

    const order = orderRes.rows[0];
    if (order.status !== "PENDING") {
      throw new AppError(
        `Order is in status ${order.status} and cannot be cancelled before payment. Only unpaid pending orders can be cancelled.`,
        409,
        "ORDER_NOT_CANCELLABLE"
      );
    }

    const cancelReason = reason || "Customer cancelled order before payment.";

    // 1. Update order status to CANCELLED
    await client.query(
      `
        UPDATE public.orders
        SET status = 'CANCELLED',
            cancelled_by = 'CUSTOMER',
            cancellation_reason = 'CUSTOMER_REQUEST',
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [orderId]
    );

    // 2. Release reserved inventory
    const reservations = await client.query<{ id: string; inventory_id: string; quantity: number }>(
      `
        SELECT id, inventory_id, quantity
        FROM public.inventory_reservations
        WHERE order_id = $1 AND status = 'ACTIVE'
        FOR UPDATE
      `,
      [orderId]
    );

    for (const res of reservations.rows) {
      await client.query(
        `
          UPDATE public.inventory
          SET quantity_reserved = GREATEST(0, quantity_reserved - $1),
              updated_at = NOW(),
              last_updated_at = NOW()
          WHERE id = $2
        `,
        [res.quantity, res.inventory_id]
      );

      await client.query(
        `UPDATE public.inventory_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = $1`,
        [res.id]
      );

      await client.query(
        `
          INSERT INTO public.inventory_reservation_history
            (reservation_id, previous_status, new_status, quantity, changed_by, reason)
          VALUES ($1, 'ACTIVE', 'RELEASED', $2, $3, 'Customer cancelled order before payment.')
        `,
        [res.id, res.quantity, userId]
      );
    }

    // 3. Cancel fulfillments and deliveries
    await client.query(
      `UPDATE public.fulfillments SET status = 'FAILED', failed_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE public.deliveries SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = $1`,
      [orderId]
    );

    // 4. Update payments and payment attempts to FAILED
    await client.query(
      `
        UPDATE public.payment_attempts
        SET status = 'FAILED',
            failure_reason = 'Order cancelled by customer before payment.',
            completed_at = NOW()
        WHERE payment_id IN (SELECT id FROM public.payments WHERE order_id = $1)
          AND status IN ('INITIATED', 'PENDING')
      `,
      [orderId]
    );

    await client.query(
      `
        UPDATE public.payments
        SET status = 'FAILED',
            updated_at = NOW()
        WHERE order_id = $1 AND status = 'PENDING'
      `,
      [orderId]
    );

    // 5. Record order status history
    await client.query(
      `
        INSERT INTO public.order_status_history (
          order_id,
          previous_status,
          new_status,
          changed_by,
          reason
        )
        VALUES ($1, 'PENDING', 'CANCELLED', $2, $3)
      `,
      [orderId, userId, cancelReason]
    );

    // 6. In-app notification
    try {
      await createInAppNotification({
        userId,
        orderId,
        type: "ORDER_CANCELLED",
        title: "Order Cancelled",
        message: `Your order #${orderId.slice(-8)} was cancelled successfully.`,
        eventKey: `customer-cancelled:${orderId}:${Date.now()}`,
        client
      });
    } catch {
      // non-blocking
    }

    return {
      orderId,
      status: "CANCELLED",
      message: "Order cancelled successfully."
    };
  });
}

/**
 * Sweeps all unpaid abandoned orders in status PENDING.
 * If an order is older than maxAgeMinutes OR all its reservations have expired,
 * it is transitioned to CANCELLED, stock is released, and payments are marked FAILED.
 */
export async function sweepAbandonedPendingOrders(maxAgeMinutes: number = 15): Promise<{
  sweptCount: number;
  orderIds: string[];
}> {
  return withTransaction(async (client) => {
    const pendingOrdersRes = await client.query<{
      id: string;
      user_id: string;
      created_at: string;
    }>(
      `
        SELECT o.id, o.user_id, o.created_at
        FROM public.orders o
        WHERE o.status = 'PENDING'
          AND (
            o.created_at <= NOW() - ($1 || ' minutes')::interval
            OR NOT EXISTS (
              SELECT 1 FROM public.inventory_reservations ir
              WHERE ir.order_id = o.id AND ir.status = 'ACTIVE' AND (ir.expires_at IS NULL OR ir.expires_at > NOW())
            )
          )
        FOR UPDATE SKIP LOCKED
      `,
      [maxAgeMinutes]
    );

    const sweptOrderIds: string[] = [];

    for (const order of pendingOrdersRes.rows) {
      const orderId = order.id;
      const userId = order.user_id;

      // 1. Release active reservations if any still active
      const activeReservations = await client.query<{ id: string; inventory_id: string; quantity: number }>(
        `
          SELECT id, inventory_id, quantity
          FROM public.inventory_reservations
          WHERE order_id = $1 AND status = 'ACTIVE'
          FOR UPDATE
        `,
        [orderId]
      );

      for (const res of activeReservations.rows) {
        await client.query(
          `
            UPDATE public.inventory
            SET quantity_reserved = GREATEST(0, quantity_reserved - $1),
                updated_at = NOW(),
                last_updated_at = NOW()
            WHERE id = $2
          `,
          [res.quantity, res.inventory_id]
        );

        await client.query(
          `UPDATE public.inventory_reservations SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
          [res.id]
        );

        await client.query(
          `
            INSERT INTO public.inventory_reservation_history
              (reservation_id, previous_status, new_status, quantity, changed_by, reason)
            VALUES ($1, 'ACTIVE', 'EXPIRED', $2, NULL, 'Reservation expired - order abandoned before payment.')
          `,
          [res.id, res.quantity]
        );
      }

      // 2. Mark order CANCELLED (cancellation_reason = 'OTHER', cancelled_by = 'SYSTEM')
      await client.query(
        `
          UPDATE public.orders
          SET status = 'CANCELLED',
              cancelled_by = 'SYSTEM',
              cancellation_reason = 'OTHER',
              cancelled_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [orderId]
      );

      // 3. Status history
      await client.query(
        `
          INSERT INTO public.order_status_history (
            order_id,
            previous_status,
            new_status,
            changed_by,
            reason
          )
          VALUES ($1, 'PENDING', 'CANCELLED', NULL, 'Order abandoned - payment window expired after ' || $2 || ' minutes.')
        `,
        [orderId, maxAgeMinutes]
      );

      // 4. Cancel fulfillment & delivery
      await client.query(
        `UPDATE public.fulfillments SET status = 'FAILED', failed_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
        [orderId]
      );
      await client.query(
        `UPDATE public.deliveries SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = $1`,
        [orderId]
      );

      // 5. Fail pending payments & attempts
      await client.query(
        `
          UPDATE public.payment_attempts
          SET status = 'FAILED',
              failure_reason = 'Payment expired / order abandoned.',
              completed_at = NOW()
          WHERE payment_id IN (SELECT id FROM public.payments WHERE order_id = $1)
            AND status IN ('INITIATED', 'PENDING')
        `,
        [orderId]
      );
      await client.query(
        `
          UPDATE public.payments
          SET status = 'FAILED',
              updated_at = NOW()
          WHERE order_id = $1 AND status = 'PENDING'
        `,
        [orderId]
      );

      // 6. In-app notification
      try {
        await createInAppNotification({
          userId,
          orderId,
          type: "ORDER_CANCELLED",
          title: "Order Expired",
          message: `Your pending order #${orderId.slice(-8)} was cancelled because payment was not completed within the time limit.`,
          eventKey: `order-abandoned:${orderId}`,
          client,
        });
      } catch {
        // non-blocking
      }

      sweptOrderIds.push(orderId);
    }

    return {
      sweptCount: sweptOrderIds.length,
      orderIds: sweptOrderIds,
    };
  });
}

function requestHash(input: PlaceOrderInput): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function throwPlacementError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  const code = error instanceof Error ? error.message : "";

  if (code === "CART_NOT_FOUND" || code === "CART_NOT_ACTIVE") {
    throw new AppError(
      "The customer does not have an active cart.",
      409,
      "INVALID_CART"
    );
  }

  if (code === "CART_EMPTY") {
    throw new AppError("Your cart is empty.", 400, "CART_EMPTY");
  }

  if (code === "NO_FULFILLING_BUSINESS") {
    throw new AppError(
      "No single business can fulfill your entire order within 20 km.",
      409,
      "NO_FULFILLING_BUSINESS"
    );
  }

  throw error;
}

export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
  idempotencyKey: string
) {
  if (!idempotencyKey || idempotencyKey.length > 255) {
    throw new AppError(
      "A valid Idempotency-Key header is required.",
      400,
      "IDEMPOTENCY_KEY_REQUIRED"
    );
  }

  return withTransaction(async (client) => {
    const hash = requestHash(input);
    const existing = await client.query<{
      request_hash: string;
      response_status: number | null;
      response_body: unknown;
    }>(
      `
        SELECT request_hash, response_status, response_body
        FROM public.idempotency_keys
        WHERE user_id = $1
          AND idempotency_key = $2
        FOR UPDATE
      `,
      [userId, idempotencyKey]
    );

    if (existing.rows.length > 0) {
      const record = existing.rows[0];

      if (record.request_hash !== hash) {
        throw new AppError(
          "This idempotency key was used with a different request.",
          409,
          "IDEMPOTENCY_KEY_REUSED"
        );
      }

      if (record.response_body) {
        return record.response_body;
      }

      throw new AppError(
        "This order request is already being processed.",
        409,
        "IDEMPOTENCY_REQUEST_IN_PROGRESS"
      );
    }

    const insertResult = await client.query(
      `
        INSERT INTO public.idempotency_keys (
          user_id,
          idempotency_key,
          endpoint,
          request_hash,
          expires_at
        )
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
      `,
      [userId, idempotencyKey, IDEMPOTENCY_ENDPOINT, hash]
    );

    if (insertResult.rowCount === 0) {
      const concurrent = await client.query<{
        request_hash: string;
        response_body: unknown;
      }>(
        `
          SELECT request_hash, response_body
          FROM public.idempotency_keys
          WHERE user_id = $1
            AND idempotency_key = $2
          FOR UPDATE
        `,
        [userId, idempotencyKey]
      );
      const record = concurrent.rows[0];

      if (!record || record.request_hash !== hash) {
        throw new AppError(
          "This idempotency key was used with a different request.",
          409,
          "IDEMPOTENCY_KEY_REUSED"
        );
      }

      if (record.response_body) {
        return record.response_body;
      }

      throw new AppError(
        "This order request is already being processed.",
        409,
        "IDEMPOTENCY_REQUEST_IN_PROGRESS"
      );
    }

    let cart;
    try {
      cart = await lockActiveCart(client, userId);
    } catch (error) {
      throwPlacementError(error);
    }

    let business;
    try {
      business = await selectBusiness(
        client,
        input.latitude,
        input.longitude,
        cart.items
      );
    } catch (error) {
      throwPlacementError(error);
    }

    const productById = new Map(
      business.products.map((product) => [product.productId, product])
    );
    const orderTotals = cart.items.reduce(
      (totals, item) => {
        const product = productById.get(item.productId);

        if (!product) {
          throw new AppError(
            "The cart contains a product that cannot be fulfilled.",
            409,
            "INVALID_CART"
          );
        }

        const subtotal = product.priceAmount * item.quantity;
        totals.subtotal += subtotal;
        totals.items.push({
          productId: item.productId,
          productName: product.productName,
          quantity: item.quantity,
          unitPriceAmount: product.priceAmount,
          subtotalAmount: subtotal
        });
        return totals;
      },
      {
        subtotal: 0,
        items: [] as Array<{
          productId: string;
          productName: string;
          quantity: number;
          unitPriceAmount: number;
          subtotalAmount: number;
        }>
      }
    );

    const pricing = calculateDeliveryPricing(business.distanceMeters);
    if (!pricing.isWithinServiceLimit) {
      throw new AppError(
        "Delivery location exceeds our maximum 20 km road service limit.",
        400,
        "OUT_OF_SERVICE_AREA",
        true
      );
    }
    const deliveryFeeAmount = pricing.deliveryFee;
    const platformFeeAmount = pricing.customerServiceFee; // 150
    const vatAmount = 0;
    const totalAmount = orderTotals.subtotal + deliveryFeeAmount + platformFeeAmount;

    // Snapshot immutable economic assumptions for this order
    const economicSnapshot = buildOrderEconomicSnapshot({
      pricing,
      orderSubtotal: orderTotals.subtotal,
      merchantCommissionRate: 0.10,
    });

    if (economicSnapshot.contribution_state === "ECONOMICALLY_UNVIABLE") {
      throw new AppError(
        "Order cannot be placed because fulfilment economics exceed acceptable pilot tolerance.",
        400,
        "ORDER_ECONOMICALLY_UNVIABLE",
        true
      );
    }

    const orderResult = await client.query<{ id: string }>(
      `
        INSERT INTO public.orders (
          user_id,
          status,
          delivery_address_line,
          delivery_city,
          delivery_state,
          delivery_contact_phone,
          delivery_location,
          subtotal_amount,
          delivery_fee_amount,
          platform_fee_amount,
          business_fee_amount,
          total_amount,
          currency,
          economic_snapshot
        )
        VALUES (
          $1,
          'PENDING',
          $2,
          $3,
          $4,
          $5,
          ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
          $8,
          $9,
          $10,
          $11,
          $12,
          'NGN',
          $13
        )
        RETURNING id
      `,
      [
        userId,
        input.deliveryAddressLine,
        input.deliveryCity,
        input.deliveryState,
        input.deliveryContactPhone,
        input.latitude,
        input.longitude,
        orderTotals.subtotal,
        deliveryFeeAmount,
        platformFeeAmount,
        0,
        totalAmount,
        JSON.stringify(economicSnapshot)
      ]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of orderTotals.items) {
      await client.query(
        `
          INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price_amount,
            subtotal_amount,
            currency
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'NGN')
        `,
        [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPriceAmount,
          item.subtotalAmount
        ]
      );
    }

    const fulfillmentResult = await client.query<{ id: string }>(
      `
        INSERT INTO public.fulfillments (
          order_id,
          business_id,
          status,
          confirmed_at
        )
        VALUES ($1, $2, 'CONFIRMED', NOW())
        RETURNING id
      `,
      [orderId, business.businessId]
    );
    const fulfillmentId = fulfillmentResult.rows[0].id;

    await client.query(
      `
        INSERT INTO public.fulfillment_attempts (
          fulfillment_id,
          business_id,
          status,
          distance_meters,
          evaluated_at,
          completed_at,
          outcome_reason,
          outcome_details,
          evaluated_distance_meters,
          evaluation_radius_meters
        )
        VALUES (
  $1,
  $2,
  'RESERVED',
  $3::integer,
  NOW(),
  NOW(),
  NULL,
  NULL,
  $3::numeric,
  $4::numeric
)
      `,
      [
        fulfillmentId,
        business.businessId,
        business.distanceMeters,
        business.searchRadiusMeters
      ]
    );

    for (const item of cart.items) {
      const product = productById.get(item.productId);

      if (!product) {
        throw new AppError(
          "The cart contains a product that cannot be fulfilled.",
          409,
          "INVALID_CART"
        );
      }

      const inventoryResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM public.inventory
          WHERE business_product_id = $1
          FOR UPDATE
        `,
        [product.businessProductId]
      );
      const inventory = inventoryResult.rows[0];

      await client.query(
        `
          INSERT INTO public.inventory_reservations (
            inventory_id,
            order_id,
            quantity,
            status,
            expires_at
          )
          VALUES ($1, $2, $3, 'ACTIVE', NOW() + INTERVAL '30 minutes')
        `,
        [inventory.id, orderId, item.quantity]
      );

      const reservationUpdate = await client.query(
        `
          UPDATE public.inventory
          SET quantity_reserved = quantity_reserved + $1,
              updated_at = NOW(),
              last_updated_at = NOW()
          WHERE id = $2
            AND quantity_reserved + $1 <= quantity_on_hand
        `,
        [item.quantity, inventory.id]
      );

      if (reservationUpdate.rowCount !== 1) {
        throw new AppError(
          "Inventory is no longer available for this order.",
          409,
          "INSUFFICIENT_INVENTORY"
        );
      }
    }

    await client.query(
      `
        INSERT INTO public.order_status_history (
          order_id,
          previous_status,
          new_status,
          changed_by,
          reason
        )
        VALUES ($1, NULL, 'PENDING', $2, 'Order placed; awaiting payment.')
      `,
      [orderId, userId]
    );

    await client.query(
      `
        INSERT INTO public.fulfillment_status_history (
          fulfillment_id,
          previous_status,
          new_status,
          changed_by,
          reason
        )
        VALUES ($1, NULL, 'CONFIRMED', $2, 'Business selected and inventory reserved.')
      `,
      [fulfillmentId, userId]
    );

    const paymentResult = await client.query<{ id: string }>(
      `
        INSERT INTO public.payments (
          order_id,
          status,
          amount,
          currency
        )
        VALUES ($1, 'PENDING', $2, 'NGN')
        RETURNING id
      `,
      [orderId, totalAmount]
    );
    const paymentId = paymentResult.rows[0].id;

    const attemptResult = await client.query<{ id: string }>(
      `
        INSERT INTO public.payment_attempts (
          payment_id,
          status,
          amount,
          currency
        )
        VALUES ($1, 'INITIATED', $2, 'NGN')
        RETURNING id
      `,
      [paymentId, totalAmount]
    );

    await client.query(
      `
        INSERT INTO public.payment_status_history (
          payment_id,
          previous_status,
          new_status,
          changed_by,
          reason
        )
        VALUES ($1, NULL, 'PENDING', $2, 'Payment awaits provider initialization.')
      `,
      [paymentId, userId]
    );

    await client.query(
      `
        INSERT INTO public.payment_attempt_status_history (
          payment_attempt_id,
          previous_status,
          new_status,
          changed_by,
          reason
        )
        VALUES ($1, NULL, 'INITIATED', $2, 'Payment attempt created; no charge made.')
      `,
      [attemptResult.rows[0].id, userId]
    );

    await client.query(
      `
        INSERT INTO public.inventory_reservation_history (
          reservation_id,
          previous_status,
          new_status,
          quantity,
          changed_by,
          reason
        )
        SELECT id, NULL, 'ACTIVE', quantity, $2, 'Reserved during order placement.'
        FROM public.inventory_reservations
        WHERE order_id = $1
      `,
      [orderId, userId]
    );

    await client.query(
      `
        UPDATE public.carts
        SET status = 'CHECKED_OUT',
            checked_out_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [cart.id]
    );

    const response = {
      orderId,
      status: "PENDING",
      fulfillment: {
        fulfillmentId,
        businessId: business.businessId,
        businessName: business.businessName,
        distanceMeters: business.distanceMeters,
        searchRadiusMeters: business.searchRadiusMeters,
        status: "CONFIRMED"
      },
      payment: {
        paymentId,
        paymentAttemptId: attemptResult.rows[0].id,
        status: "PENDING",
        amount: totalAmount,
        charged: false
      },
      pricing: {
        currency: "NGN",
        subtotalAmount: orderTotals.subtotal,
        deliveryFeeAmount,
        platformFeeAmount,
        vatAmount,
        totalAmount
      },
      items: orderTotals.items
    };

    // Pre-Payment Safeguard (Critical Fix):
    // The order remains strictly PENDING until a verified payment webhook confirms success.
    // We do NOT emit merchant notification events before payment clears.
    // Merchant will only be alerted once payment clears via PAYMENT_SUCCESSFUL outbox event.

    // In-app notification for the customer confirming the order was placed (safeguarded)
    try {
      await createInAppNotification({
        userId,
        orderId,
        type: "ORDER_CONFIRMED",
        title: "Order Placed",
        message: `Your order #${orderId.slice(0, 8)} has been placed and is awaiting payment confirmation.`,
        eventKey: `order-placed:${orderId}`,
        client,
      });

      // Alert admins of new pending order
      await notifyAdmins({
        type: "ORDER_CONFIRMED",
        title: "New Order Initiated",
        message: `Order #${orderId.slice(0, 8)} was placed and is awaiting payment.`,
        orderId,
        eventKeyPrefix: `admin-order-placed:${orderId}`,
        client,
      });
    } catch (notifyErr) {
      console.warn("[ORDER PLACEMENT NOTIFICATION NON-BLOCKING WARNING]", notifyErr);
    }

    await client.query(
      `
        UPDATE public.idempotency_keys
        SET response_status = 201,
            response_body = $1::jsonb
        WHERE user_id = $2
          AND idempotency_key = $3
      `,
      [JSON.stringify(response), userId, idempotencyKey]
    );

    return response;
  });
}
