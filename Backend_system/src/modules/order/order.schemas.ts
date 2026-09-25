import { z } from "zod";
import { normalizePhoneNumber } from "../../utils/phone";

const deliveryContactPhone = z
  .string()
  .trim()
  .min(10)
  .max(30)
  .transform((value, context) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid Nigerian phone number with +234 and 10 digits."
      });
      return z.NEVER;
    }
    return normalized;
  });

export const placeOrderSchema = z.object({
  deliveryAddressLine: z.string().trim().min(3).max(255),
  deliveryCity: z.string().trim().min(2).max(100),
  deliveryState: z.string().trim().min(2).max(100),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  deliveryContactPhone
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;