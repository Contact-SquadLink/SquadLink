import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().default("1h"),

  CORS_ORIGIN: z.string().min(1),

  VAPID_PUBLIC_KEY: z.string().optional(),

  VAPID_PRIVATE_KEY: z.string().optional(),

  VAPID_SUBJECT: z.string().default("mailto:support@squadlink.app"),

  SANDBOX_PAYMENTS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
});

export const env = envSchema.parse(process.env);