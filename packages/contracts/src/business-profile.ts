import { z } from "zod";

import { locationSlugSchema, successEnvelope } from "./common";

const optionalBusinessProfileTextSchema = z.string().trim().min(1).nullable();

export const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1),
  tagline: optionalBusinessProfileTextSchema,
  addressLine1: optionalBusinessProfileTextSchema,
  addressLine2: optionalBusinessProfileTextSchema,
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: optionalBusinessProfileTextSchema,
  phone: optionalBusinessProfileTextSchema,
  email: optionalBusinessProfileTextSchema,
  instagramUrl: optionalBusinessProfileTextSchema,
  facebookUrl: optionalBusinessProfileTextSchema,
  hoursWeekday: optionalBusinessProfileTextSchema,
  hoursSaturday: optionalBusinessProfileTextSchema,
  hoursSunday: optionalBusinessProfileTextSchema,
  metaKeywords: optionalBusinessProfileTextSchema,
  metaDescription: optionalBusinessProfileTextSchema,
});

export const publicBusinessProfileResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    profile: businessProfileSchema.nullable(),
  }),
);

export const adminBusinessProfileResponseSchema = publicBusinessProfileResponseSchema;

export const adminBusinessProfileUpsertRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  profile: businessProfileSchema,
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
