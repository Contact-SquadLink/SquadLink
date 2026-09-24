import { z } from "zod";

export const createBusinessCatalogItemSchema = z.object({
  productId: z.string().uuid(),
  priceAmount: z.number().int().nonnegative(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
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
  imageUrl: z.string().url().max(2000).nullable().optional(),
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