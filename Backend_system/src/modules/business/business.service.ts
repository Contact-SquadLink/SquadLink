import { AppError } from "../../utils/app-error";
import { withTransaction } from "../../db/transaction";

import {
  createBusiness,
  createBusinessCatalogItem,
  createOperatingException,
  deleteBusinessCatalogItem,
  deleteOperatingException,
  findBusinessByOwnerUserId,
  findBusinessCatalogItemById,
  findBusinessCatalogItemByProductId,
  findBusinessReadiness,
  findBusinessReadinessHistory,
  findOperatingExceptionById,
  findOperatingExceptions,
  findOperatingHours,
  findActiveProductById,
  findBusinessCatalogItems,
  replaceOperatingHours,
  updateBusinessCatalogItem,
  updateBusinessLocation,
  updateOperatingException,
  type BusinessCatalogItemRecord,
  type BusinessRecord,
  type BusinessReadinessHistoryRecord,
  type BusinessReadinessRecord,
  type OperatingExceptionRecord,
  type OperatingHourRecord
} from "./business.repository";

import type {
  CreateBusinessInput,
  CreateOperatingExceptionInput,
  UpdateOperatingExceptionInput,
  UpdateOperatingHoursInput
} from "./business.schemas";

import type {
  CreateBusinessCatalogItemInput,
  CreateCustomBusinessProductInput,
  UpdateBusinessCatalogItemInput
} from "./business-catalog.schemas";

export async function registerBusiness(
  input: CreateBusinessInput,
  ownerUserId: string
): Promise<BusinessRecord> {
  const existingBusiness =
    await findBusinessByOwnerUserId(ownerUserId);

  if (existingBusiness) {
    throw new AppError(
      "You already have a registered business.",
      409,
      "BUSINESS_ALREADY_EXISTS"
    );
  }

  try {
    return await createBusiness(
      input,
      ownerUserId
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes(
        "uq_businesses_owner_user_id"
      )
    ) {
      throw new AppError(
        "You already have a registered business.",
        409,
        "BUSINESS_ALREADY_EXISTS"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_REGISTRATION_ROLE_REQUIRED"
    ) {
      throw new AppError(
        "Only customer accounts can register a business.",
        403,
        "BUSINESS_REGISTRATION_ROLE_REQUIRED"
      );
    }

    throw error;
  }
}

export async function getBusinessForOwner(
  ownerUserId: string
): Promise<BusinessRecord> {
  const business =
    await findBusinessByOwnerUserId(ownerUserId);

  if (!business) {
    throw new AppError(
      "No business is associated with this account.",
      404,
      "BUSINESS_NOT_FOUND"
    );
  }

  return business;
}

export async function getOperatingHoursForOwner(
  ownerUserId: string
): Promise<OperatingHourRecord[]> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return findOperatingHours(business.id);
}

export async function updateOperatingHoursForOwner(
  ownerUserId: string,
  input: UpdateOperatingHoursInput
): Promise<OperatingHourRecord[]> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return replaceOperatingHours(
    business.id,
    input.hours
  );
}

export async function getOperatingExceptionsForOwner(
  ownerUserId: string
): Promise<OperatingExceptionRecord[]> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return findOperatingExceptions(business.id);
}

export async function createOperatingExceptionForOwner(
  ownerUserId: string,
  input: CreateOperatingExceptionInput
): Promise<OperatingExceptionRecord> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return createOperatingException(
    business.id,
    input
  );
}

export async function updateOperatingExceptionForOwner(
  ownerUserId: string,
  exceptionId: string,
  input: UpdateOperatingExceptionInput
): Promise<OperatingExceptionRecord> {
  const business =
    await getBusinessForOwner(ownerUserId);

  const existingException =
    await findOperatingExceptionById(
      business.id,
      exceptionId
    );

  if (!existingException) {
    throw new AppError(
      "Operating exception not found.",
      404,
      "OPERATING_EXCEPTION_NOT_FOUND"
    );
  }

  const updatedException =
    await updateOperatingException(
      business.id,
      exceptionId,
      input
    );

  if (!updatedException) {
    throw new AppError(
      "Operating exception not found.",
      404,
      "OPERATING_EXCEPTION_NOT_FOUND"
    );
  }

  return updatedException;
}

export async function deleteOperatingExceptionForOwner(
  ownerUserId: string,
  exceptionId: string
): Promise<void> {
  const business =
    await getBusinessForOwner(ownerUserId);

  const deleted =
    await deleteOperatingException(
      business.id,
      exceptionId
    );

  if (!deleted) {
    throw new AppError(
      "Operating exception not found.",
      404,
      "OPERATING_EXCEPTION_NOT_FOUND"
    );
  }
}

