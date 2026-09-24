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

export async function reviewRiderVerification(
  riderId: string,
  adminUserId: string,
  input: UpdateRiderVerificationInput
) {
  try {
    return await updateRiderVerification(
      riderId,
      adminUserId,
      input.status,
      input.notes ?? null
    );
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
