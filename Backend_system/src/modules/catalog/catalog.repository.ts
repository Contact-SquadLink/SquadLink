import { db } from "../../db/database";
import type {
  CreateCategoryInput,
  CreateProductInput,
  UpdateCategoryInput,
  UpdateProductInput
} from "./catalog.schemas";

export interface CategoryRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapCategory(
  row: CategoryRow
): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface ProductRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  businessId?: string;
  priceAmount?: number;
  currency?: string;
  imageUrl?: string;
  suggestedPriceAmount?: number;
}

interface ProductRow {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  business_id?: string | null;
  price_amount?: string | number | null;
  currency?: string | null;
  image_url?: string | null;
  suggested_price_amount?: string | number | null;
}

function mapProduct(
  row: ProductRow
): ProductRecord {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    businessId: row.business_id ?? undefined,
    priceAmount: row.price_amount == null ? undefined : Number(row.price_amount),
    currency: row.currency ?? undefined,
    imageUrl: row.image_url ?? undefined,
    suggestedPriceAmount: row.suggested_price_amount == null
      ? undefined
      : Number(row.suggested_price_amount)
  };
}

export async function findCategoryById(
  categoryId: string
): Promise<CategoryRecord | null> {
  const result = await db.query<CategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM public.categories
      WHERE id = $1
      LIMIT 1
    `,
    [categoryId]
  );

  return result.rows.length > 0
    ? mapCategory(result.rows[0])
    : null;
}

export async function findCategoryByName(
  name: string
): Promise<CategoryRecord | null> {
  const result = await db.query<CategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM public.categories
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [name]
  );

  return result.rows.length > 0
    ? mapCategory(result.rows[0])
    : null;
}

export async function listCategories(): Promise<
  CategoryRecord[]
> {
  const result = await db.query<CategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM public.categories
      WHERE is_active = TRUE
        AND EXISTS (
          SELECT 1
          FROM public.products p
          INNER JOIN public.business_products bp
            ON bp.product_id = p.id
           AND bp.is_available = TRUE
          INNER JOIN public.businesses b
            ON b.id = bp.business_id
           AND b.is_active = TRUE
           AND b.status = 'ACTIVE'
           AND b.accepts_orders = TRUE
           AND b.onboarding_completed = TRUE
           AND b.operating_hours_configured = TRUE
           AND b.catalog_configured = TRUE
           AND b.inventory_configured = TRUE
          WHERE p.category_id = categories.id
            AND p.is_active = TRUE
        )
      ORDER BY name ASC
    `
  );

  return result.rows.map(mapCategory);
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<CategoryRecord> {
  const result = await db.query<CategoryRow>(
    `
      INSERT INTO public.categories (
        name,
        description
      )
      VALUES ($1, $2)
      RETURNING
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
    `,
    [
      input.name,
      input.description ?? null
    ]
  );

  return mapCategory(result.rows[0]);
}

export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryRecord | null> {
  const result = await db.query<CategoryRow>(
    `
      UPDATE public.categories
      SET
        name = COALESCE($2, name),
        description = CASE
          WHEN $3::text IS NULL AND $4::boolean = true
            THEN NULL
          WHEN $3::text IS NOT NULL
            THEN $3
          ELSE description
        END,
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
    `,
    [
      categoryId,
      input.name ?? null,
      input.description ?? null,
      input.description === null,
      input.isActive ?? null
    ]
  );

  return result.rows.length > 0
    ? mapCategory(result.rows[0])
    : null;
}

