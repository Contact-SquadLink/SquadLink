import { db } from "../../db/database";
import { withTransaction } from "../../db/transaction";

export interface CartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  productPriceAmount: number | null;
  productCurrency: string | null;
  productImageUrl: string | null;
  productIsActive: boolean;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartRecord {
  id: string;
  userId: string;
  status: string;
  checkedOutAt: Date | null;
  abandonedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemRecord[];
}

interface CartRow {
  id: string;
  user_id: string;
  status: string;
  checked_out_at: Date | null;
  abandoned_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  product_description: string | null;
  product_price_amount: string | number | null;
  product_currency: string | null;
  product_image_url: string | null;
  product_is_active: boolean;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

function mapCartItem(row: CartItemRow): CartItemRecord {
  return {
    id: row.id,
    cartId: row.cart_id,
    productId: row.product_id,
    productName: row.product_name,
    productDescription: row.product_description,
    productPriceAmount: row.product_price_amount == null ? null : Number(row.product_price_amount),
    productCurrency: row.product_currency,
    productImageUrl: row.product_image_url,
    productIsActive: row.product_is_active,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCart(
  row: CartRow,
  items: CartItemRecord[]
): CartRecord {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    checkedOutAt: row.checked_out_at,
    abandonedAt: row.abandoned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items
  };
}

async function findCartRowByUserId(
  userId: string
): Promise<CartRow | null> {
  const result = await db.query<CartRow>(
    `
      SELECT
        id,
        user_id,
        status,
        checked_out_at,
        abandoned_at,
        created_at,
        updated_at
      FROM public.carts
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function findCartItems(
  cartId: string
): Promise<CartItemRecord[]> {
  const result = await db.query<CartItemRow>(
    `
      SELECT
        ci.id,
        ci.cart_id,
        ci.product_id,
        p.name AS product_name,
        COALESCE(bp.description, p.description) AS product_description,
        COALESCE(bp.price_amount, p.suggested_price_amount) AS product_price_amount,
        COALESCE(bp.currency, 'NGN') AS product_currency,
        COALESCE(bp.image_url, p.image_url) AS product_image_url,
        p.is_active AS product_is_active,
        ci.quantity,
        ci.created_at,
        ci.updated_at
      FROM public.cart_items ci
      INNER JOIN public.products p
        ON p.id = ci.product_id
      LEFT JOIN LATERAL (
        SELECT
          bp_candidate.description,
          bp_candidate.price_amount,
          bp_candidate.currency,
          bp_candidate.image_url
        FROM public.business_products bp_candidate
        INNER JOIN public.businesses b_candidate
          ON b_candidate.id = bp_candidate.business_id
         AND b_candidate.is_active = TRUE
         AND b_candidate.status = 'ACTIVE'
         AND b_candidate.accepts_orders = TRUE
         AND b_candidate.operating_hours_configured = TRUE
         AND b_candidate.catalog_configured = TRUE
         AND b_candidate.inventory_configured = TRUE
         AND b_candidate.onboarding_completed = TRUE
        WHERE bp_candidate.product_id = p.id
          AND bp_candidate.is_available = TRUE
        ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
        LIMIT 1
      ) bp ON TRUE
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `,
    [cartId]
  );

  return result.rows.map(mapCartItem);
}

async function findCartWithItemsByUserId(
  userId: string
): Promise<CartRecord | null> {
  const cart = await findCartRowByUserId(userId);

  if (!cart) {
    return null;
  }

  const items = await findCartItems(cart.id);

  return mapCart(cart, items);
}

export async function getOrCreateCart(
  userId: string
): Promise<CartRecord> {
  return withTransaction(async (client) => {
    const existing = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE user_id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    let cart: CartRow;

    if (existing.rows.length > 0) {
      cart = existing.rows[0];
    } else {
      const created = await client.query<CartRow>(
        `
          INSERT INTO public.carts (
            user_id
          )
          VALUES ($1)
          RETURNING
            id,
            user_id,
            status,
            checked_out_at,
            abandoned_at,
            created_at,
            updated_at
        `,
        [userId]
      );

      cart = created.rows[0];
    }

    const items = await client.query<CartItemRow>(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          p.name AS product_name,
          COALESCE(bp.description, p.description) AS product_description,
          bp.price_amount AS product_price_amount,
          bp.currency AS product_currency,
          COALESCE(bp.image_url, p.image_url) AS product_image_url,
          p.is_active AS product_is_active,
          ci.quantity,
          ci.created_at,
          ci.updated_at
        FROM public.cart_items ci
        INNER JOIN public.products p
          ON p.id = ci.product_id
        LEFT JOIN LATERAL (
          SELECT bp_candidate.description, bp_candidate.price_amount, bp_candidate.currency, bp_candidate.image_url
          FROM public.business_products bp_candidate
          INNER JOIN public.businesses b_candidate ON b_candidate.id = bp_candidate.business_id
          WHERE bp_candidate.product_id = p.id
            AND bp_candidate.is_available = TRUE
            AND b_candidate.is_active = TRUE
            AND b_candidate.status = 'ACTIVE'
            AND b_candidate.accepts_orders = TRUE
            AND b_candidate.operating_hours_configured = TRUE
            AND b_candidate.catalog_configured = TRUE
            AND b_candidate.inventory_configured = TRUE
          ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
          LIMIT 1
        ) bp ON TRUE
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `,
      [cart.id]
    );

    return mapCart(
      cart,
      items.rows.map(mapCartItem)
    );
  });
}

