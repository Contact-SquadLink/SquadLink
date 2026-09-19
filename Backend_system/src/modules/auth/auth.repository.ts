import type { PoolClient } from "pg";

import { db } from "../../db/database";
import type { RegisterInput } from "./auth.schemas";

export interface UserRecord {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  passwordHash: string;
  role: string;
  isActive: boolean;
  adminApproved: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  password_hash: string;
  role: string;
  is_active: boolean;
  admin_approved: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    adminApproved: row.admin_approved,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT
        id,
        email,
        phone_number,
        first_name,
        last_name,
        password_hash,
        role,
        is_active,
        admin_approved,
        approved_by,
        approved_at,
        email_verified_at,
        phone_verified_at,
        created_at,
        updated_at
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows.length > 0
    ? mapUser(result.rows[0])
    : null;
}

export async function findUserByPhoneNumber(
  phoneNumber: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT
        id,
        email,
        phone_number,
        first_name,
        last_name,
        password_hash,
        role,
        is_active,
        admin_approved,
        approved_by,
        approved_at,
        email_verified_at,
        phone_verified_at,
        created_at,
        updated_at
      FROM public.users
      WHERE phone_number = $1
      LIMIT 1
    `,
    [phoneNumber]
  );

  return result.rows.length > 0
    ? mapUser(result.rows[0])
    : null;
}

export async function findUserById(
  userId: string
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
      SELECT
        id,
        email,
        phone_number,
        first_name,
        last_name,
        password_hash,
        role,
        is_active,
        admin_approved,
        approved_by,
        approved_at,
        email_verified_at,
        phone_verified_at,
        created_at,
        updated_at
      FROM public.users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows.length > 0
    ? mapUser(result.rows[0])
    : null;
}

export async function createUser(
  input: RegisterInput,
  passwordHash: string,
  client?: PoolClient
): Promise<UserRecord> {
  const executor = client ?? db;

  const result = await executor.query<UserRow>(
    `
      INSERT INTO public.users (
        email,
        phone_number,
        first_name,
        last_name,
        password_hash
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        email,
        phone_number,
        first_name,
        last_name,
        password_hash,
        role,
        is_active,
        admin_approved,
        approved_by,
        approved_at,
        email_verified_at,
        phone_verified_at,
        created_at,
        updated_at
    `,
    [
      input.email ?? null,
      input.phoneNumber ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      passwordHash
    ]
  );

  return mapUser(result.rows[0]);
}