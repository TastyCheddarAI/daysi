import { z } from "zod";

import {
  isoTimestampSchema,
  locationSlugSchema,
  moneySchema,
  successEnvelope,
} from "./common";

export const servicePackageOfferSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  status: z.enum(["draft", "published"]),
  price: moneySchema,
  serviceCredits: z.array(
    z.object({
      serviceSlug: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  featureTags: z.array(z.string().min(1)),
});

export const servicePackagePurchaseStatusSchema = z.enum([
  "pending_payment",
  "active",
  "revoked",
]);

export const servicePackagePurchaseSchema = z.object({
  id: z.string().min(1),
  packageSlug: z.string().min(1),
  locationSlug: locationSlugSchema,
  status: servicePackagePurchaseStatusSchema,
  actorUserId: z.string().min(1).optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  sourceOrderId: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  activatedAt: isoTimestampSchema.optional(),
  revokedAt: isoTimestampSchema.optional(),
});

export const servicePackageBalanceSchema = z.object({
  packagePurchaseId: z.string().min(1),
  packageSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  totalQuantity: z.number().int().nonnegative(),
  usedQuantity: z.number().int().nonnegative(),
  remainingQuantity: z.number().int().nonnegative(),
});

export const publicServicePackagesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    servicePackages: z.array(servicePackageOfferSchema),
  }),
);

export const adminServicePackagesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    servicePackages: z.array(servicePackageOfferSchema),
  }),
);

export const adminServicePackageResponseSchema = successEnvelope(
  z.object({
    servicePackage: servicePackageOfferSchema,
  }),
);

export const adminServicePackageCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  status: z.enum(["draft", "published"]),
  price: moneySchema,
  serviceCredits: z
    .array(
      z.object({
        serviceSlug: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  featureTags: z.array(z.string().trim().min(1)).default([]),
});

export const adminServicePackageUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    shortDescription: z.string().trim().min(1).optional(),
    status: z.enum(["draft", "published"]).optional(),
    price: moneySchema.optional(),
    serviceCredits: z
      .array(
        z.object({
          serviceSlug: z.string().trim().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1)
      .optional(),
    featureTags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one package field must be provided.",
  });

export const myServicePackagesResponseSchema = successEnvelope(
  z.object({
    purchases: z.array(
      z.object({
        purchase: servicePackagePurchaseSchema,
        servicePackage: servicePackageOfferSchema,
        balances: z.array(servicePackageBalanceSchema),
      }),
    ),
  }),
);