export async function getBusinessReadinessForOwner(
  ownerUserId: string
): Promise<BusinessReadinessRecord> {
  const business =
    await getBusinessForOwner(ownerUserId);

  const readiness =
    await findBusinessReadiness(
      business.id
    );

  if (!readiness) {
    throw new AppError(
      "Business readiness information could not be found.",
      404,
      "BUSINESS_READINESS_NOT_FOUND"
    );
  }

  return readiness;
}

export async function getBusinessReadinessHistoryForOwner(
  ownerUserId: string
): Promise<BusinessReadinessHistoryRecord[]> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return findBusinessReadinessHistory(
    business.id
  );
}

/*
 * BUSINESS CATALOG
 */

export async function getBusinessCatalogForOwner(
  ownerUserId: string
): Promise<BusinessCatalogItemRecord[]> {
  const business =
    await getBusinessForOwner(ownerUserId);

  return findBusinessCatalogItems(
    business.id
  );
}

export async function addProductToBusinessCatalog(
  ownerUserId: string,
  input: CreateBusinessCatalogItemInput
): Promise<BusinessCatalogItemRecord> {
  const business =
    await getBusinessForOwner(ownerUserId);

  if (
    !business.isActive ||
    business.status !== "ACTIVE"
  ) {
    throw new AppError(
      "This business is not currently active.",
      409,
      "BUSINESS_NOT_ACTIVE"
    );
  }

  const product =
    await findActiveProductById(
      input.productId
    );

  if (!product) {
    throw new AppError(
      "The selected platform product does not exist.",
      404,
      "PRODUCT_NOT_FOUND"
    );
  }

  if (!product.isActive) {
    throw new AppError(
      "The selected platform product is inactive.",
      409,
      "PRODUCT_INACTIVE"
    );
  }

  const existing =
    await findBusinessCatalogItemByProductId(
      business.id,
      input.productId
    );

  if (existing) {
    throw new AppError(
      "This product is already enrolled in the business catalog.",
      409,
      "BUSINESS_PRODUCT_ALREADY_EXISTS"
    );
  }

  try {
    return await createBusinessCatalogItem(
      business.id,
      input,
      ownerUserId
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_PRODUCT_ALREADY_EXISTS"
    ) {
      throw new AppError(
        "This product is already enrolled in the business catalog.",
        409,
        "BUSINESS_PRODUCT_ALREADY_EXISTS"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_NOT_ACTIVE"
    ) {
      throw new AppError(
        "This business is not currently active.",
        409,
        "BUSINESS_NOT_ACTIVE"
      );
    }

    throw error;
  }
}

export async function updateBusinessCatalogForOwner(
  ownerUserId: string,
  businessProductId: string,
  input: UpdateBusinessCatalogItemInput
): Promise<BusinessCatalogItemRecord> {
  const business =
    await getBusinessForOwner(ownerUserId);

  const existing =
    await findBusinessCatalogItemById(
      business.id,
      businessProductId
    );

  if (!existing) {
    throw new AppError(
      "Business catalog item not found.",
      404,
      "BUSINESS_PRODUCT_NOT_FOUND"
    );
  }

  const updated =
    await updateBusinessCatalogItem(
      business.id,
      businessProductId,
      input
    );

  if (!updated) {
    throw new AppError(
      "Business catalog item not found.",
      404,
      "BUSINESS_PRODUCT_NOT_FOUND"
    );
  }

  return updated;
}

export async function deleteBusinessCatalogForOwner(
  ownerUserId: string,
  businessProductId: string
): Promise<void> {
  const business =
    await getBusinessForOwner(ownerUserId);

  const existing =
    await findBusinessCatalogItemById(
      business.id,
      businessProductId
    );

  if (!existing) {
    throw new AppError(
      "Business catalog item not found.",
      404,
      "BUSINESS_PRODUCT_NOT_FOUND"
    );
  }

  try {
    const deleted =
      await deleteBusinessCatalogItem(
        business.id,
        businessProductId,
        ownerUserId
      );

    if (!deleted) {
      throw new AppError(
        "Business catalog item not found.",
        404,
        "BUSINESS_PRODUCT_NOT_FOUND"
      );
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_PRODUCT_HAS_INVENTORY"
    ) {
      throw new AppError(
        "This catalog item cannot be removed because inventory has already been configured for it. Mark it unavailable instead.",
        409,
        "BUSINESS_PRODUCT_HAS_INVENTORY"
      );
    }

    throw error;
  }
}

export async function getBusinessApplicationForCustomer(ownerUserId: string) {
  const business = await findBusinessByOwnerUserId(ownerUserId);
  if (!business) {
    return { status: "NONE" as const, business: null, verification: null };
  }

  const { findBusinessVerificationByBusinessId } = await import("../business-verification/business-verification.repository");
  const verification = await findBusinessVerificationByBusinessId(business.id);
  return {
    status: verification?.status ?? "PENDING",
    business,
    verification
  };
}

export async function updateBusinessLocationForOwner(
  ownerUserId: string,
  input: {
    addressLine?: string;
    city?: string;
    state?: string;
    latitude: number;
    longitude: number;
  }
): Promise<BusinessRecord> {
  const business = await getBusinessForOwner(ownerUserId);
  return updateBusinessLocation(business.id, input);
}

export async function createCustomProductForBusiness(
  ownerUserId: string,
  input: CreateCustomBusinessProductInput
) {
  const business = await getBusinessForOwner(ownerUserId);
  if (!business.isActive || business.status !== "ACTIVE") {
    throw new AppError("This business is not currently active.", 409, "BUSINESS_NOT_ACTIVE");
  }

  return withTransaction(async (client) => {
    // 1. Check or insert product into public.products
    const productRes = await client.query<{ id: string }>(
      `SELECT id FROM public.products WHERE category_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [input.categoryId, input.name]
    );

    let productId: string;
    if (productRes.rows.length > 0) {
      productId = productRes.rows[0].id;
    } else {
      const newProd = await client.query<{ id: string }>(
        `INSERT INTO public.products (category_id, name, description, image_url, suggested_price_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [input.categoryId, input.name, input.description ?? null, input.imageUrl ?? null, input.priceAmount]
      );
      productId = newProd.rows[0].id;
    }

    // 2. Check if business already has this product enrolled
    const existingBp = await client.query<{ id: string }>(
      `SELECT id FROM public.business_products WHERE business_id = $1 AND product_id = $2`,
      [business.id, productId]
    );

    let businessProductId: string;
    if (existingBp.rows.length > 0) {
      businessProductId = existingBp.rows[0].id;
      await client.query(
        `UPDATE public.business_products
         SET price_amount = $1, description = $2, image_url = $3, is_available = $4, updated_at = NOW()
         WHERE id = $5`,
        [input.priceAmount, input.description ?? null, input.imageUrl ?? null, input.isAvailable, businessProductId]
      );
    } else {
      const newBp = await client.query<{ id: string }>(
        `INSERT INTO public.business_products (business_id, product_id, price_amount, currency, is_available, description, image_url)
         VALUES ($1, $2, $3, 'NGN', $4, $5, $6)
         RETURNING id`,
        [business.id, productId, input.priceAmount, input.isAvailable, input.description ?? null, input.imageUrl ?? null]
      );
      businessProductId = newBp.rows[0].id;
    }

    // 3. Insert or update inventory
    const existingInv = await client.query<{ id: string }>(
      `SELECT id FROM public.inventory WHERE business_product_id = $1`,
      [businessProductId]
    );

    if (existingInv.rows.length > 0) {
      await client.query(
        `UPDATE public.inventory
         SET quantity_on_hand = $1, updated_at = NOW(), last_updated_at = NOW()
         WHERE id = $2`,
        [input.quantityOnHand, existingInv.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO public.inventory (business_product_id, quantity_on_hand, quantity_reserved)
         VALUES ($1, $2, 0)`,
        [businessProductId, input.quantityOnHand]
      );
    }

    // 4. Mark catalog_configured = true on business if not already
    await client.query(
      `UPDATE public.businesses
       SET catalog_configured = TRUE,
           catalog_configured_at = COALESCE(catalog_configured_at, NOW()),
           inventory_configured = TRUE,
           inventory_configured_at = COALESCE(inventory_configured_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [business.id]
    );

    return {
      id: businessProductId,
      businessId: business.id,
      productId,
      productName: input.name,
      productDescription: input.description ?? null,
      productImageUrl: input.imageUrl ?? null,
      priceAmount: input.priceAmount,
      currency: "NGN",
      isAvailable: input.isAvailable,
      quantityOnHand: input.quantityOnHand,
      createdAt: new Date()
    };
  });
}