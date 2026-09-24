import { db } from "../../db/database";

import type {
  CreateBusinessInput,
  CreateOperatingExceptionInput,
  DayOfWeek,
  OperatingHourInput,
  UpdateOperatingExceptionInput
} from "./business.schemas";

import type {
  CreateBusinessCatalogItemInput,
  UpdateBusinessCatalogItemInput
} from "./business-catalog.schemas";

export interface BusinessRecord {
  id: string;
  name: string;
  description: string | null;
  phoneNumber: string | null;
  email: string | null;
  addressLine: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  acceptsOrders: boolean;
  minimumOrderAmount: number;
  ownerUserId: string | null;
  onboardingCompleted: boolean;
  operatingHoursConfigured: boolean;
  catalogConfigured: boolean;
  inventoryConfigured: boolean;
  verificationRequired: boolean;
}

export interface OperatingHourRecord {
  id: string;
  businessId: string;
  dayOfWeek: DayOfWeek;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingExceptionRecord {
  id: string;
  businessId: string;
  exceptionDate: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessReadinessRecord {
  businessId: string;
  onboardingCompleted: boolean;
  operatingHoursConfigured: boolean;
  catalogConfigured: boolean;
  inventoryConfigured: boolean;
  ready: boolean;
}

export interface BusinessReadinessHistoryRecord {
  id: string;
  businessId: string;
  fieldName: string;
  previousValue: boolean;
  newValue: boolean;
  changedBy: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface BusinessCatalogItemRecord {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  priceAmount: number;
  currency: string;
  isAvailable: boolean;
  productIsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BusinessRow {
  id: string;
  name: string;
  description: string | null;
  phone_number: string | null;
  email: string | null;
  address_line: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  status: string;
  accepts_orders: boolean;
  minimum_order_amount: string;
  owner_user_id: string | null;
  onboarding_completed: boolean;
  operating_hours_configured: boolean;
  catalog_configured: boolean;
  inventory_configured: boolean;
  verification_required: boolean;
}

interface OperatingHourRow {
  id: string;
  business_id: string;
  day_of_week: DayOfWeek;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
  created_at: Date;
  updated_at: Date;
}

interface OperatingExceptionRow {
  id: string;
  business_id: string;
  exception_date: string;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
  reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BusinessReadinessHistoryRow {
  id: string;
  business_id: string;
  field_name: string;
  previous_value: boolean;
  new_value: boolean;
  changed_by: string | null;
  reason: string | null;
  created_at: Date;
}

interface BusinessCatalogItemRow {
  id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  product_description: string | null;
  business_description: string | null;
  product_image_url: string | null;
  business_image_url: string | null;
  category_id: string;
  category_name: string;
  price_amount: string;
  currency: string;
  is_available: boolean;
  product_is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapBusiness(row: BusinessRow): BusinessRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    phoneNumber: row.phone_number,
    email: row.email,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.is_active,
    isVerified: row.is_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    acceptsOrders: row.accepts_orders,
    minimumOrderAmount: Number(row.minimum_order_amount),
    ownerUserId: row.owner_user_id,
    onboardingCompleted: row.onboarding_completed,
    operatingHoursConfigured: row.operating_hours_configured,
    catalogConfigured: row.catalog_configured,
    inventoryConfigured: row.inventory_configured,
    verificationRequired: row.verification_required
  };
}

function mapOperatingHour(
  row: OperatingHourRow
): OperatingHourRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
    isClosed: row.is_closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOperatingException(
  row: OperatingExceptionRow
): OperatingExceptionRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    exceptionDate: row.exception_date,
    isClosed: row.is_closed,
    opensAt: row.opens_at
      ? row.opens_at.slice(0, 5)
      : null,
    closesAt: row.closes_at
      ? row.closes_at.slice(0, 5)
      : null,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReadinessHistory(
  row: BusinessReadinessHistoryRow
): BusinessReadinessHistoryRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    fieldName: row.field_name,
    previousValue: row.previous_value,
    newValue: row.new_value,
    changedBy: row.changed_by,
    reason: row.reason,
    createdAt: row.created_at
  };
}

function mapBusinessCatalogItem(
  row: BusinessCatalogItemRow
): BusinessCatalogItemRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    productName: row.product_name,
    productDescription: row.business_description ?? row.product_description,
    imageUrl: row.business_image_url ?? row.product_image_url,
    categoryId: row.category_id,
    categoryName: row.category_name,
    priceAmount: Number(row.price_amount),
    currency: row.currency.trim(),
    isAvailable: row.is_available,
    productIsActive: row.product_is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findBusinessByOwnerUserId(
  ownerUserId: string
): Promise<BusinessRecord | null> {
  const result = await db.query<BusinessRow>(
    `
      SELECT
        id,
        name,
        description,
        phone_number,
        email,
        address_line,
        city,
        state,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        is_active,
        is_verified,
        created_at,
        updated_at,
        status,
        accepts_orders,
        minimum_order_amount,
        owner_user_id,
        onboarding_completed,
        operating_hours_configured,
        catalog_configured,
        inventory_configured,
        verification_required
      FROM public.businesses
      WHERE owner_user_id = $1
      LIMIT 1
    `,
    [ownerUserId]
  );

  return result.rows.length > 0
    ? mapBusiness(result.rows[0])
    : null;
}

export async function createBusiness(
  input: CreateBusinessInput,
  ownerUserId: string
): Promise<BusinessRecord> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{
      role: string;
    }>(
      `
        SELECT role
        FROM public.users
        WHERE id = $1
        FOR UPDATE
      `,
      [ownerUserId]
    );

    if (
      userResult.rows.length === 0 ||
      userResult.rows[0].role !== "CUSTOMER"
    ) {
      throw new Error(
        "BUSINESS_REGISTRATION_ROLE_REQUIRED"
      );
    }

    const result =
      await client.query<BusinessRow>(
        `
          INSERT INTO public.businesses (
            name,
            description,
            phone_number,
            email,
            address_line,
            city,
            state,
            location,
            minimum_order_amount,
            owner_user_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            ST_SetSRID(
              ST_MakePoint($8, $9),
              4326
            )::geography,
            $10,
            $11
          )
          RETURNING
            id,
            name,
            description,
            phone_number,
            email,
            address_line,
            city,
            state,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            is_active,
            is_verified,
            created_at,
            updated_at,
            status,
            accepts_orders,
            minimum_order_amount,
            owner_user_id,
            onboarding_completed,
            operating_hours_configured,
            catalog_configured,
            inventory_configured,
            verification_required
        `,
        [
          input.name,
          input.description ?? null,
          input.phoneNumber ?? null,
          input.email ?? null,
          input.addressLine,
          input.city,
          input.state,
          input.longitude,
          input.latitude,
          input.minimumOrderAmount,
          ownerUserId
        ]
      );

    const business =
      result.rows[0];

    await client.query(
      `
        INSERT INTO public.business_verifications (
          business_id,
          status
        )
        VALUES (
          $1,
          'PENDING'
        )
      `,
      [business.id]
    );

    await client.query("COMMIT");

    return mapBusiness(business);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function findOperatingHours(
  businessId: string
): Promise<OperatingHourRecord[]> {
  const result =
    await db.query<OperatingHourRow>(
      `
        SELECT
          id,
          business_id,
          day_of_week,
          opens_at::text AS opens_at,
          closes_at::text AS closes_at,
          is_closed,
          created_at,
          updated_at
        FROM public.business_operating_hours
        WHERE business_id = $1
        ORDER BY
          CASE day_of_week
            WHEN 'MONDAY' THEN 1
            WHEN 'TUESDAY' THEN 2
            WHEN 'WEDNESDAY' THEN 3
            WHEN 'THURSDAY' THEN 4
            WHEN 'FRIDAY' THEN 5
            WHEN 'SATURDAY' THEN 6
            WHEN 'SUNDAY' THEN 7
          END
      `,
      [businessId]
    );

  return result.rows.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
export async function replaceOperatingHours(
  businessId: string,
  hours: OperatingHourInput[]
): Promise<OperatingHourRecord[]> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        DELETE FROM public.business_operating_hours
        WHERE business_id = $1
      `,
      [businessId]
    );

    for (const hour of hours) {
      await client.query(
        `
          INSERT INTO public.business_operating_hours (
            business_id,
            day_of_week,
            opens_at,
            closes_at,
            is_closed
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `,
        [
          businessId,
          hour.dayOfWeek,
          hour.opensAt ?? "00:00",
          hour.closesAt ?? "00:00",
          hour.isClosed
        ]
      );
    }

    await client.query(
      `
        UPDATE public.businesses
        SET
          operating_hours_configured = true,
          operating_hours_configured_at = now(),
          updated_at = now()
        WHERE id = $1
      `,
      [businessId]
    );

    const result =
      await client.query<OperatingHourRow>(
        `
          SELECT
            id,
            business_id,
            day_of_week,
            opens_at::text AS opens_at,
            closes_at::text AS closes_at,
            is_closed,
            created_at,
            updated_at
          FROM public.business_operating_hours
          WHERE business_id = $1
          ORDER BY
            CASE day_of_week
              WHEN 'MONDAY' THEN 1
              WHEN 'TUESDAY' THEN 2
              WHEN 'WEDNESDAY' THEN 3
              WHEN 'THURSDAY' THEN 4
              WHEN 'FRIDAY' THEN 5
              WHEN 'SATURDAY' THEN 6
              WHEN 'SUNDAY' THEN 7
            END
        `,
        [businessId]
      );

    await client.query("COMMIT");

    return result.rows.map(mapOperatingHour);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Operating hours rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function createOperatingException(
  businessId: string,
  input: CreateOperatingExceptionInput
): Promise<OperatingExceptionRecord> {
  const result =
    await db.query<OperatingExceptionRow>(
      `
        INSERT INTO public.business_operating_exceptions (
          business_id,
          exception_date,
          is_closed,
          opens_at,
          closes_at,
          reason
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING
          id,
          business_id,
          exception_date::text AS exception_date,
          is_closed,
          opens_at::text AS opens_at,
          closes_at::text AS closes_at,
          reason,
          created_at,
          updated_at
      `,
      [
        businessId,
        input.exceptionDate,
        input.isClosed,
        input.opensAt ?? null,
        input.closesAt ?? null,
        input.reason ?? null
      ]
    );

  return mapOperatingException(result.rows[0]);
}

export async function findOperatingExceptions(
  businessId: string
): Promise<OperatingExceptionRecord[]> {
  const result =
    await db.query<OperatingExceptionRow>(
      `
        SELECT
          id,
          business_id,
          exception_date::text AS exception_date,
          is_closed,
          opens_at::text AS opens_at,
          closes_at::text AS closes_at,
          reason,
          created_at,
          updated_at
        FROM public.business_operating_exceptions
        WHERE business_id = $1
        ORDER BY exception_date ASC
      `,
      [businessId]
    );

  return result.rows.map(mapOperatingException);
}

export async function findOperatingExceptionById(
  businessId: string,
  exceptionId: string
): Promise<OperatingExceptionRecord | null> {
  const result =
    await db.query<OperatingExceptionRow>(
      `
        SELECT
          id,
          business_id,
          exception_date::text AS exception_date,
          is_closed,
          opens_at::text AS opens_at,
          closes_at::text AS closes_at,
          reason,
          created_at,
          updated_at
        FROM public.business_operating_exceptions
        WHERE business_id = $1
          AND id = $2
        LIMIT 1
      `,
      [businessId, exceptionId]
    );

  return result.rows.length > 0
    ? mapOperatingException(result.rows[0])
    : null;
}

export async function updateOperatingException(
  businessId: string,
  exceptionId: string,
  input: UpdateOperatingExceptionInput
): Promise<OperatingExceptionRecord | null> {
  const result =
    await db.query<OperatingExceptionRow>(
      `
        UPDATE public.business_operating_exceptions
        SET
          exception_date = $1,
          is_closed = $2,
          opens_at = $3,
          closes_at = $4,
          reason = $5,
          updated_at = now()
        WHERE business_id = $6
          AND id = $7
        RETURNING
          id,
          business_id,
          exception_date::text AS exception_date,
          is_closed,
          opens_at::text AS opens_at,
          closes_at::text AS closes_at,
          reason,
          created_at,
          updated_at
      `,
      [
        input.exceptionDate,
        input.isClosed,
        input.opensAt ?? null,
        input.closesAt ?? null,
        input.reason ?? null,
        businessId,
        exceptionId
      ]
    );

  return result.rows.length > 0
    ? mapOperatingException(result.rows[0])
    : null;
}

export async function deleteOperatingException(
  businessId: string,
  exceptionId: string
): Promise<boolean> {
  const result = await db.query(
    `
      DELETE FROM public.business_operating_exceptions
      WHERE business_id = $1
        AND id = $2
    `,
    [businessId, exceptionId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function findBusinessReadiness(
  businessId: string
): Promise<BusinessReadinessRecord | null> {
  const result = await db.query<{
    id: string;
    onboarding_completed: boolean;
    operating_hours_configured: boolean;
    catalog_configured: boolean;
    inventory_configured: boolean;
  }>(
    `
      SELECT
        id,
        onboarding_completed,
        operating_hours_configured,
        catalog_configured,
        inventory_configured
      FROM public.businesses
      WHERE id = $1
      LIMIT 1
    `,
    [businessId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  const ready =
    row.operating_hours_configured &&
    row.catalog_configured &&
    row.inventory_configured;

  return {
    businessId: row.id,
    onboardingCompleted: row.onboarding_completed,
    operatingHoursConfigured:
      row.operating_hours_configured,
    catalogConfigured:
      row.catalog_configured,
    inventoryConfigured:
      row.inventory_configured,
    ready
  };
}

export async function findBusinessReadinessHistory(
  businessId: string
): Promise<BusinessReadinessHistoryRecord[]> {
  const result =
    await db.query<BusinessReadinessHistoryRow>(
      `
        SELECT
          id,
          business_id,
          field_name,
          previous_value,
          new_value,
          changed_by,
          reason,
          created_at
        FROM public.business_readiness_history
        WHERE business_id = $1
        ORDER BY created_at ASC
      `,
      [businessId]
    );

  return result.rows.map(mapReadinessHistory);
}

/*
 * BUSINESS CATALOG
 */

const businessCatalogSelect = `
  SELECT
    bp.id,
    bp.business_id,
    bp.product_id,
    p.name AS product_name,
    p.description AS product_description,
    bp.description AS business_description,
    p.image_url AS product_image_url,
    bp.image_url AS business_image_url,
    c.id AS category_id,
    c.name AS category_name,
    bp.price_amount,
    bp.currency,
    bp.is_available,
    p.is_active AS product_is_active,
    bp.created_at,
    bp.updated_at
  FROM public.business_products bp
  INNER JOIN public.products p
    ON p.id = bp.product_id
  INNER JOIN public.categories c
    ON c.id = p.category_id
`;

export async function findBusinessCatalogItems(
  businessId: string
): Promise<BusinessCatalogItemRecord[]> {
  const result =
    await db.query<BusinessCatalogItemRow>(
      `
        ${businessCatalogSelect}
        WHERE bp.business_id = $1
        ORDER BY c.name ASC, p.name ASC
      `,
      [businessId]
    );

  return result.rows.map(mapBusinessCatalogItem);
}

export async function findBusinessCatalogItemById(
  businessId: string,
  businessProductId: string
): Promise<BusinessCatalogItemRecord | null> {
  const result =
    await db.query<BusinessCatalogItemRow>(
      `
        ${businessCatalogSelect}
        WHERE bp.business_id = $1
          AND bp.id = $2
        LIMIT 1
      `,
      [businessId, businessProductId]
    );

  return result.rows.length > 0
    ? mapBusinessCatalogItem(result.rows[0])
    : null;
}

export async function findBusinessCatalogItemByProductId(
  businessId: string,
  productId: string
): Promise<BusinessCatalogItemRecord | null> {
  const result =
    await db.query<BusinessCatalogItemRow>(
      `
        ${businessCatalogSelect}
        WHERE bp.business_id = $1
          AND bp.product_id = $2
        LIMIT 1
      `,
      [businessId, productId]
    );

  return result.rows.length > 0
    ? mapBusinessCatalogItem(result.rows[0])
    : null;
}

export async function findActiveProductById(
  productId: string
): Promise<{
  id: string;
  isActive: boolean;
} | null> {
  const result = await db.query<{
    id: string;
    is_active: boolean;
  }>(
    `
      SELECT
        id,
        is_active
      FROM public.products
      WHERE id = $1
      LIMIT 1
    `,
    [productId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    isActive: result.rows[0].is_active
  };
}

export async function createBusinessCatalogItem(
  businessId: string,
  input: CreateBusinessCatalogItemInput,
  ownerUserId: string
): Promise<BusinessCatalogItemRecord> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    /*
     * Lock the business row so two simultaneous catalog-enrollment
     * requests cannot both attempt the first-readiness transition.
     */
    const businessResult = await client.query<{
      id: string;
      is_active: boolean;
      status: string;
      catalog_configured: boolean;
    }>(
      `
        SELECT
          id,
          is_active,
          status,
          catalog_configured
        FROM public.businesses
        WHERE id = $1
        FOR UPDATE
      `,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      throw new Error("BUSINESS_NOT_FOUND");
    }

    const business =
      businessResult.rows[0];

    if (
      !business.is_active ||
      business.status !== "ACTIVE"
    ) {
      throw new Error("BUSINESS_NOT_ACTIVE");
    }

    const duplicateResult =
      await client.query(
        `
          SELECT id
          FROM public.business_products
          WHERE business_id = $1
            AND product_id = $2
          LIMIT 1
        `,
        [businessId, input.productId]
      );

    if (duplicateResult.rows.length > 0) {
      throw new Error(
        "BUSINESS_PRODUCT_ALREADY_EXISTS"
      );
    }

    const insertResult =
      await client.query<BusinessCatalogItemRow>(
        `
          INSERT INTO public.business_products (
            business_id,
            product_id,
            price_amount,
            currency,
            is_available,
            description,
            image_url
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING
            id,
            business_id,
            product_id,
            price_amount,
            currency,
            is_available,
            created_at,
            updated_at
        `,
        [
          businessId,
          input.productId,
          input.priceAmount,
          input.currency,
          input.isAvailable,
          input.description ?? null,
          input.imageUrl ?? null
        ]
      );

    const inserted = insertResult.rows[0];

    /*
     * The readiness flag represents the current configured state.
     * The first successfully enrolled product changes it from false
     * to true.
     */
    if (!business.catalog_configured) {
      await client.query(
        `
          UPDATE public.businesses
          SET
            catalog_configured = true,
            catalog_configured_at = now(),
            updated_at = now()
          WHERE id = $1
        `,
        [businessId]
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
            'CATALOG_CONFIGURED',
            false,
            true,
            $2,
            $3
          )
        `,
        [
          businessId,
          ownerUserId,
          "Business catalog configured by enrolling the first platform product."
        ]
      );
    }

    const catalogResult =
      await client.query<BusinessCatalogItemRow>(
        `
          ${businessCatalogSelect}
          WHERE bp.id = $1
          LIMIT 1
        `,
        [inserted.id]
      );

    await client.query("COMMIT");

    return mapBusinessCatalogItem(
      catalogResult.rows[0]
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Business catalog rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function updateBusinessCatalogItem(
  businessId: string,
  businessProductId: string,
  input: UpdateBusinessCatalogItemInput
): Promise<BusinessCatalogItemRecord | null> {
  const result =
    await db.query<BusinessCatalogItemRow>(
      `
        UPDATE public.business_products
        SET
          price_amount = COALESCE($1, price_amount),
          currency = COALESCE($2, currency),
          is_available = COALESCE($3, is_available),
          description = CASE
            WHEN $4::text IS NULL AND $5::boolean = true THEN NULL
            WHEN $4::text IS NOT NULL THEN $4
            ELSE description
          END,
          image_url = CASE
            WHEN $6::text IS NULL AND $7::boolean = true THEN NULL
            WHEN $6::text IS NOT NULL THEN $6
            ELSE image_url
          END,
          updated_at = now()
        WHERE business_id = $8
          AND id = $9
        RETURNING
          id,
          business_id,
          product_id,
          price_amount,
          currency,
          is_available,
          created_at,
          updated_at
      `,
      [
        input.priceAmount ?? null,
        input.currency ?? null,
        input.isAvailable ?? null,
        input.description ?? null,
        input.description === null,
        input.imageUrl ?? null,
        input.imageUrl === null,
        businessId,
        businessProductId
      ]
    );

  if (result.rows.length === 0) {
    return null;
  }

  const catalogResult =
    await db.query<BusinessCatalogItemRow>(
      `
        ${businessCatalogSelect}
        WHERE bp.id = $1
        LIMIT 1
      `,
      [result.rows[0].id]
    );

  return catalogResult.rows.length > 0
    ? mapBusinessCatalogItem(
        catalogResult.rows[0]
      )
    : null;
}

export async function deleteBusinessCatalogItem(
  businessId: string,
  businessProductId: string,
  ownerUserId: string
): Promise<boolean> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    /*
     * Lock the business so catalog configuration cannot race
     * with another catalog mutation.
     */
    const businessResult = await client.query<{
      catalog_configured: boolean;
    }>(
      `
        SELECT
          catalog_configured
        FROM public.businesses
        WHERE id = $1
        FOR UPDATE
      `,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      throw new Error("BUSINESS_NOT_FOUND");
    }

    const inventoryResult =
      await client.query(
        `
          SELECT i.id
          FROM public.inventory i
          INNER JOIN public.business_products bp
            ON bp.id = i.business_product_id
          WHERE bp.business_id = $1
            AND bp.id = $2
          LIMIT 1
        `,
        [businessId, businessProductId]
      );

    if (inventoryResult.rows.length > 0) {
      throw new Error(
        "BUSINESS_PRODUCT_HAS_INVENTORY"
      );
    }

    const deleteResult =
      await client.query(
        `
          DELETE FROM public.business_products
          WHERE business_id = $1
            AND id = $2
        `,
        [businessId, businessProductId]
      );

    if ((deleteResult.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const remainingResult =
      await client.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM public.business_products
          WHERE business_id = $1
        `,
        [businessId]
      );

    const remainingCount =
      Number(remainingResult.rows[0].count);

    /*
     * If the business no longer has any catalog products,
     * readiness must become false again.
     */
    if (
      remainingCount === 0 &&
      businessResult.rows[0].catalog_configured
    ) {
      await client.query(
        `
          UPDATE public.businesses
          SET
            catalog_configured = false,
            catalog_configured_at = NULL,
            updated_at = now()
          WHERE id = $1
        `,
        [businessId]
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
            'CATALOG_CONFIGURED',
            true,
            false,
            $2,
            $3
          )
        `,
        [
          businessId,
          ownerUserId,
          "Business catalog no longer contains any enrolled products."
        ]
      );
    }

    await client.query("COMMIT");

    return true;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Business catalog deletion rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}