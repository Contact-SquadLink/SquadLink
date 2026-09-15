import { z } from "zod";

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
      .min(7)
      .max(30)
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
      .optional()
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;