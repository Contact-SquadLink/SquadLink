import { z } from "zod";

const imageUrlSchema = z
  .string()
  .trim()
  .max(5000)
  .transform((val) => {
    if (!val) return null;
    if (
      !val.startsWith("http://") &&
      !val.startsWith("https://") &&
      !val.startsWith("/") &&
      !val.startsWith("data:")
    ) {
      return `https://${val}`;
    }
    return val;
  })
  .nullable()
  .optional();

export const createBusinessCatalogItemSchema = z.object({
  productId: z.string().uuid(),
  priceAmount: z.number().int().nonnegative(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageUrl: imageUrlSchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value === "NGN",
      "Currency must be NGN."
    )
    .default("NGN"),
  isAvailable: z.boolean().default(true)
});

export type CreateBusinessCatalogItemInput =
  z.infer<typeof createBusinessCatalogItemSchema>;

export const updateBusinessCatalogItemSchema = z.object({
  priceAmount: z.number().int().nonnegative().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageUrl: imageUrlSchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value === "NGN",
      "Currency must be NGN."
    )
    .optional(),
  isAvailable: z.boolean().optional()
});

export type UpdateBusinessCatalogItemInput =
  z.infer<typeof updateBusinessCatalogItemSchema>;