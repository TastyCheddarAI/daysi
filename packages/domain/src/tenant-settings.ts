import { randomUUID } from "node:crypto";

import type { LocationFeature, TenantLocation } from "./tenanting";

export type TenantSettingJsonValue =
  | null
  | boolean
  | number
  | string
  | TenantSettingJsonValue[]
  | { [key: string]: TenantSettingJsonValue };
export type TenantSettingValue =
  | boolean
  | number
  | string
  | string[]
  | Exclude<TenantSettingJsonValue, boolean | number | string | string[]>;
export type TenantSettingValueType =
  | "boolean"
  | "number"
  | "string"
  | "string_array"
  | "json";
export type LocationFeatureSettingKey =
  | "feature.education"
  | "feature.memberships"
  | "feature.referrals"
  | "feature.skinAnalysis";

export interface TenantSetting {
  id: string;
  locationSlug: string;
  key: string;
  valueType: TenantSettingValueType;
  value: TenantSettingValue;
  updatedAt: string;
  updatedByUserId?: string;
}

export interface LocationFeatureFlags {
  education: boolean;
  memberships: boolean;
  referrals: boolean;
  skinAnalysis: boolean;
}

export interface LocationFeatureFlagEntry {
  feature: LocationFeature;
  settingKey: LocationFeatureSettingKey;
  enabled: boolean;
  updatedAt?: string;
  updatedByUserId?: string;
}

const featureSettingKeyMap: Record<LocationFeature, LocationFeatureSettingKey> = {
  education: "feature.education",
  memberships: "feature.memberships",
  referrals: "feature.referrals",
  skinAnalysis: "feature.skinAnalysis",
};

const determineValueType = (value: TenantSettingValue): TenantSettingValueType => {
  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "string") {
    return "string";
  }

  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "string") ? "string_array" : "json";
  }

  return "json";
};

export const createTenantSetting = (input: {
  locationSlug: string;
  key: string;
  value: TenantSettingValue;
  updatedByUserId?: string;
  now?: string;
}): TenantSetting => ({
  id: `tset_${randomUUID()}`,
  locationSlug: input.locationSlug,
  key: input.key,
  valueType: determineValueType(input.value),
  value: input.value,
  updatedAt: input.now ?? new Date().toISOString(),
  updatedByUserId: input.updatedByUserId,
});

export const updateTenantSetting = (input: {
  setting: TenantSetting;
  value: TenantSettingValue;
  updatedByUserId?: string;
  now?: string;
}): TenantSetting => ({
  ...input.setting,
  valueType: determineValueType(input.value),
  value: input.value,
  updatedAt: input.now ?? new Date().toISOString(),
  updatedByUserId: input.updatedByUserId,
});

export const buildLocationFeatureFlags = (
  location: TenantLocation,
): LocationFeatureFlags => ({
  education: location.enabledModules.includes("education"),
  memberships: location.enabledModules.includes("memberships"),
  referrals: location.enabledModules.includes("referrals"),
  skinAnalysis: location.enabledModules.includes("skinAnalysis"),
});

export const buildLocationFeatureSettingKey = (
  feature: LocationFeature,
): LocationFeatureSettingKey => featureSettingKeyMap[feature];

export const buildLocationFeatureFlagEntries = (input: {
  location: TenantLocation;
  settings: TenantSetting[];
}): LocationFeatureFlagEntry[] =>
  (["education", "memberships", "referrals", "skinAnalysis"] as const).map((feature) => {
    const settingKey = buildLocationFeatureSettingKey(feature);
    const setting = input.settings.find((entry) => entry.key === settingKey);

    return {
      feature,
      settingKey,
      enabled: input.location.enabledModules.includes(feature),
      updatedAt: setting?.updatedAt,
      updatedByUserId: setting?.updatedByUserId,
    };
  });

export const setLocationFeatureFlag = (input: {
  location: TenantLocation;
  feature: LocationFeature;
  enabled: boolean;
}): TenantLocation => {
  const nextEnabledModules = input.enabled
    ? [...new Set([...input.location.enabledModules, input.feature])]
    : input.location.enabledModules.filter((feature) => feature !== input.feature);

  return {
    ...input.location,
    enabledModules: nextEnabledModules,
  };
};