export async function findProductById(
  productId: string
): Promise<ProductRecord | null> {
  const result = await db.query<ProductRow>(
    `
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        COALESCE(bp.description, p.description) AS description,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM public.products p
      INNER JOIN public.categories c
        ON c.id = p.category_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [productId]
  );

  return result.rows.length > 0
    ? mapProduct(result.rows[0])
    : null;
}

export async function findProductByCategoryAndName(
  categoryId: string,
  name: string
): Promise<ProductRecord | null> {
  const result = await db.query<ProductRow>(
    `
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM public.products p
      INNER JOIN public.categories c
        ON c.id = p.category_id
      WHERE p.category_id = $1
        AND LOWER(p.name) = LOWER($2)
      LIMIT 1
    `,
    [categoryId, name]
  );

  return result.rows.length > 0
    ? mapProduct(result.rows[0])
    : null;
}

export async function listProducts(): Promise<
  ProductRecord[]
> {
  const result = await db.query<ProductRow>(
    `
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at,
        bp.business_id,
        bp.price_amount,
        bp.currency,
        COALESCE(bp.image_url, p.image_url) AS image_url,
        p.suggested_price_amount
      FROM public.products p
      INNER JOIN public.categories c
        ON c.id = p.category_id
      INNER JOIN LATERAL (
        SELECT
          bp_candidate.business_id,
          bp_candidate.price_amount,
          bp_candidate.currency,
          bp_candidate.description,
          bp_candidate.image_url
        FROM public.business_products bp_candidate
        INNER JOIN public.businesses b_candidate
          ON b_candidate.id = bp_candidate.business_id
         AND b_candidate.is_active = TRUE
         AND b_candidate.status = 'ACTIVE'
         AND b_candidate.accepts_orders = TRUE
         AND b_candidate.location IS NOT NULL
         AND b_candidate.onboarding_completed = TRUE
         AND b_candidate.operating_hours_configured = TRUE
         AND b_candidate.catalog_configured = TRUE
         AND b_candidate.inventory_configured = TRUE
        WHERE bp_candidate.product_id = p.id
          AND bp_candidate.is_available = TRUE
        ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
        LIMIT 1
      ) bp ON TRUE
      WHERE p.is_active = TRUE
      ORDER BY c.name ASC, p.name ASC
    `
  );

  return result.rows.map(mapProduct);
}

export async function findPublicProductById(
  productId: string
): Promise<ProductRecord | null> {
  const result = await db.query<ProductRow>(
    `
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        COALESCE(bp.description, p.description) AS description,
        p.name,
        p.is_active,
        p.created_at,
        p.updated_at,
        bp.business_id,
        bp.price_amount,
        bp.currency,
        COALESCE(bp.image_url, p.image_url) AS image_url,
        p.suggested_price_amount
      FROM public.products p
      INNER JOIN public.categories c
        ON c.id = p.category_id
      INNER JOIN LATERAL (
        SELECT
          bp_candidate.business_id,
          bp_candidate.price_amount,
          bp_candidate.currency,
          bp_candidate.description,
          bp_candidate.image_url
        FROM public.business_products bp_candidate
        INNER JOIN public.businesses b_candidate
          ON b_candidate.id = bp_candidate.business_id
         AND b_candidate.is_active = TRUE
         AND b_candidate.status = 'ACTIVE'
         AND b_candidate.accepts_orders = TRUE
         AND b_candidate.onboarding_completed = TRUE
         AND b_candidate.operating_hours_configured = TRUE
         AND b_candidate.catalog_configured = TRUE
         AND b_candidate.inventory_configured = TRUE
        WHERE bp_candidate.product_id = p.id
          AND bp_candidate.is_available = TRUE
        ORDER BY bp_candidate.updated_at DESC, bp_candidate.business_id
        LIMIT 1
      ) bp ON TRUE
      WHERE p.id = $1
        AND p.is_active = TRUE
        AND c.is_active = TRUE
      LIMIT 1
    `,
    [productId]
  );

  return result.rows.length > 0
    ? mapProduct(result.rows[0])
    : null;
}

export async function createProduct(
  input: CreateProductInput
): Promise<ProductRecord> {
  const result = await db.query<ProductRow>(
    `
      INSERT INTO public.products (
        category_id,
        name,
        description
      )
      SELECT
        c.id,
        $2,
        $3
      FROM public.categories c
      WHERE c.id = $1
      RETURNING
        id,
        category_id,
        (
          SELECT name
          FROM public.categories
          WHERE id = category_id
        ) AS category_name,
        name,
        description,
        is_active,
        created_at,
        updated_at
    `,
    [
      input.categoryId,
      input.name,
      input.description ?? null
    ]
  );

  return mapProduct(result.rows[0]);
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<ProductRecord | null> {
  const result = await db.query<ProductRow>(
    `
      UPDATE public.products
      SET
        category_id = COALESCE($2, category_id),
        name = COALESCE($3, name),
        description = CASE
          WHEN $4::text IS NULL AND $5::boolean = true
            THEN NULL
          WHEN $4::text IS NOT NULL
            THEN $4
          ELSE description
        END,
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        category_id,
        (
          SELECT name
          FROM public.categories
          WHERE id = category_id
        ) AS category_name,
        name,
        description,
        is_active,
        created_at,
        updated_at
    `,
    [
      productId,
      input.categoryId ?? null,
      input.name ?? null,
      input.description ?? null,
      input.description === null,
      input.isActive ?? null
    ]
  );

  return result.rows.length > 0
    ? mapProduct(result.rows[0])
    : null;
}

export async function listPlatformProducts(
  search?: string
): Promise<ProductRecord[]> {
  const result = await db.query<ProductRow>(`
    SELECT
      p.id,
      p.category_id,
      c.name AS category_name,
      p.name,
      p.description,
      p.is_active,
      p.created_at,
      p.updated_at,
      p.image_url,
      p.suggested_price_amount
    FROM public.products p
    INNER JOIN public.categories c ON c.id = p.category_id
    WHERE p.is_active = TRUE
      AND c.is_active = TRUE
      AND (
        $1::text IS NULL
        OR p.name ILIKE '%' || $1 || '%'
        OR COALESCE(p.description, '') ILIKE '%' || $1 || '%'
        OR c.name ILIKE '%' || $1 || '%'
      )
    ORDER BY c.name ASC, p.name ASC
  `, [search?.trim() || null]);

  return result.rows.map(mapProduct);
}