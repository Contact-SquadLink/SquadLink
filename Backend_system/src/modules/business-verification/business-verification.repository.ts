import { db } from "../../db/database";

import type {
  BusinessVerificationStatus
} from "./business-verification.schemas";

export interface BusinessVerificationRecord {
  id: string;
  businessId: string;
  businessName: string;
  businessEmail: string | null;
  businessPhoneNumber: string | null;
  city: string;
  state: string;
  businessIsActive: boolean;
  businessIsVerified: boolean;
  verificationRequired: boolean;
  status: BusinessVerificationStatus;
  verifiedBy: string | null;
  verificationNotes: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessVerificationHistoryRecord {
  id: string;
  businessId: string;
  previousStatus:
    | BusinessVerificationStatus
    | null;
  newStatus: BusinessVerificationStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

interface BusinessVerificationRow {
  id: string;
  business_id: string;
  business_name: string;
  business_email: string | null;
  business_phone_number: string | null;
  city: string;
  state: string;
  business_is_active: boolean;
  business_is_verified: boolean;
  verification_required: boolean;
  status: BusinessVerificationStatus;
  verified_by: string | null;
  verification_notes: string | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface BusinessVerificationHistoryRow {
  id: string;
  business_id: string;
  previous_status:
    | BusinessVerificationStatus
    | null;
  new_status: BusinessVerificationStatus;
  reason: string | null;
  changed_by: string | null;
  created_at: Date;
}

function mapVerification(
  row: BusinessVerificationRow
): BusinessVerificationRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    businessEmail: row.business_email,
    businessPhoneNumber:
      row.business_phone_number,
    city: row.city,
    state: row.state,
    businessIsActive:
      row.business_is_active,
    businessIsVerified:
      row.business_is_verified,
    verificationRequired:
      row.verification_required,
    status: row.status,
    verifiedBy: row.verified_by,
    verificationNotes:
      row.verification_notes,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHistory(
  row: BusinessVerificationHistoryRow
): BusinessVerificationHistoryRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    previousStatus:
      row.previous_status,
    newStatus:
      row.new_status,
    reason: row.reason,
    changedBy:
      row.changed_by,
    createdAt:
      row.created_at
  };
}

export async function findBusinessVerifications(
  status?: BusinessVerificationStatus
): Promise<BusinessVerificationRecord[]> {
  const result =
    await db.query<BusinessVerificationRow>(
      `
        SELECT
          bv.id,
          bv.business_id,
          b.name AS business_name,
          b.email AS business_email,
          b.phone_number AS business_phone_number,
          b.city,
          b.state,
          b.is_active AS business_is_active,
          b.is_verified AS business_is_verified,
          b.verification_required,
          bv.status,
          bv.verified_by,
          bv.verification_notes,
          bv.verified_at,
          bv.created_at,
          bv.updated_at
          ,b.owner_user_id
        FROM public.business_verifications bv
        INNER JOIN public.businesses b
          ON b.id = bv.business_id
        WHERE (
          $1::public.business_verification_status
          IS NULL
          OR bv.status = $1
        )
        ORDER BY
          CASE
            WHEN bv.status = 'PENDING'
              THEN 1
            WHEN bv.status = 'REJECTED'
              THEN 2
            WHEN bv.status = 'SUSPENDED'
              THEN 3
            WHEN bv.status = 'VERIFIED'
              THEN 4
          END,
          bv.created_at ASC
      `,
      [status ?? null]
    );

  return result.rows.map(mapVerification);
}

export async function findBusinessVerificationByBusinessId(
  businessId: string
): Promise<BusinessVerificationRecord | null> {
  const result =
    await db.query<BusinessVerificationRow>(
      `
        SELECT
          bv.id,
          bv.business_id,
          b.name AS business_name,
          b.email AS business_email,
          b.phone_number AS business_phone_number,
          b.city,
          b.state,
          b.is_active AS business_is_active,
          b.is_verified AS business_is_verified,
          b.verification_required,
          bv.status,
          bv.verified_by,
          bv.verification_notes,
          bv.verified_at,
          bv.created_at,
          bv.updated_at
          ,b.owner_user_id
        FROM public.business_verifications bv
        INNER JOIN public.businesses b
          ON b.id = bv.business_id
        WHERE bv.business_id = $1
      `,
      [businessId]
    );

  if (result.rows.length === 0) {
    return null;
  }

  return mapVerification(result.rows[0]);
}

export async function findBusinessVerificationHistory(
  businessId: string
): Promise<BusinessVerificationHistoryRecord[]> {
  const result =
    await db.query<BusinessVerificationHistoryRow>(
      `
        SELECT
          id,
          business_id,
          previous_status,
          new_status,
          reason,
          changed_by,
          created_at
        FROM public.business_verification_history
        WHERE business_id = $1
        ORDER BY created_at ASC
      `,
      [businessId]
    );

  return result.rows.map(mapHistory);
}

export async function updateBusinessVerification(
  businessId: string,
  adminUserId: string,
  status: BusinessVerificationStatus,
  notes: string | null
): Promise<BusinessVerificationRecord> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const verificationResult =
      await client.query<{
        id: string;
        business_id: string;
        owner_user_id: string;
        status: BusinessVerificationStatus;
        verification_notes: string | null;
      }>(
        `
          SELECT
            bv.id,
            bv.business_id,
            b.owner_user_id,
            bv.status,
            bv.verification_notes
          FROM public.business_verifications bv
          INNER JOIN public.businesses b ON b.id = bv.business_id
          WHERE bv.business_id = $1
          FOR UPDATE
        `,
        [businessId]
      );

