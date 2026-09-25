import { createHash } from "node:crypto";

import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";
import { AppError } from "../../utils/app-error";
import {
  lockActiveCart,
  selectBusiness
} from "./order.repository";
import type { PlaceOrderInput } from "./order.schemas";

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
    deliveryContactPhone: row.delivery_contact_phone,
    delivery: row.delivery_id ? { id: row.delivery_id, status: row.delivery_status } : null,
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
           o.delivery_contact_phone,
           d.id AS delivery_id,
           d.status AS delivery_status,
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
    WHERE o.user_id = $1
    GROUP BY o.id, o.status, o.created_at, o.subtotal_amount, o.delivery_fee_amount, o.platform_fee_amount, o.business_fee_amount, o.total_amount, o.delivery_contact_phone, d.id, d.status
    ORDER BY o.created_at DESC
  `, [userId]);

  return result.rows.map(serializeOrderRow);
}

export async function getOrderForUser(userId: string, orderId: string) {
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
           o.delivery_contact_phone,
           d.id AS delivery_id,
           d.status AS delivery_status,
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
    WHERE o.user_id = $1 AND o.id = $2
    GROUP BY o.id, o.status, o.created_at, o.subtotal_amount, o.delivery_fee_amount, o.platform_fee_amount, o.business_fee_amount, o.total_amount, o.delivery_contact_phone, d.id, d.status
  `, [userId, orderId]);

  if (result.rows.length === 0) {
    throw new AppError("Order not found.", 404, "ORDER_NOT_FOUND");
  }

  return serializeOrderRow(result.rows[0]);
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

    const platformFeeAmount = 150;
    const deliveryFeeAmount = 0;
    const totalAmount = orderTotals.subtotal + deliveryFeeAmount + platformFeeAmount;

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
          currency
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
          0,
          150,
          150,
          $9,
          'NGN'
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
        totalAmount
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
        totalAmount
      },
      items: orderTotals.items
    };

    await client.query(
      `
        INSERT INTO public.outbox_events (
          event_type,
          aggregate_type,
          aggregate_id,
          payload
        )
        VALUES ('ORDER_PLACED', 'ORDER', $1, $2::jsonb)
      `,
      [orderId, JSON.stringify(response)]
    );

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