import { z } from "zod";

import {
  apiVersionSchema,
  isoTimestampSchema,
  locationSlugSchema,
  successEnvelope,
  tenantSlugSchema,
} from "./common";

export const featureModuleSchema = z.enum([
  "education",
  "memberships",
  "referrals",
  "skinAnalysis",
]);

export const organizationOperatingModeSchema = z.enum(["corporate", "franchise"]);

export const tenantOrganizationSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  operatingMode: organizationOperatingModeSchema,
});

export const tenantLocationSummarySchema = z.object({
  id: z.string().min(1),
  slug: locationSlugSchema,
  name: z.string().min(1),
  organizationId: z.string().min(1),
  enabledModules: z.array(featureModuleSchema),
});

export const healthDataSchema = z.object({
  service: z.literal("api"),
  status: z.enum(["ok", "degraded"]),
  db: z.enum(["ok", "error"]).optional(),
  apiVersion: apiVersionSchema,
  environment: z.string().min(1),
  time: isoTimestampSchema,
});

export const healthResponseSchema = successEnvelope(healthDataSchema);

export const platformConfigDataSchema = z.object({
  brandName: z.string().min(1),
  brandSlug: tenantSlugSchema,
  primaryDomain: z.string().min(1),
  apiVersion: apiVersionSchema,
  environment: z.string().min(1),
  organizations: z.array(tenantOrganizationSummarySchema),
  locations: z.array(tenantLocationSummarySchema),
});

export const platformConfigResponseSchema = successEnvelope(platformConfigDataSchema);

export const tenantLocationsResponseSchema = successEnvelope(
  z.object({
    tenantSlug: tenantSlugSchema,
    locations: z.array(tenantLocationSummarySchema),
  }),
);

export type FeatureModule = z.infer<typeof featureModuleSchema>;
export type TenantOrganizationSummary = z.infer<typeof tenantOrganizationSummarySchema>;
export type TenantLocationSummary = z.infer<typeof tenantLocationSummarySchema>;
