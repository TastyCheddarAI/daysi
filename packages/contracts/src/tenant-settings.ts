import { z } from "zod";

import { locationSlugSchema, successEnvelope } from "./common";
import { featureModuleSchema } from "./platform";

type TenantSettingJsonValue =
  | null
  | boolean
  | number
  | string
  | TenantSettingJsonValue[]
  | { [key: string]: TenantSettingJsonValue };

export const tenantSettingKeySchema = z.string().trim().min(1).regex(/^[A-Za-z0-9.-]+$/);
export const tenantSettingJsonValueSchema: z.ZodType<TenantSettingJsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(tenantSettingJsonValueSchema),
    z.record(z.string(), tenantSettingJsonValueSchema),
  ]),
);
export const tenantSettingValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.array(z.string().min(1)),
  tenantSettingJsonValueSchema,
]);
export const tenantSettingValueTypeSchema = z.enum([
  "boolean",
  "number",
  "string",
  "string_array",
  "json",
]);

export const locationFeatureFlagsSchema = z.object({
  education: z.boolean(),
  memberships: z.boolean(),
  referrals: z.boolean(),
  skinAnalysis: z.boolean(),
});

export const locationFeatureFlagSchema = z.object({
  feature: featureModuleSchema,
  settingKey: tenantSettingKeySchema,
  enabled: z.boolean(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  updatedByUserId: z.string().min(1).optional(),
});

export const tenantSettingSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  key: tenantSettingKeySchema,
  valueType: tenantSettingValueTypeSchema,
  value: tenantSettingValueSchema,
  updatedAt: z.string().datetime({ offset: true }),
  updatedByUserId: z.string().min(1).optional(),
});

export const tenantSettingsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    featureFlags: locationFeatureFlagsSchema,
    settings: z.array(tenantSettingSchema),
  }),
);

export const tenantSettingResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    featureFlags: locationFeatureFlagsSchema,
    setting: tenantSettingSchema,
  }),
);

export const locationFeatureFlagsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    featureFlags: locationFeatureFlagsSchema,
    flags: z.array(locationFeatureFlagSchema),
  }),
);

export const locationFeatureFlagResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    featureFlags: locationFeatureFlagsSchema,
    flag: locationFeatureFlagSchema,
  }),
);

export const tenantSettingUpsertRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  key: tenantSettingKeySchema,
  value: tenantSettingValueSchema,
});

export const locationFeatureFlagUpdateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  enabled: z.boolean(),
});
