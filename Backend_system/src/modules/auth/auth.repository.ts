import type { PoolClient } from "pg";
import { randomBytes } from "node:crypto";

import { db } from "../../db/database";
import type { RegisterInput, UpdateProfileInput } from "./auth.schemas";

export interface UserRecord {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  passwordHash: string;
  role: string;
  isActive: boolean;
  adminApproved: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  profileUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
  password_hash: string;
  role: string;
  is_active: boolean;
  admin_approved: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
  profile_updated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface VerificationRecord {
  id: string;
  userId: string | null;
  type: string;
  identifier: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    adminApproved: row.admin_approved,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    profileUpdatedAt: row.profile_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const USER_COLUMNS = `
  id,
  email,
  phone_number,
  first_name,
  last_name,
  username,
  avatar_url,
  password_hash,
  role,
  is_active,
  admin_approved,
  approved_by,
  approved_at,
  email_verified_at,
  phone_verified_at,
  profile_updated_at,
  created_at,
  updated_at
`;

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT ${USER_COLUMNS}
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
}

export async function findUserByPhoneNumber(
  phoneNumber: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT ${USER_COLUMNS}
      FROM public.users
      WHERE phone_number = $1
      LIMIT 1
    `,
    [phoneNumber]
  );

  return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
}

export async function findUserByUsername(
  username: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT ${USER_COLUMNS}
      FROM public.users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [username]
  );

  return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
}

export async function findUserByIdentifier(
  identifier: string
): Promise<UserRecord | null> {
  const clean = identifier.trim().toLowerCase();
  const result = await db.query<UserRow>(
    `
      SELECT ${USER_COLUMNS}
      FROM public.users
      WHERE LOWER(email) = $1
         OR phone_number = $2
         OR LOWER(username) = $1
      LIMIT 1
    `,
    [clean, identifier.trim()]
  );

  return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
}

export async function findUserById(
  userId: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT ${USER_COLUMNS}
      FROM public.users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows.length > 0 ? mapUser(result.rows[0]) : null;
}

export async function generateUniqueUsername(
  firstName?: string | null,
  lastName?: string | null,
  preferred?: string | null
): Promise<string> {
  let base: string;
  if (preferred && preferred.trim().length >= 3) {
    base = preferred.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  } else if (firstName && firstName.trim().length > 0) {
    base = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  } else if (lastName && lastName.trim().length > 0) {
    base = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  } else {
    base = "user";
  }

  if (base.length < 3) base = "user";

  const suffix = randomBytes(2).toString("hex");
  let candidate = `${base}_${suffix}`;

  let attempts = 0;
  while (attempts < 10) {
    const existing = await findUserByUsername(candidate);
    if (!existing) return candidate;
    candidate = `${base}_${randomBytes(2).toString("hex")}`;
    attempts++;
  }

  return `${base}_${Date.now().toString(36).slice(-4)}`;
}

export async function createUser(
  input: RegisterInput,
  passwordHash: string,
  client?: PoolClient
): Promise<UserRecord> {
  const executor = client ?? db;

  const username = await generateUniqueUsername(
    input.firstName,
    input.lastName,
    input.username
  );

  const result = await executor.query<UserRow>(
    `
      INSERT INTO public.users (
        email,
        phone_number,
        first_name,
        last_name,
        username,
        password_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${USER_COLUMNS}
    `,
    [
      input.email ?? null,
      input.phoneNumber ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      username,
      passwordHash
    ]
  );

  return mapUser(result.rows[0]);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserRecord> {
  const fields: string[] = ["updated_at = NOW()", "profile_updated_at = NOW()"];
  const values: unknown[] = [userId];
  let idx = 2;

  if (input.firstName !== undefined) {
    fields.push(`first_name = $${idx++}`);
    values.push(input.firstName || null);
  }

  if (input.lastName !== undefined) {
    fields.push(`last_name = $${idx++}`);
    values.push(input.lastName || null);
  }

  if (input.username !== undefined) {
    fields.push(`username = $${idx++}`);
    values.push(input.username.toLowerCase());
  }

  if (input.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(input.avatarUrl || null);
  }

  const query = `
    UPDATE public.users
    SET ${fields.join(", ")}
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
  `;

  const result = await db.query<UserRow>(query, values);
  if (result.rows.length === 0) {
    throw new Error("USER_NOT_FOUND");
  }

  return mapUser(result.rows[0]);
}

export async function createVerificationOtp(
  userId: string | null,
  type: string,
  identifier: string,
  code: string,
  expiresAt: Date
): Promise<VerificationRecord> {
  const result = await db.query<{
    id: string;
    user_id: string | null;
    type: string;
    identifier: string;
    code: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
  }>(
    `
      INSERT INTO public.user_verifications (
        user_id,
        type,
        identifier,
        code,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, type, identifier, code, expires_at, used_at, created_at
    `,
    [userId, type, identifier, code, expiresAt]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    identifier: row.identifier,
    code: row.code,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at
  };
}

export async function findValidVerificationOtp(
  identifier: string,
  type: string,
  code: string
): Promise<VerificationRecord | null> {
  const result = await db.query<{
    id: string;
    user_id: string | null;
    type: string;
    identifier: string;
    code: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
  }>(
    `
      SELECT id, user_id, type, identifier, code, expires_at, used_at, created_at
      FROM public.user_verifications
      WHERE identifier = $1
        AND type = $2
        AND code = $3
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [identifier, type, code]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    identifier: row.identifier,
    code: row.code,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at
  };
}

export async function markVerificationOtpUsed(id: string): Promise<void> {
  await db.query(
    `UPDATE public.user_verifications SET used_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db.query(
    `UPDATE public.users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export async function markPhoneVerified(userId: string): Promise<void> {
  await db.query(
    `UPDATE public.users SET phone_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await db.query(
    `UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  );
}