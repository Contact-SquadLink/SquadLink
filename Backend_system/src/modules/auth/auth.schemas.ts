import { z } from "zod";
import { normalizePhoneNumber } from "../../utils/phone";

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(255)
      .optional(),

    phoneNumber: z
      .string()
      .trim()
      .min(10)
      .max(30)
      .transform((value, context) => {
        const normalized = normalizePhoneNumber(value);
        if (!normalized) {
          context.addIssue({ code: "custom", message: "Phone number must be a valid Nigerian number with +234 and 10 digits." });
          return z.NEVER;
        }
        return normalized;
      })
      .optional(),

    password: z
      .string()
      .min(8)
      .max(128),

    firstName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    lastName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores.")
      .toLowerCase()
      .optional(),

    termsAccepted: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must agree to SquadLink's Terms of Service and Privacy Policy, and certify that all provided information is accurate."
      })
  })
  .refine(
    (data) => Boolean(data.email || data.phoneNumber),
    {
      message: "Email or phone number is required.",
      path: ["email"]
    }
  );

export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1)
      .max(255),

    password: z
      .string()
      .min(1)
      .max(128)
  });

export const updateProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must not exceed 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores.")
    .toLowerCase()
    .optional(),
  avatarUrl: z.string().trim().max(5000000).optional().nullable()
});

export const requestOtpSchema = z.object({
  type: z.enum(["EMAIL_VERIFICATION", "PHONE_VERIFICATION", "PASSWORD_RESET"]),
  identifier: z.string().trim().min(1).max(255).optional()
});

export const verifyOtpSchema = z.object({
  type: z.enum(["EMAIL_VERIFICATION", "PHONE_VERIFICATION"]),
  code: z.string().trim().min(4).max(10)
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1).max(255)
});

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  code: z.string().trim().min(4).max(10),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;