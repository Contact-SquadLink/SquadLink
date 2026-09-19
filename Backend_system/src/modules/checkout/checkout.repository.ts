import { db } from "../../db/database";
import type { PoolClient } from "pg";

type QueryClient = typeof db | PoolClient;

export interface CheckoutCartItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface CheckoutBusinessCandidate {
  businessId: string;
  businessName: string;
  distanceMeters: number;
}

export interface CheckoutBusinessProduct {
  businessId: string;
  productId: string;
  businessProductId: string;
  productName: string;
  priceAmount: number;
  isAvailable: boolean;
  quantityOnHand: number;
  quantityReserved: number;
}

export async function findActiveCartItems(
  userId: string,
  client: QueryClient = db
): Promise<CheckoutCartItem[]> {
  const result = await client.query<{
    product_id: string;
    product_name: string;
    quantity: number;
  }>(
    `
      SELECT
        ci.product_id,
        p.name AS product_name,
        ci.quantity
      FROM public.carts c
      INNER JOIN public.cart_items ci
        ON ci.cart_id = c.id
      INNER JOIN public.products p
        ON p.id = ci.product_id
      WHERE c.user_id = $1
        AND c.status = 'ACTIVE'
      ORDER BY ci.created_at ASC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity
  }));
}

export async function findCandidateBusinesses(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  client: QueryClient = db
): Promise<CheckoutBusinessCandidate[]> {
  const result = await client.query<{
    business_id: string;
    business_name: string;
    distance_meters: number;
  }>(
    `
      SELECT
        b.id AS business_id,
        b.name AS business_name,

        ST_Distance(
          b.location,
          ST_SetSRID(
            ST_MakePoint($2, $1),
            4326
          )::geography
        ) AS distance_meters

      FROM public.businesses b

      WHERE b.is_active = TRUE
        AND b.status = 'ACTIVE'
        AND b.accepts_orders = TRUE
        AND b.location IS NOT NULL

        AND ST_DWithin(
          b.location,
          ST_SetSRID(
            ST_MakePoint($2, $1),
            4326
          )::geography,
          $3
        )

        AND (
          b.verification_required = FALSE
          OR b.is_verified = TRUE
        )

        AND b.catalog_configured = TRUE
        AND b.inventory_configured = TRUE
        AND b.operating_hours_configured = TRUE

      ORDER BY distance_meters ASC
    `,
    [
      latitude,
      longitude,
      radiusMeters
    ]
  );

  return result.rows.map((row) => ({
    businessId: row.business_id,
    businessName: row.business_name,
    distanceMeters: Math.round(
      Number(row.distance_meters)
    )
  }));
}

export async function findBusinessProducts(
  businessId: string,
  productIds: string[],
  client: QueryClient = db
): Promise<CheckoutBusinessProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const result = await client.query<{
    business_id: string;
    product_id: string;
    business_product_id: string;
    product_name: string;
    price_amount: string;
    is_available: boolean;
    quantity_on_hand: number;
    quantity_reserved: number;
  }>(
    `
      SELECT
        bp.business_id,
        bp.product_id,
        bp.id AS business_product_id,
        p.name AS product_name,
        bp.price_amount::text AS price_amount,
        bp.is_available,

        COALESCE(i.quantity_on_hand, 0)
          AS quantity_on_hand,

        COALESCE(i.quantity_reserved, 0)
          AS quantity_reserved

      FROM public.business_products bp

      INNER JOIN public.products p
        ON p.id = bp.product_id

      LEFT JOIN public.inventory i
        ON i.business_product_id = bp.id

      WHERE bp.business_id = $1
        AND bp.product_id = ANY($2::uuid[])
        AND p.is_active = TRUE
    `,
    [businessId, productIds]
  );

  return result.rows.map((row) => ({
    businessId: row.business_id,
    productId: row.product_id,
    businessProductId: row.business_product_id,
    productName: row.product_name,
    priceAmount: Number(row.price_amount),
    isAvailable: row.is_available,
    quantityOnHand: row.quantity_on_hand,
    quantityReserved: row.quantity_reserved
  }));
}

export async function isBusinessCurrentlyOpen(
  businessId: string,
  client: QueryClient = db
): Promise<boolean> {
  const result = await client.query<{
    is_open: boolean;
  }>(
    `
      WITH current_context AS (
        SELECT
          (NOW() AT TIME ZONE 'Africa/Lagos')::date
            AS current_date,

          EXTRACT(
            DOW FROM
            (NOW() AT TIME ZONE 'Africa/Lagos')
          )::integer AS current_dow,

          (NOW() AT TIME ZONE 'Africa/Lagos')::time
            AS current_time
      ),

      exception AS (
        SELECT
          boe.is_closed,
          boe.opens_at,
          boe.closes_at
        FROM public.business_operating_exceptions boe
        CROSS JOIN current_context cc
        WHERE boe.business_id = $1
          AND boe.exception_date = cc.current_date
        LIMIT 1
      ),

      regular_hours AS (
        SELECT
          boh.is_closed,
          boh.opens_at,
          boh.closes_at
        FROM public.business_operating_hours boh
        CROSS JOIN current_context cc
        WHERE boh.business_id = $1
          AND boh.day_of_week =
            CASE cc.current_dow
              WHEN 0 THEN 'SUNDAY'
              WHEN 1 THEN 'MONDAY'
              WHEN 2 THEN 'TUESDAY'
              WHEN 3 THEN 'WEDNESDAY'
              WHEN 4 THEN 'THURSDAY'
              WHEN 5 THEN 'FRIDAY'
              WHEN 6 THEN 'SATURDAY'
            END::public.day_of_week
        LIMIT 1
      )

      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM exception
          )
          THEN NOT (
            SELECT is_closed
            FROM exception
          )
          AND (
            SELECT opens_at
            FROM exception
          ) <= (
            SELECT current_time
            FROM current_context
          )
          AND (
            SELECT closes_at
            FROM exception
          ) >= (
            SELECT current_time
            FROM current_context
          )

          WHEN EXISTS (
            SELECT 1 FROM regular_hours
          )
          THEN NOT (
            SELECT is_closed
            FROM regular_hours
          )
          AND (
            SELECT opens_at
            FROM regular_hours
          ) <= (
            SELECT current_time
            FROM current_context
          )
          AND (
            SELECT closes_at
            FROM regular_hours
          ) >= (
            SELECT current_time
            FROM current_context
          )

          ELSE FALSE
        END AS is_open
    `,
    [businessId]
  );

  return result.rows[0]?.is_open ?? false;
}