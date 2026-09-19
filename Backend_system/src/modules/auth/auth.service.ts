import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import {
  createUser,
  findUserByEmail,
  findUserByPhoneNumber,
  type UserRecord
} from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const BCRYPT_ROUNDS = 12;

export interface SafeUser {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
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

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
}

function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    adminApproved: user.adminApproved,
    approvedBy: user.approvedBy,
    approvedAt: user.approvedAt,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function generateAccessToken(user: UserRecord): string {
  const payload = {
    sub: user.id,
    role: user.role
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(
    payload,
    env.JWT_SECRET,
    options
  );
}

export async function registerUser(
  input: RegisterInput
): Promise<SafeUser> {
  if (input.email) {
    const existingEmail = await findUserByEmail(input.email);

    if (existingEmail) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }
  }

  if (input.phoneNumber) {
    const existingPhone = await findUserByPhoneNumber(
      input.phoneNumber
    );

    if (existingPhone) {
      throw new AppError(
        "An account with this phone number already exists.",
        409,
        "PHONE_ALREADY_EXISTS"
      );
    }
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    BCRYPT_ROUNDS
  );

  const user = await createUser(
    input,
    passwordHash
  );

  return toSafeUser(user);
}

export async function authenticateUser(
  input: LoginInput
): Promise<AuthResult> {
  const normalizedIdentifier = input.identifier
    .trim()
    .toLowerCase();

  const isEmailLogin = normalizedIdentifier.includes("@");

  const user = isEmailLogin
    ? await findUserByEmail(normalizedIdentifier)
    : await findUserByPhoneNumber(input.identifier.trim());

  const credentialError = isEmailLogin
    ? "Wrong email or password."
    : "Wrong phone number or password.";

  if (!user) {
    throw new AppError(
      credentialError,
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      credentialError,
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "This account is inactive.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  if (
    user.role === "ADMIN" &&
    user.email !== "contact.squadlink@gmail.com" &&
    !user.adminApproved
  ) {
    throw new AppError(
      "This admin account is pending approval from the main Squadlink admin.",
      403,
      "ADMIN_ACCOUNT_PENDING_APPROVAL"
    );
  }

  const accessToken = generateAccessToken(user);

  return {
    user: toSafeUser(user),
    accessToken
  };
}