export async function findProductById(
  productId: string
) {
  const result = await db.query<{
    id: string;
    name: string;
    is_active: boolean;
  }>(
    `
      SELECT
        id,
        name,
        is_active
      FROM public.products
      WHERE id = $1
        AND EXISTS (
          SELECT 1
          FROM public.business_products bp
          INNER JOIN public.businesses b
            ON b.id = bp.business_id
          WHERE bp.product_id = products.id
            AND bp.is_available = TRUE
            AND b.is_active = TRUE
            AND b.status = 'ACTIVE'
            AND b.accepts_orders = TRUE
            AND b.operating_hours_configured = TRUE
            AND b.catalog_configured = TRUE
            AND b.inventory_configured = TRUE
        )
      LIMIT 1
    `,
    [productId]
  );

  return result.rows[0] ?? null;
}

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartRecord> {
  return withTransaction(async (client) => {
    const cartResult = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE user_id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [userId]
    );

    let cart: CartRow;

    if (cartResult.rows.length === 0) {
      const created = await client.query<CartRow>(
        `
          INSERT INTO public.carts (
            user_id
          )
          VALUES ($1)
          RETURNING
            id,
            user_id,
            status,
            checked_out_at,
            abandoned_at,
            created_at,
            updated_at
        `,
        [userId]
      );

      cart = created.rows[0];
    } else {
      cart = cartResult.rows[0];
    }

    if (cart.status !== "ACTIVE") {
      throw new Error("CART_NOT_ACTIVE");
    }

    const productResult = await client.query<{
      id: string;
      is_active: boolean;
    }>(
      `
        SELECT
          id,
          is_active
        FROM public.products
        WHERE id = $1
          AND EXISTS (
            SELECT 1
            FROM public.business_products bp
            INNER JOIN public.businesses b
              ON b.id = bp.business_id
            WHERE bp.product_id = products.id
              AND bp.is_available = TRUE
              AND b.is_active = TRUE
              AND b.status = 'ACTIVE'
              AND b.accepts_orders = TRUE
              AND b.operating_hours_configured = TRUE
              AND b.catalog_configured = TRUE
              AND b.inventory_configured = TRUE
          )
        LIMIT 1
      `,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    if (!productResult.rows[0].is_active) {
      throw new Error("PRODUCT_NOT_ACTIVE");
    }

    await client.query(
      `
        INSERT INTO public.cart_items (
          cart_id,
          product_id,
          quantity
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET
          quantity =
            public.cart_items.quantity + EXCLUDED.quantity,
          updated_at = NOW()
      `,
      [cart.id, productId, quantity]
    );

    await client.query(
      `
        UPDATE public.carts
        SET updated_at = NOW()
        WHERE id = $1
      `,
      [cart.id]
    );

    const items = await client.query<CartItemRow>(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          p.name AS product_name,
          COALESCE(bp.description, p.description) AS product_description,
          bp.price_amount AS product_price_amount,
          bp.currency AS product_currency,
          COALESCE(bp.image_url, p.image_url) AS product_image_url,
          p.is_active AS product_is_active,
          ci.quantity,
          ci.created_at,
          ci.updated_at
        FROM public.cart_items ci
        INNER JOIN public.products p
          ON p.id = ci.product_id
        LEFT JOIN LATERAL (
          SELECT bp_candidate.description, bp_candidate.price_amount, bp_candidate.currency, bp_candidate.image_url
          FROM public.business_products bp_candidate
          INNER JOIN public.businesses b_candidate ON b_candidate.id = bp_candidate.business_id
          WHERE bp_candidate.product_id = p.id
            AND bp_candidate.is_available = TRUE
            AND b_candidate.is_active = TRUE
            AND b_candidate.status = 'ACTIVE'
            AND b_candidate.accepts_orders = TRUE
            AND b_candidate.operating_hours_configured = TRUE
            AND b_candidate.catalog_configured = TRUE
            AND b_candidate.inventory_configured = TRUE
          ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
          LIMIT 1
        ) bp ON TRUE
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `,
      [cart.id]
    );

    const refreshedCart = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE id = $1
      `,
      [cart.id]
    );

    return mapCart(
      refreshedCart.rows[0],
      items.rows.map(mapCartItem)
    );
  });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
): Promise<CartRecord> {
  return withTransaction(async (client) => {
    const cartResult = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
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

    const itemResult = await client.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM public.cart_items
        WHERE id = $1
          AND cart_id = $2
        LIMIT 1
      `,
      [itemId, cart.id]
    );

    if (itemResult.rows.length === 0) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    await client.query(
      `
        UPDATE public.cart_items
        SET
          quantity = $1,
          updated_at = NOW()
        WHERE id = $2
          AND cart_id = $3
      `,
      [quantity, itemId, cart.id]
    );

    await client.query(
      `
        UPDATE public.carts
        SET updated_at = NOW()
        WHERE id = $1
      `,
      [cart.id]
    );

    const items = await client.query<CartItemRow>(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          p.name AS product_name,
          COALESCE(bp.description, p.description) AS product_description,
          bp.price_amount AS product_price_amount,
          bp.currency AS product_currency,
          COALESCE(bp.image_url, p.image_url) AS product_image_url,
          p.is_active AS product_is_active,
          ci.quantity,
          ci.created_at,
          ci.updated_at
        FROM public.cart_items ci
        INNER JOIN public.products p
          ON p.id = ci.product_id
        LEFT JOIN LATERAL (
          SELECT bp_candidate.description, bp_candidate.price_amount, bp_candidate.currency, bp_candidate.image_url
          FROM public.business_products bp_candidate
          INNER JOIN public.businesses b_candidate ON b_candidate.id = bp_candidate.business_id
          WHERE bp_candidate.product_id = p.id
            AND bp_candidate.is_available = TRUE
            AND b_candidate.is_active = TRUE
            AND b_candidate.status = 'ACTIVE'
            AND b_candidate.accepts_orders = TRUE
            AND b_candidate.operating_hours_configured = TRUE
            AND b_candidate.catalog_configured = TRUE
            AND b_candidate.inventory_configured = TRUE
          ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
          LIMIT 1
        ) bp ON TRUE
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `,
      [cart.id]
    );

    const refreshedCart = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE id = $1
      `,
      [cart.id]
    );

    return mapCart(
      refreshedCart.rows[0],
      items.rows.map(mapCartItem)
    );
  });
}

export async function removeCartItem(
  userId: string,
  itemId: string
): Promise<CartRecord> {
  return withTransaction(async (client) => {
    const cartResult = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
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

    const deleted = await client.query(
      `
        DELETE FROM public.cart_items
        WHERE id = $1
          AND cart_id = $2
      `,
      [itemId, cart.id]
    );

    if (deleted.rowCount === 0) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    await client.query(
      `
        UPDATE public.carts
        SET updated_at = NOW()
        WHERE id = $1
      `,
      [cart.id]
    );

    const items = await client.query<CartItemRow>(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.product_id,
          p.name AS product_name,
          p.description AS product_description,
          p.is_active AS product_is_active,
          ci.quantity,
          ci.created_at,
          ci.updated_at
        FROM public.cart_items ci
        INNER JOIN public.products p
          ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `,
      [cart.id]
    );

    const refreshedCart = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE id = $1
      `,
      [cart.id]
    );

    return mapCart(
      refreshedCart.rows[0],
      items.rows.map(mapCartItem)
    );
  });
}

export async function clearCart(
  userId: string
): Promise<CartRecord> {
  return withTransaction(async (client) => {
    const cartResult = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
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

    await client.query(
      `
        DELETE FROM public.cart_items
        WHERE cart_id = $1
      `,
      [cart.id]
    );

    await client.query(
      `
        UPDATE public.carts
        SET updated_at = NOW()
        WHERE id = $1
      `,
      [cart.id]
    );

    const refreshedCart = await client.query<CartRow>(
      `
        SELECT
          id,
          user_id,
          status,
          checked_out_at,
          abandoned_at,
          created_at,
          updated_at
        FROM public.carts
        WHERE id = $1
      `,
      [cart.id]
    );

    return mapCart(refreshedCart.rows[0], []);
  });
}