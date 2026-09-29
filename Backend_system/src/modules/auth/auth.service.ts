import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  findUserByPhoneNumber,
  findUserByUsername,
  updateUserProfile,
  createVerificationOtp,
  findValidVerificationOtp,
  markVerificationOtpUsed,
  markEmailVerified,
  markPhoneVerified,
  updateUserPassword,
  type UserRecord
} from "./auth.repository";
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  RequestOtpInput,
  VerifyOtpInput,
  ResetPasswordInput
} from "./auth.schemas";
import { createInAppNotification, notifyAdmins } from "../notification/notification.service";

const BCRYPT_ROUNDS = 12;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface SafeUser {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
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

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    adminApproved: user.adminApproved,
    approvedBy: user.approvedBy,
    approvedAt: user.approvedAt,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    profileUpdatedAt: user.profileUpdatedAt,
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

  return jwt.sign(payload, env.JWT_SECRET, options);
}

function maskIdentifier(val: string): string {
  if (val.includes("@")) {
    const [local, domain] = val.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${val.slice(0, 4)}****${val.slice(-3)}`;
}

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  if (input.email) {
    const existingEmail = await findUserByEmail(input.email);
    if (existingEmail) {
      throw new AppError("An account with this email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }
  }

  if (input.phoneNumber) {
    const existingPhone = await findUserByPhoneNumber(input.phoneNumber);
    if (existingPhone) {
      throw new AppError("An account with this phone number already exists.", 409, "PHONE_ALREADY_EXISTS");
    }
  }

  if (input.username) {
    const existingUsername = await findUserByUsername(input.username);
    if (existingUsername) {
      throw new AppError("This username is already taken. Please choose another one.", 409, "USERNAME_TAKEN");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await createUser(input, passwordHash);

  try {
    await createInAppNotification({
      userId: user.id,
      type: "ACCOUNT_CREATED",
      title: "Welcome to SquadLink!",
      message: `Welcome to SquadLink, @${user.username || user.firstName || "neighbor"}! Your account has been created. Discover local businesses, place orders, and track your deliveries.`,
      eventKey: `welcome:${user.id}`
    });

    await notifyAdmins({
      type: "ACCOUNT_CREATED",
      title: "New User Registered",
      message: `${user.firstName || user.email || "A user"} (@${user.username}) registered with role: ${user.role}.`,
      eventKeyPrefix: `admin-new-user:${user.id}`
    });
  } catch (notifErr) {
    console.error("[NOTIFICATION WARNING] Failed to deliver registration notifications:", notifErr);
  }

  return toSafeUser(user);
}

export async function authenticateUser(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByIdentifier(input.identifier);

  if (!user) {
    throw new AppError("Wrong email, phone number, username, or password.", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Wrong email, phone number, username, or password.", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("This account is inactive.", 403, "ACCOUNT_INACTIVE");
  }

  if (
    ["ADMIN", "SUPER_ADMIN"].includes(user.role) &&
    user.email !== "contact.squadlink@gmail.com" &&
    !user.adminApproved
  ) {
    throw new AppError("This admin account is pending approval from the main Squadlink admin.", 403, "ADMIN_ACCOUNT_PENDING_APPROVAL");
  }

  const accessToken = generateAccessToken(user);
  return {
    user: toSafeUser(user),
    accessToken
  };
}

export async function updateUserProfileService(
  userId: string,
  input: UpdateProfileInput
): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  }

  // Rate-limiting: profile editing allowed once every 7 days
  if (user.profileUpdatedAt) {
    const elapsed = Date.now() - new Date(user.profileUpdatedAt).getTime();
    if (elapsed < SEVEN_DAYS_MS) {
      const daysRemaining = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
      throw new AppError(
        `Profile details can only be edited once every 7 days to protect account security. You can make updates again in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        429,
        "PROFILE_UPDATE_RATE_LIMITED"
      );
    }
  }

  if (input.username && input.username.toLowerCase() !== user.username?.toLowerCase()) {
    const existing = await findUserByUsername(input.username);
    if (existing && existing.id !== userId) {
      throw new AppError("This username is already taken. Please choose another one.", 409, "USERNAME_TAKEN");
    }
  }

  const updated = await updateUserProfile(userId, input);
  return toSafeUser(updated);
}

