import { AppError } from "../../utils/app-error";
import {
  findRiderVerificationByRiderId,
  findRiderVerificationHistory,
  findRiderVerifications,
  updateRiderVerification
} from "./rider-verification.repository";
import type {
  RiderVerificationStatus,
  UpdateRiderVerificationInput
} from "./rider-verification.schemas";

export function listRiderVerifications(status?: RiderVerificationStatus) {
  return findRiderVerifications(status);
}

export async function getRiderVerification(riderId: string) {
  const verification = await findRiderVerificationByRiderId(riderId);
  if (!verification) {
    throw new AppError(
      "Rider verification record not found.",
      404,
      "RIDER_VERIFICATION_NOT_FOUND"
    );
  }

  return {
    verification,
    history: await findRiderVerificationHistory(riderId)
  };
}

import { db } from "../../db/database";

export async function reviewRiderVerification(
  riderId: string,
  adminUserId: string,
  input: UpdateRiderVerificationInput
) {
  try {
    const updated = await updateRiderVerification(
      riderId,
      adminUserId,
      input.status,
      input.notes ?? null
    );

    await db.query(`
      INSERT INTO public.audit_logs
        (actor_type, actor_user_id, action, entity_type, entity_id, description, metadata)
      VALUES ('USER', $1, $2, 'RIDER', $3, $4, $5::jsonb)
    `, [
      adminUserId,
      `RIDER_${input.status}`,
      riderId,
      `Rider verification updated to ${input.status}: ${input.notes || "No notes provided"}`,
      JSON.stringify({ status: input.status, notes: input.notes })
    ]);

    return updated;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RIDER_VERIFICATION_NOT_FOUND") {
      throw new AppError("Rider verification record not found.", 404, "RIDER_VERIFICATION_NOT_FOUND");
    }
    if (error instanceof Error && error.message === "RIDER_VERIFICATION_NO_CHANGE") {
      throw new AppError("The rider already has this verification status.", 409, "RIDER_VERIFICATION_NO_CHANGE");
    }
    throw error;
  }
}
