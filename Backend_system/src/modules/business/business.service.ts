import { AppError } from "../../utils/app-error";

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