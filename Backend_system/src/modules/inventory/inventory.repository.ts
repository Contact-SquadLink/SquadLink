import type { PoolClient } from "pg";

import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";

export interface InventoryRecord {
  id: string;
  businessProductId: string;
  businessId: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  priceAmount: string;
  currency: string;
  isAvailable: boolean;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAdjustmentRecord {
  id: string;
  inventoryId: string;
  quantityChange: number;
  reason: string;
  source: string;
  actorUserId: string | null;
  createdAt: string;
}

interface InventoryRow {
  id: string;
  business_product_id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  category_id: string;
  category_name: string;
  price_amount: string;
  currency: string;
  is_available: boolean;
  quantity_on_hand: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface InventoryAdjustmentRow {
  id: string;
  inventory_id: string;
  quantity_change: number;
  reason: string;
  source: string;
  actor_user_id: string | null;
  created_at: Date;
}

function mapInventory(
  row: InventoryRow
): InventoryRecord {
  return {
    id: row.id,
    businessProductId:
      row.business_product_id,
    businessId: row.business_id,
    productId: row.product_id,
    productName: row.product_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    priceAmount: row.price_amount,
    currency: row.currency.trim(),
    isAvailable: row.is_available,
    quantityOnHand: row.quantity_on_hand,
    quantityReserved: row.quantity_reserved,
    quantityAvailable:
      row.quantity_on_hand -
      row.quantity_reserved,
    lowStockThreshold:
      row.low_stock_threshold,
    lastUpdatedAt:
      row.last_updated_at.toISOString(),
    createdAt:
      row.created_at.toISOString(),
    updatedAt:
      row.updated_at.toISOString()
  };
}

function mapInventoryAdjustment(
  row: InventoryAdjustmentRow
): InventoryAdjustmentRecord {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    quantityChange:
      row.quantity_change,
    reason: row.reason,
    source: row.source,
    actorUserId:
      row.actor_user_id,
    createdAt:
      row.created_at.toISOString()
  };
}

const inventorySelect = `
  SELECT
    i.id,
    i.business_product_id,
    bp.business_id,
    bp.product_id,
    p.name AS product_name,
    p.category_id,
    c.name AS category_name,
    bp.price_amount,
    bp.currency,
    bp.is_available,
    i.quantity_on_hand,
    i.quantity_reserved,
    i.low_stock_threshold,
    i.last_updated_at,
    i.created_at,
    i.updated_at
  FROM public.inventory i
  INNER JOIN public.business_products bp
    ON bp.id = i.business_product_id
  INNER JOIN public.products p
    ON p.id = bp.product_id
  INNER JOIN public.categories c
    ON c.id = p.category_id
`;

export async function findInventoryByBusinessProductId(
  businessProductId: string
): Promise<InventoryRecord | null> {
  const result =
    await db.query<InventoryRow>(
      `
        ${inventorySelect}
        WHERE i.business_product_id = $1
      `,
      [businessProductId]
    );

  if (result.rows.length === 0) {
    return null;
  }

  return mapInventory(result.rows[0]);
}

export async function findInventoryById(
  inventoryId: string
): Promise<InventoryRecord | null> {
  const result =
    await db.query<InventoryRow>(
      `
        ${inventorySelect}
        WHERE i.id = $1
      `,
      [inventoryId]
    );

  if (result.rows.length === 0) {
    return null;
  }

  return mapInventory(result.rows[0]);
}

export async function findInventoryForBusiness(
  businessId: string
): Promise<InventoryRecord[]> {
  const result =
    await db.query<InventoryRow>(
      `
        ${inventorySelect}
        WHERE bp.business_id = $1
        ORDER BY p.name ASC
      `,
      [businessId]
    );

  return result.rows.map(mapInventory);
}

export async function findBusinessProductForOwner(
  businessProductId: string,
  ownerUserId: string
): Promise<{
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  isAvailable: boolean;
} | null> {
  const result = await db.query<{
    id: string;
    business_id: string;
    product_id: string;
    product_name: string;
    is_available: boolean;
  }>(
    `
      SELECT
        bp.id,
        bp.business_id,
        bp.product_id,
        p.name AS product_name,
        bp.is_available
      FROM public.business_products bp
      INNER JOIN public.businesses b
        ON b.id = bp.business_id
      INNER JOIN public.products p
        ON p.id = bp.product_id
      WHERE bp.id = $1
        AND b.owner_user_id = $2
    `,
    [
      businessProductId,
      ownerUserId
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    productName: row.product_name,
    isAvailable: row.is_available
  };
}

export async function createInventory(
  businessProductId: string,
  quantityOnHand: number,
  lowStockThreshold: number,
  actorUserId: string
): Promise<InventoryRecord> {
  return withTransaction(
    async (client: PoolClient) => {
      const businessProductResult =
        await client.query<{
          id: string;
          business_id: string;
          product_id: string;
        }>(
          `
            SELECT
              bp.id,
              bp.business_id,
              bp.product_id
            FROM public.business_products bp
            INNER JOIN public.businesses b
              ON b.id = bp.business_id
            WHERE bp.id = $1
              AND b.owner_user_id = $2
            FOR UPDATE OF bp
          `,
          [
            businessProductId,
            actorUserId
          ]
        );

      if (
        businessProductResult.rows.length === 0
      ) {
        throw new Error(
          "BUSINESS_PRODUCT_NOT_FOUND"
        );
      }

      const businessProduct =
        businessProductResult.rows[0];

      const existing =
        await client.query(
          `
            SELECT id
            FROM public.inventory
            WHERE business_product_id = $1
            FOR UPDATE
          `,
          [businessProductId]
        );

      if (existing.rows.length > 0) {
        throw new Error(
          "INVENTORY_ALREADY_EXISTS"
        );
      }

      const inventoryResult =
        await client.query<{
          id: string;
        }>(
          `
            INSERT INTO public.inventory (
              business_product_id,
              quantity_on_hand,
              quantity_reserved,
              low_stock_threshold,
              last_updated_at
            )
            VALUES (
              $1,
              $2,
              0,
              $3,
              NOW()
            )
            RETURNING id
          `,
          [
            businessProductId,
            quantityOnHand,
            lowStockThreshold
          ]
        );

      const inventoryId =
        inventoryResult.rows[0].id;

      await client.query(
        `
          INSERT INTO public.inventory_adjustments (
            inventory_id,
            quantity_change,
            reason,
            source,
            actor_user_id
          )
          VALUES (
            $1,
            $2,
            'RESTOCK',
            'BUSINESS',
            $3
          )
        `,
        [
          inventoryId,
          quantityOnHand,
          actorUserId
        ]
      );

      const businessReadinessResult =
        await client.query<{
          inventory_configured: boolean;
        }>(
          `
            SELECT
              inventory_configured
            FROM public.businesses
            WHERE id = $1
            FOR UPDATE
          `,
          [businessProduct.business_id]
        );

      if (
        businessReadinessResult.rows.length === 0
      ) {
        throw new Error(
          "BUSINESS_NOT_FOUND"
        );
      }

      const inventoryConfigured =
        businessReadinessResult.rows[0]
          .inventory_configured;

      if (!inventoryConfigured) {
        await client.query(
          `
            UPDATE public.businesses
            SET
              inventory_configured = TRUE,
              inventory_configured_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
          `,
          [businessProduct.business_id]
        );

        await client.query(
          `
            INSERT INTO public.business_readiness_history (
              business_id,
              field_name,
              previous_value,
              new_value,
              changed_by,
              reason
            )
            VALUES (
              $1,
              'INVENTORY_CONFIGURED',
              FALSE,
              TRUE,
              $2,
              'Inventory configured for the business catalog.'
            )
          `,
          [
            businessProduct.business_id,
            actorUserId
          ]
        );
      }

      await client.query(
        `
          UPDATE public.businesses
          SET
            onboarding_completed = TRUE,
            onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
            updated_at = NOW()
          WHERE id = $1
            AND operating_hours_configured = TRUE
            AND catalog_configured = TRUE
            AND inventory_configured = TRUE
            AND onboarding_completed = FALSE
        `,
        [businessProduct.business_id]
      );

      const result =
        await client.query<InventoryRow>(
          `
            ${inventorySelect}
            WHERE i.id = $1
          `,
          [inventoryId]
        );

      return mapInventory(
        result.rows[0]
      );
    }
  );
}

export async function updateInventory(
  inventoryId: string,
  ownerUserId: string,
  quantityOnHand:
    | number
    | undefined,
  lowStockThreshold:
    | number
    | undefined
): Promise<InventoryRecord> {
  return withTransaction(
    async (client: PoolClient) => {
      const inventoryResult =
        await client.query<{
          id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
        }>(
          `
            SELECT
              i.id,
              i.quantity_on_hand,
              i.quantity_reserved
            FROM public.inventory i
            INNER JOIN public.business_products bp
              ON bp.id = i.business_product_id
            INNER JOIN public.businesses b
              ON b.id = bp.business_id
            WHERE i.id = $1
              AND b.owner_user_id = $2
            FOR UPDATE OF i
          `,
          [
            inventoryId,
            ownerUserId
          ]
        );

      if (inventoryResult.rows.length === 0) {
        throw new Error(
          "INVENTORY_NOT_FOUND"
        );
      }

      const current =
        inventoryResult.rows[0];

      const newQuantityOnHand =
        quantityOnHand ??
        current.quantity_on_hand;

      const newLowStockThreshold =
        lowStockThreshold;

      if (
        newQuantityOnHand <
        current.quantity_reserved
      ) {
        throw new Error(
          "QUANTITY_BELOW_RESERVED"
        );
      }

      await client.query(
        `
          UPDATE public.inventory
          SET
            quantity_on_hand = $1,
            low_stock_threshold =
              COALESCE(
                $2,
                low_stock_threshold
              ),
            last_updated_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
        `,
        [
          newQuantityOnHand,
          newLowStockThreshold ?? null,
          inventoryId
        ]
      );

      if (
        quantityOnHand !== undefined &&
        quantityOnHand !==
          current.quantity_on_hand
      ) {
        await client.query(
          `
            INSERT INTO public.inventory_adjustments (
              inventory_id,
              quantity_change,
              reason,
              source,
              actor_user_id
            )
            VALUES (
              $1,
              $2,
              'COUNT_CORRECTION',
              'BUSINESS',
              $3
            )
          `,
          [
            inventoryId,
            quantityOnHand -
              current.quantity_on_hand,
            ownerUserId
          ]
        );
      }

      const result =
        await client.query<InventoryRow>(
          `
            ${inventorySelect}
            WHERE i.id = $1
          `,
          [inventoryId]
        );

      return mapInventory(
        result.rows[0]
      );
    }
  );
}

export async function createInventoryAdjustment(
  inventoryId: string,
  ownerUserId: string,
  quantityChange: number,
  reason: string
): Promise<{
  inventory: InventoryRecord;
  adjustment: InventoryAdjustmentRecord;
}> {
  return withTransaction(
    async (client: PoolClient) => {
      const inventoryResult =
        await client.query<{
          id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
        }>(
          `
            SELECT
              i.id,
              i.quantity_on_hand,
              i.quantity_reserved
            FROM public.inventory i
            INNER JOIN public.business_products bp
              ON bp.id = i.business_product_id
            INNER JOIN public.businesses b
              ON b.id = bp.business_id
            WHERE i.id = $1
              AND b.owner_user_id = $2
            FOR UPDATE OF i
          `,
          [
            inventoryId,
            ownerUserId
          ]
        );

      if (inventoryResult.rows.length === 0) {
        throw new Error(
          "INVENTORY_NOT_FOUND"
        );
      }

      const current =
        inventoryResult.rows[0];

      const newQuantity =
        current.quantity_on_hand +
        quantityChange;

      if (newQuantity < 0) {
        throw new Error(
          "INSUFFICIENT_STOCK"
        );
      }

      if (
        newQuantity <
        current.quantity_reserved
      ) {
        throw new Error(
          "QUANTITY_BELOW_RESERVED"
        );
      }

      await client.query(
        `
          UPDATE public.inventory
          SET
            quantity_on_hand = $1,
            last_updated_at = NOW(),
            updated_at = NOW()
          WHERE id = $2
        `,
        [
          newQuantity,
          inventoryId
        ]
      );

      const adjustmentResult =
        await client.query<InventoryAdjustmentRow>(
          `
            INSERT INTO public.inventory_adjustments (
              inventory_id,
              quantity_change,
              reason,
              source,
              actor_user_id
            )
            VALUES (
              $1,
              $2,
              $3,
              'BUSINESS',
              $4
            )
            RETURNING
              id,
              inventory_id,
              quantity_change,
              reason,
              source,
              actor_user_id,
              created_at
          `,
          [
            inventoryId,
            quantityChange,
            reason,
            ownerUserId
          ]
        );

      const updatedInventory =
        await client.query<InventoryRow>(
          `
            ${inventorySelect}
            WHERE i.id = $1
          `,
          [inventoryId]
        );

      return {
        inventory:
          mapInventory(
            updatedInventory.rows[0]
          ),
        adjustment:
          mapInventoryAdjustment(
            adjustmentResult.rows[0]
          )
      };
    }
  );
}

export async function findInventoryAdjustments(
  inventoryId: string,
  ownerUserId: string
): Promise<InventoryAdjustmentRecord[]> {
  const ownership =
    await db.query(
      `
        SELECT i.id
        FROM public.inventory i
        INNER JOIN public.business_products bp
          ON bp.id = i.business_product_id
        INNER JOIN public.businesses b
          ON b.id = bp.business_id
        WHERE i.id = $1
          AND b.owner_user_id = $2
      `,
      [
        inventoryId,
        ownerUserId
      ]
    );

  if (ownership.rows.length === 0) {
    throw new Error(
      "INVENTORY_NOT_FOUND"
    );
  }

  const result =
    await db.query<InventoryAdjustmentRow>(
      `
        SELECT
          id,
          inventory_id,
          quantity_change,
          reason,
          source,
          actor_user_id,
          created_at
        FROM public.inventory_adjustments
        WHERE inventory_id = $1
        ORDER BY created_at DESC
      `,
      [inventoryId]
    );

  return result.rows.map(
    mapInventoryAdjustment
  );
}