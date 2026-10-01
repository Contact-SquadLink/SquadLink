import { AppError } from "../../utils/app-error";

import {
  findBusinessVerificationByBusinessId,
  findBusinessVerificationHistory,
  findBusinessVerifications,
  updateBusinessVerification
} from "./business-verification.repository";

import type {
  BusinessVerificationStatus,
  UpdateBusinessVerificationInput
} from "./business-verification.schemas";

export async function listBusinessVerifications(
  status?: BusinessVerificationStatus
) {
  return findBusinessVerifications(status);
}

export async function getBusinessVerification(
  businessId: string
) {
  const verification =
    await findBusinessVerificationByBusinessId(
      businessId
    );

  if (!verification) {
    throw new AppError(
      "Business verification record not found.",
      404,
      "BUSINESS_VERIFICATION_NOT_FOUND"
    );
  }

  const history =
    await findBusinessVerificationHistory(
      businessId
    );

  return {
    verification,
    history
  };
}

import { db } from "../../db/database";

export async function reviewBusinessVerification(
  businessId: string,
  adminUserId: string,
  input: UpdateBusinessVerificationInput
) {
  try {
    const updated = await updateBusinessVerification(
      businessId,
      adminUserId,
      input.status,
      input.notes ?? null
    );

    await db.query(`
      INSERT INTO public.audit_logs
        (actor_type, actor_user_id, action, entity_type, entity_id, description, metadata)
      VALUES ('USER', $1, $2, 'BUSINESS', $3, $4, $5::jsonb)
    `, [
      adminUserId,
      `BUSINESS_${input.status}`,
      businessId,
      `Business verification updated to ${input.status}: ${input.notes || "No notes provided"}`,
      JSON.stringify({ status: input.status, notes: input.notes })
    ]);

    return updated;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_VERIFICATION_NOT_FOUND"
    ) {
      throw new AppError(
        "Business verification record not found.",
        404,
        "BUSINESS_VERIFICATION_NOT_FOUND"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "BUSINESS_VERIFICATION_NO_CHANGE"
    ) {
      throw new AppError(
        "The business already has this verification status.",
        409,
        "BUSINESS_VERIFICATION_NO_CHANGE"
      );
    }

    throw error;
  }
}