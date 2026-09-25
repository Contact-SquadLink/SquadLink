import { z } from "zod";
import { normalizePhoneNumber } from "../../utils/phone";

export const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(255),

  description: z
    .string()
    .trim()
    .max(5000)
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

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .optional(),

  addressLine: z
    .string()
    .trim()
    .min(3)
    .max(255),

  city: z
    .string()
    .trim()
    .min(2)
    .max(100),

  state: z
    .string()
    .trim()
    .min(2)
    .max(100),

  latitude: z
    .number()
    .finite()
    .min(-90)
    .max(90),

  longitude: z
    .number()
    .finite()
    .min(-180)
    .max(180),

  minimumOrderAmount: z
    .number()
    .int()
    .nonnegative()
    .default(0)
});

export type CreateBusinessInput =
  z.infer<typeof createBusinessSchema>;

export const operatingExceptionParamsSchema =
  z.object({
    exceptionId: z.string().uuid()
  });

export const businessProductParamsSchema =
  z.object({
    businessProductId: z.string().uuid()
  });


/**
 * Business operating days.
 *
 * These values must match the PostgreSQL day_of_week enum.
 */
export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
]);

export type DayOfWeek =
  z.infer<typeof dayOfWeekSchema>;


/**
 * HH:mm time format.
 *
 * PostgreSQL TIME values will be returned by the API
 * using this format.
 */
const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must use HH:mm format."
  );


/**
 * One weekly operating-hours entry.
 *
 * When isClosed is true, opensAt and closesAt are omitted.
 * When isClosed is false, both times are required.
 */
export const operatingHourSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,

    opensAt: timeSchema.optional(),

    closesAt: timeSchema.optional(),

    isClosed: z.boolean().default(false)
  })
  .superRefine((data, context) => {
    if (data.isClosed) {
      return;
    }

    if (!data.opensAt) {
      context.addIssue({
        code: "custom",
        path: ["opensAt"],
        message:
          "Opening time is required when the business is open."
      });
    }

    if (!data.closesAt) {
      context.addIssue({
        code: "custom",
        path: ["closesAt"],
        message:
          "Closing time is required when the business is open."
      });
    }

    if (
      data.opensAt &&
      data.closesAt &&
      data.opensAt === data.closesAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["closesAt"],
        message:
          "Opening and closing times cannot be identical."
      });
    }
  });

export type OperatingHourInput =
  z.infer<typeof operatingHourSchema>;


/**
 * Configure the complete weekly schedule.
 *
 * The backend expects exactly one entry for each day.
 */
export const updateOperatingHoursSchema = z.object({
  hours: z
    .array(operatingHourSchema)
    .length(
      7,
      "Exactly 7 operating-hour entries are required."
    )
});

export type UpdateOperatingHoursInput =
  z.infer<typeof updateOperatingHoursSchema>;


/**
 * Create a date-specific operating exception.
 *
 * An exception overrides the normal weekly schedule
 * for that particular date.
 */
export const createOperatingExceptionSchema = z
  .object({
    exceptionDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must use YYYY-MM-DD format."
      )
      .refine((value) => {
        const [year, month, day] = value
          .split("-")
          .map(Number);

        if (year < 1 || month < 1 || month > 12) {
          return false;
        }

        const daysInMonth = new Date(
          Date.UTC(
            2000 + (year % 400),
            month,
            0
          )
        ).getUTCDate();

        return day >= 1 && day <= daysInMonth;
      }, "Date must be a valid calendar date."),

    isClosed: z.boolean().default(true),

    opensAt: timeSchema.optional(),

    closesAt: timeSchema.optional(),

    reason: z
      .string()
      .trim()
      .max(255)
      .optional()
  })
  .superRefine((data, context) => {
    if (data.isClosed) {
      return;
    }

    if (!data.opensAt) {
      context.addIssue({
        code: "custom",
        path: ["opensAt"],
        message:
          "Opening time is required when the exception is not a closure."
      });
    }

    if (!data.closesAt) {
      context.addIssue({
        code: "custom",
        path: ["closesAt"],
        message:
          "Closing time is required when the exception is not a closure."
      });
    }

    if (
      data.opensAt &&
      data.closesAt &&
      data.opensAt === data.closesAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["closesAt"],
        message:
          "Opening and closing times cannot be identical."
      });
    }
  });

export type CreateOperatingExceptionInput =
  z.infer<typeof createOperatingExceptionSchema>;


/**
 * Updating an exception uses the same business rules
 * as creating one.
 */
export const updateOperatingExceptionSchema =
  createOperatingExceptionSchema;

export type UpdateOperatingExceptionInput =
  z.infer<typeof updateOperatingExceptionSchema>;