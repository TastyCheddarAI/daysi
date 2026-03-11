import { z } from "zod";

import {
  currencyCodeSchema,
  locationSlugSchema,
  successEnvelope,
} from "./common";

export const pricingModeSchema = z.enum(["retail", "membership"]);

export const catalogPriceSummarySchema = z.object({
  currency: currencyCodeSchema,
  retailAmountCents: z.number().int().nonnegative(),
  memberAmountCents: z.number().int().nonnegative().optional(),
  membershipRequired: z.boolean(),
});

export const bookingPolicySummarySchema = z.object({
  cancellationWindowHours: z.number().int().nonnegative(),
  bufferMinutes: z.number().int().nonnegative(),
  requiresDeposit: z.boolean(),
});

export const publicServiceSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  variantSlug: z.string().min(1),
  categorySlug: z.string().min(1),
  locationSlug: locationSlugSchema,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  bookable: z.boolean(),
  price: catalogPriceSummarySchema,
  machineCapabilities: z.array(z.string().min(1)),
  roomCapabilities: z.array(z.string().min(1)).default([]),
  featureTags: z.array(z.string().min(1)),
});

export const publicServiceDetailSchema = publicServiceSummarySchema.extend({
  description: z.string().min(1),
  bookingPolicy: bookingPolicySummarySchema,
});

export const publicProductSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  price: z.object({
    currency: currencyCodeSchema,
    amountCents: z.number().int().nonnegative(),
  }),
});

export const publicEducationOfferSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  status: z.enum(["draft", "published"]),
  moduleSlugs: z.array(z.string().min(1)).min(1),
  membershipEligible: z.boolean(),
  staffGrantEnabled: z.boolean(),
  requiresEntitlement: z.literal(true),
  price: z.object({
    currency: currencyCodeSchema,
    amountCents: z.number().int().nonnegative(),
    isFree: z.boolean(),
  }),
});

export const publicServicesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    services: z.array(publicServiceSummarySchema),
  }),
);

export const publicServiceDetailResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    service: publicServiceDetailSchema,
  }),
);

export const publicProductsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    products: z.array(publicProductSummarySchema),
  }),
);

export const publicEducationOffersResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    educationOffers: z.array(publicEducationOfferSummarySchema),
  }),
);

export type PricingMode = z.infer<typeof pricingModeSchema>;