    if (
      verificationResult.rows.length === 0
    ) {
      throw new Error(
        "BUSINESS_VERIFICATION_NOT_FOUND"
      );
    }

    const current =
      verificationResult.rows[0];

    if (current.status === status) {
      throw new Error(
        "BUSINESS_VERIFICATION_NO_CHANGE"
      );
    }

    const isVerified =
      status === "VERIFIED";

    await client.query(
      `
        UPDATE public.business_verifications
        SET
          status = $1,
          verified_by = CASE
            WHEN $2::boolean = TRUE
              THEN $3::uuid
            ELSE NULL
          END,
          verification_notes = $4,
          verified_at = CASE
            WHEN $2::boolean = TRUE
              THEN NOW()
            ELSE NULL
          END,
          updated_at = NOW()
        WHERE business_id = $5
      `,
      [
        status,
        isVerified,
        adminUserId,
        notes ?? null,
        businessId
      ]
    );

    await client.query(
      `
        UPDATE public.users
        SET role = CASE WHEN $1::public.business_verification_status = 'VERIFIED'
                        THEN 'BUSINESS_USER'::public.user_role
                        ELSE 'CUSTOMER'::public.user_role
                   END,
            updated_at = NOW()
        WHERE id = $2
      `,
      [status, current.owner_user_id]
    );

    const notificationType = status === "VERIFIED"
      ? "BUSINESS_APPLICATION_APPROVED"
      : status === "REJECTED"
        ? "BUSINESS_APPLICATION_REJECTED"
        : null;
    if (notificationType) {
      const title = status === "VERIFIED"
        ? "Business application approved"
        : "Business application rejected";
      const message = status === "VERIFIED"
        ? "Congratulations! Your business application has been approved. You can now access your business workspace."
        : `Your business application was rejected.${notes ? ` Reason: ${notes}` : " Please review the application details and contact support."}`;
      await client.query(
        `
          INSERT INTO public.notifications (
            user_id, type, channel, status, title, message, event_key
          )
          VALUES ($1, $2::public.notification_type, 'IN_APP', 'SENT', $3, $4, $5)
          ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
        `,
        [current.owner_user_id, notificationType, title, message, `business-verification:${businessId}:${status}`]
      );
    }

    await client.query(
      `
        UPDATE public.businesses
        SET
          is_verified = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [
        isVerified,
        businessId
      ]
    );

    await client.query(
      `
        INSERT INTO public.business_verification_history (
          business_id,
          previous_status,
          new_status,
          reason,
          changed_by
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
        current.status,
        status,
        notes ?? null,
        adminUserId
      ]
    );

    const updatedResult =
      await client.query<BusinessVerificationRow>(
        `
          SELECT
            bv.id,
            bv.business_id,
            b.name AS business_name,
            b.email AS business_email,
            b.phone_number AS business_phone_number,
            b.city,
            b.state,
            b.is_active AS business_is_active,
            b.is_verified AS business_is_verified,
            b.verification_required,
            bv.status,
            bv.verified_by,
            bv.verification_notes,
            bv.verified_at,
            bv.created_at,
            bv.updated_at
          FROM public.business_verifications bv
          INNER JOIN public.businesses b
            ON b.id = bv.business_id
          WHERE bv.business_id = $1
        `,
        [businessId]
      );

    if (updatedResult.rows.length === 0) {
      throw new Error(
        "BUSINESS_VERIFICATION_NOT_FOUND"
      );
    }

    await client.query("COMMIT");

    return mapVerification(
      updatedResult.rows[0]
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}