export async function requestVerificationOtpService(
  userId: string | null,
  input: RequestOtpInput
) {
  let targetUser: UserRecord | null = null;
  let targetIdentifier: string;

  if (input.type === "EMAIL_VERIFICATION") {
    if (!userId) throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    targetUser = await findUserById(userId);
    if (!targetUser || !targetUser.email) throw new AppError("No email address registered for this account.", 400, "EMAIL_REQUIRED");
    if (targetUser.emailVerifiedAt) throw new AppError("Your email address is already verified.", 400, "ALREADY_VERIFIED");
    targetIdentifier = targetUser.email;
  } else if (input.type === "PHONE_VERIFICATION") {
    if (!userId) throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    targetUser = await findUserById(userId);
    if (!targetUser || !targetUser.phoneNumber) throw new AppError("No phone number registered for this account.", 400, "PHONE_REQUIRED");
    if (targetUser.phoneVerifiedAt) throw new AppError("Your phone number is already verified.", 400, "ALREADY_VERIFIED");
    targetIdentifier = targetUser.phoneNumber;
  } else {
    // PASSWORD_RESET
    if (!input.identifier) throw new AppError("Email or phone number is required for account recovery.", 400, "IDENTIFIER_REQUIRED");
    targetUser = await findUserByIdentifier(input.identifier);
    if (!targetUser) throw new AppError("No account found matching this email, phone, or username.", 404, "USER_NOT_FOUND");

    // CRITICAL USER REQUIREMENT: Only accounts with verified email or phone number can undergo recovery
    if (!targetUser.emailVerifiedAt && !targetUser.phoneVerifiedAt) {
      throw new AppError(
        "Account recovery requires a verified email or verified phone number. Neither has been verified on this account. Please contact administrative support at contact.squadlink@gmail.com for identity recovery.",
        403,
        "ACCOUNT_NOT_VERIFIED"
      );
    }

    targetIdentifier = targetUser.email || targetUser.phoneNumber || input.identifier;
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await createVerificationOtp(targetUser?.id ?? null, input.type, targetIdentifier, code, expiresAt);

  if (targetUser) {
    try {
      await createInAppNotification({
        userId: targetUser.id,
        type: "GENERAL",
        title: input.type === "PASSWORD_RESET" ? "Password Recovery Code" : "Verification Code",
        message: `Your SquadLink verification code is ${code}. It expires in 15 minutes.`,
        eventKey: `otp:${input.type}:${targetUser.id}:${Date.now()}`
      });
    } catch {
      // non-blocking
    }
  }

  return {
    success: true,
    message: `Verification code sent to ${maskIdentifier(targetIdentifier)}.`,
    expiresInMinutes: 15,
    // Return code in dev for rapid testing
    otpCode: env.NODE_ENV !== "production" ? code : undefined
  };
}

export async function confirmVerificationOtpService(
  userId: string,
  input: VerifyOtpInput
) {
  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const identifier = input.type === "EMAIL_VERIFICATION" ? user.email : user.phoneNumber;
  if (!identifier) {
    throw new AppError(`No ${input.type === "EMAIL_VERIFICATION" ? "email" : "phone number"} found on account.`, 400, "MISSING_IDENTIFIER");
  }

  const record = await findValidVerificationOtp(identifier, input.type, input.code);
  if (!record) {
    throw new AppError("Invalid or expired verification code.", 400, "INVALID_VERIFICATION_CODE");
  }

  await markVerificationOtpUsed(record.id);

  if (input.type === "EMAIL_VERIFICATION") {
    await markEmailVerified(userId);
  } else {
    await markPhoneVerified(userId);
  }

  const updatedUser = await findUserById(userId);
  return {
    success: true,
    message: `${input.type === "EMAIL_VERIFICATION" ? "Email" : "Phone number"} verified successfully!`,
    user: updatedUser ? toSafeUser(updatedUser) : null
  };
}

export async function resetPasswordService(input: ResetPasswordInput) {
  const user = await findUserByIdentifier(input.identifier);
  if (!user) {
    throw new AppError("Account not found.", 404, "USER_NOT_FOUND");
  }

  if (!user.emailVerifiedAt && !user.phoneVerifiedAt) {
    throw new AppError(
      "Account recovery requires a verified email or phone number.",
      403,
      "ACCOUNT_NOT_VERIFIED"
    );
  }

  const identifiersToCheck = [
    input.identifier.trim(),
    user.email,
    user.phoneNumber
  ].filter(Boolean) as string[];

  let validOtpRecord: { id: string } | null = null;
  for (const id of identifiersToCheck) {
    const record = await findValidVerificationOtp(id, "PASSWORD_RESET", input.code);
    if (record) {
      validOtpRecord = record;
      break;
    }
  }

  if (!validOtpRecord) {
    throw new AppError("Invalid or expired password reset code.", 400, "INVALID_RESET_CODE");
  }

  await markVerificationOtpUsed(validOtpRecord.id);

  const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await updateUserPassword(user.id, newHash);

  try {
    await createInAppNotification({
      userId: user.id,
      type: "GENERAL",
      title: "Password Updated",
      message: "Your SquadLink password was reset successfully. If you did not make this change, please contact support immediately.",
      eventKey: `pwd-reset-success:${user.id}:${Date.now()}`
    });
  } catch {
    // non-blocking
  }

  return {
    success: true,
    message: "Password reset successfully. You can now sign in with your new password."
  };
}
