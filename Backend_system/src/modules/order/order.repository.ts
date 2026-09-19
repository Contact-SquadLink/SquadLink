import type { PoolClient } from "pg";

import {
  findBusinessProducts,
  findCandidateBusinesses,
  isBusinessCurrentlyOpen,
  type CheckoutBusinessProduct,
  type CheckoutCartItem
} from "../checkout/checkout.repository";

export interface LockedCart {
  id: string;
  status: string;
  items: CheckoutCartItem[];
}

export interface SelectedBusiness {
  businessId: string;
  businessName: string;
  distanceMeters: number;
  searchRadiusMeters: number;
  products: CheckoutBusinessProduct[];
}

interface CartRow {
  id: string;
  status: string;
}

export async function lockActiveCart(
  client: PoolClient,
  userId: string
): Promise<LockedCart> {
  const cartResult = await client.query<CartRow>(
    `
      SELECT id, status
      FROM public.carts
      WHERE user_id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [userId]
  );

  if (cartResult.rows.length === 0) {
    throw new Error("CART_NOT_FOUND");
  }

  const cart = cartResult.rows[0];

  if (cart.status !== "ACTIVE") {
    throw new Error("CART_NOT_ACTIVE");
  }

  const itemResult = await client.query<CheckoutCartItem>(
    `
      SELECT
        ci.product_id AS "productId",
        p.name AS "productName",
        ci.quantity
      FROM public.cart_items ci
      INNER JOIN public.products p
        ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `,
    [cart.id]
  );

  if (itemResult.rows.length === 0) {
    throw new Error("CART_EMPTY");
  }

  return {
    id: cart.id,
    status: cart.status,
    items: itemResult.rows
  };
}

export async function selectBusiness(
  client: PoolClient,
  latitude: number,
  longitude: number,
  items: CheckoutCartItem[]
): Promise<SelectedBusiness> {
  const radii = [2000, 5000, 10000, 20000];
  const productIds = items.map((item) => item.productId);
  const checkedBusinesses = new Set<string>();

  for (const radiusMeters of radii) {
    const candidates = await findCandidateBusinesses(
      latitude,
      longitude,
      radiusMeters,
      client
    );

    for (const candidate of candidates) {
      if (checkedBusinesses.has(candidate.businessId)) {
        continue;
      }

      checkedBusinesses.add(candidate.businessId);

      if (!await isBusinessCurrentlyOpen(candidate.businessId, client)) {
        continue;
      }

      const products = await findBusinessProducts(
        candidate.businessId,
        productIds,
        client
      );

      if (products.length !== items.length) {
        continue;
      }

      const productsById = new Map(
        products.map((product) => [product.productId, product])
      );

      if (items.some((item) => {
        const product = productsById.get(item.productId);
        return !product || !product.isAvailable;
      })) {
        continue;
      }

      const lockedProducts = await lockInventoryRows(
        client,
        products,
        items
      );

      if (!lockedProducts) {
        continue;
      }

      return {
        businessId: candidate.businessId,
        businessName: candidate.businessName,
        distanceMeters: candidate.distanceMeters,
        searchRadiusMeters: radiusMeters,
        products: lockedProducts
      };
    }
  }

  throw new Error("NO_FULFILLING_BUSINESS");
}

async function lockInventoryRows(
  client: PoolClient,
  products: CheckoutBusinessProduct[],
  items: CheckoutCartItem[]
): Promise<CheckoutBusinessProduct[] | null> {
  const orderedProducts = [...products].sort((left, right) =>
    left.businessProductId.localeCompare(right.businessProductId)
  );
  const lockedProducts: CheckoutBusinessProduct[] = [];

  for (const product of orderedProducts) {
    const result = await client.query<{
      quantity_on_hand: number;
      quantity_reserved: number;
    }>(
      `
        SELECT quantity_on_hand, quantity_reserved
        FROM public.inventory
        WHERE business_product_id = $1
        FOR UPDATE
      `,
      [product.businessProductId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const requestedQuantity = items.find(
      (item) => item.productId === product.productId
    )?.quantity ?? 0;
    const inventory = result.rows[0];
    const availableQuantity =
      inventory.quantity_on_hand - inventory.quantity_reserved;

    if (requestedQuantity > availableQuantity) {
      return null;
    }

    lockedProducts.push({
      ...product,
      quantityOnHand: inventory.quantity_on_hand,
      quantityReserved: inventory.quantity_reserved
    });
  }

  return lockedProducts;
}