import {
  buildLocationFeatureFlagEntries,
  type LocationFeature,
  type LocationFeatureFlagEntry,
  type TenantSetting,
  type TenantLocation,
} from "../../../packages/domain/src";

import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";

export const getLocationForFeatureControl = (
  env: AppEnv,
  locationSlug: string,
): TenantLocation | undefined =>
  getRuntimeTenantContext(env).locations.find((location) => location.slug === locationSlug);

export const isLocationFeatureEnabled = (
  env: AppEnv,
  locationSlug: string,
  feature: LocationFeature,
): boolean => {
  const location = getLocationForFeatureControl(env, locationSlug);
  return !!location?.enabledModules.includes(feature);
};

export const listLocationFeatureFlags = (input: {
  location: TenantLocation;
  settings: TenantSetting[];
}): LocationFeatureFlagEntry[] =>
  buildLocationFeatureFlagEntries({
    location: input.location,
    settings: input.settings,
  });
