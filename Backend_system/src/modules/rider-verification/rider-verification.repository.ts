import { db } from "../../db/database";
import type { RiderVerificationStatus } from "./rider-verification.schemas";

export interface RiderVerificationRecord {
  id: string;
  riderId: string;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  vehicleType: string | null;
  vehicleRegistration: string | null;
  riderIsActive: boolean;
  status: RiderVerificationStatus;
  verifiedBy: string | null;
  verificationNotes: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiderVerificationHistoryRecord {
  id: string;
  riderId: string;
  previousStatus: RiderVerificationStatus | null;
  newStatus: RiderVerificationStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

interface VerificationRow {
  id: string;
  rider_id: string;
  user_id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  rider_is_active: boolean;
  status: RiderVerificationStatus;
  verified_by: string | null;
  verification_notes: string | null;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface HistoryRow {
  id: string;
  rider_id: string;
  previous_status: RiderVerificationStatus | null;
  new_status: RiderVerificationStatus;
  reason: string | null;
  changed_by: string | null;
  created_at: Date;
}

const verificationSelect = `
  SELECT
    rv.id,
    rv.rider_id,
    u.id AS user_id,
    u.email,
    u.phone_number,
    u.first_name,
    u.last_name,
    vt.code::text AS vehicle_type,
    v.registration_number AS vehicle_registration,
    r.is_active AS rider_is_active,
    rv.status,
    rv.verified_by,
    rv.verification_notes,
    rv.verified_at,
    rv.created_at,
    rv.updated_at
  FROM public.rider_verifications rv
  INNER JOIN public.riders r ON r.id = rv.rider_id
  INNER JOIN public.users u ON u.id = r.user_id
  LEFT JOIN public.vehicles v ON v.rider_id = r.id AND v.is_active = TRUE
  LEFT JOIN public.vehicle_types vt ON vt.id = v.vehicle_type_id
`;

function mapVerification(row: VerificationRow): RiderVerificationRecord {
  return {
    id: row.id,
    riderId: row.rider_id,
    userId: row.user_id,
    email: row.email,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    vehicleType: row.vehicle_type,
    vehicleRegistration: row.vehicle_registration,
    riderIsActive: row.rider_is_active,
    status: row.status,
    verifiedBy: row.verified_by,
    verificationNotes: row.verification_notes,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHistory(row: HistoryRow): RiderVerificationHistoryRecord {
  return {
    id: row.id,
    riderId: row.rider_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    reason: row.reason,
    changedBy: row.changed_by,
    createdAt: row.created_at
  };
}

export async function findRiderVerifications(
  status?: RiderVerificationStatus
): Promise<RiderVerificationRecord[]> {
  const result = await db.query<VerificationRow>(
    `
      ${verificationSelect}
      WHERE $1::public.rider_verification_status IS NULL
        OR rv.status = $1
      ORDER BY
        CASE rv.status
          WHEN 'PENDING' THEN 1
          WHEN 'REJECTED' THEN 2
          WHEN 'SUSPENDED' THEN 3
          WHEN 'VERIFIED' THEN 4
        END,
        rv.created_at ASC
    `,
    [status ?? null]
  );

  return result.rows.map(mapVerification);
}

export async function findRiderVerificationByRiderId(
  riderId: string
): Promise<RiderVerificationRecord | null> {
  const result = await db.query<VerificationRow>(
    `${verificationSelect} WHERE rv.rider_id = $1 LIMIT 1`,
    [riderId]
  );

  return result.rows.length > 0 ? mapVerification(result.rows[0]) : null;
}

export async function findRiderVerificationHistory(
  riderId: string
): Promise<RiderVerificationHistoryRecord[]> {
  const result = await db.query<HistoryRow>(
    `
      SELECT id, rider_id, previous_status, new_status, reason, changed_by, created_at
      FROM public.rider_verification_history
      WHERE rider_id = $1
      ORDER BY created_at ASC
    `,
    [riderId]
  );

  return result.rows.map(mapHistory);
}

export async function updateRiderVerification(
  riderId: string,
  adminUserId: string,
  status: RiderVerificationStatus,
  notes: string | null
): Promise<RiderVerificationRecord> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const currentResult = await client.query<{
      id: string;
      rider_id: string;
      user_id: string;
      status: RiderVerificationStatus;
    }>(
      `
        SELECT rv.id, rv.rider_id, r.user_id, rv.status
        FROM public.rider_verifications rv
        INNER JOIN public.riders r ON r.id = rv.rider_id
        WHERE rv.rider_id = $1
        FOR UPDATE
      `,
      [riderId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error("RIDER_VERIFICATION_NOT_FOUND");
    }

    const current = currentResult.rows[0];
    if (current.status === status) {
      throw new Error("RIDER_VERIFICATION_NO_CHANGE");
    }

    const verified = status === "VERIFIED";
    await client.query(
      `
        UPDATE public.rider_verifications
        SET
          status = $1,
          verified_by = CASE WHEN $2::boolean THEN $3::uuid ELSE NULL END,
          verification_notes = $4,
          verified_at = CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE rider_id = $5
      `,
      [status, verified, adminUserId, notes ?? null, riderId]
    );

    await client.query(
      `
        UPDATE public.riders
        SET is_active = $1, is_available = FALSE, updated_at = NOW()
        WHERE id = $2
      `,
      [verified, riderId]
    );

    await client.query(
      `
        UPDATE public.users
        SET role = CASE WHEN $1::public.rider_verification_status = 'VERIFIED'
                        THEN 'RIDER'::public.user_role
                        ELSE 'CUSTOMER'::public.user_role END,
            updated_at = NOW()
        WHERE id = $2
      `,
      [status, current.user_id]
    );

    const notificationType = status === "VERIFIED"
      ? "RIDER_APPLICATION_APPROVED"
      : status === "REJECTED"
        ? "RIDER_APPLICATION_REJECTED"
        : null;
    if (notificationType) {
      const title = status === "VERIFIED"
        ? "Rider application approved"
        : "Rider application rejected";
      const message = status === "VERIFIED"
        ? "Your rider application has been approved. Complete your profile and set yourself available when ready."
        : `Your rider application was rejected.${notes ? ` Reason: ${notes}` : " Please review your details and contact support."}`;
      await client.query(
        `
          INSERT INTO public.notifications (user_id, type, channel, status, title, message, event_key)
          VALUES ($1, $2::public.notification_type, 'IN_APP', 'SENT', $3, $4, $5)
          ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
        `,
        [current.user_id, notificationType, title, message, `rider-verification:${riderId}:${status}`]
      );
    }

    await client.query(
      `
        INSERT INTO public.rider_verification_history
          (rider_id, previous_status, new_status, reason, changed_by)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [riderId, current.status, status, notes ?? null, adminUserId]
    );

    const updated = await client.query<VerificationRow>(
      `${verificationSelect} WHERE rv.rider_id = $1 LIMIT 1`,
      [riderId]
    );

    await client.query("COMMIT");
    return mapVerification(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
