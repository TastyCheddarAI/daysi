import type { IncomingMessage, ServerResponse } from "node:http";

import {
  locationFeatureFlagResponseSchema,
  locationFeatureFlagsResponseSchema,
  locationFeatureFlagUpdateRequestSchema,
  tenantSettingResponseSchema,
  tenantSettingsResponseSchema,
  tenantSettingUpsertRequestSchema,
} from "../../../packages/contracts/src";
import {
  buildLocationFeatureFlagEntries,
  buildLocationFeatureSettingKey,
  buildLocationFeatureFlags,
  canManageLocation,
  createTenantSetting,
  setLocationFeatureFlag,
  updateTenantSetting,
  type AppActor,
  type LocationFeature,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeTenantContext, upsertTenantLocation } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import { listLocationFeatureFlags } from "./location-feature-support";
import type { AppRepositories } from "./persistence/app-repositories";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalLocationFeatureFlags,
} from "./persistence/canonical-definition-writes";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const ensureScopedAdminAccess = (
  actor: AppActor | null,
  locationSlug: string,
): boolean => !!actor && canManageLocation(actor, "admin.location.manage", locationSlug);

const featureKeyToModule = new Map<string, LocationFeature>([
  ["feature.education", "education"],
  ["feature.memberships", "memberships"],
  ["feature.referrals", "referrals"],
  ["feature.skinAnalysis", "skinAnalysis"],
]);

const matchLocationFeatureFlagPath = (
  pathname: string,
): { feature: LocationFeature } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "location-feature-flags"
  ) {
    const feature = segments[3] === undefined ? undefined : segments[3];
    if (
      feature === "education" ||
      feature === "memberships" ||
      feature === "referrals" ||
      feature === "skinAnalysis"
    ) {
      return {
        feature,
      };
    }
  }

  return null;
};

export const handleTenantSettingRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const isTenantSettingPath = input.pathname === "/v1/admin/tenant-settings";
  const isLocationFeatureFlagsPath =
    input.pathname === "/v1/admin/location-feature-flags" ||
    !!matchLocationFeatureFlagPath(input.pathname);

  if (!isTenantSettingPath && !isLocationFeatureFlagsPath) {
    return false;
  }

  if (!requireAdminActor(input.actor)) {
    sendError(input.response, 403, "forbidden", "Admin access is required.");
    return true;
  }

  const url = buildUrl(input.request, input.env);
  const tenant = getRuntimeTenantContext(input.env);

  if (input.pathname === "/v1/admin/location-feature-flags") {
    if (input.method !== "GET") {
      return false;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location feature flag access is restricted.");
      return true;
    }
    const location = tenant.locations.find((entry) => entry.slug === locationSlug);
    if (!location) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      locationFeatureFlagsResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          featureFlags: buildLocationFeatureFlags(location),
          flags: listLocationFeatureFlags({
            location,
            settings: await input.repositories.configuration.tenantSettings.list(locationSlug),
          }),
        },
      }),
    );
    return true;
  }

  const featureFlagMatch = matchLocationFeatureFlagPath(input.pathname);
  if (featureFlagMatch) {
    if (input.method !== "PATCH") {
      return false;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        locationFeatureFlagUpdateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location feature flag access is restricted.");
        return true;
      }
      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const nextLocation = setLocationFeatureFlag({
        location,
        feature: featureFlagMatch.feature,
        enabled: payload.enabled,
      });
      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalLocationFeatureFlags({
          env: input.env,
          locationSlug: nextLocation.slug,
          enabledModules: nextLocation.enabledModules,
        });
      } else {
        upsertTenantLocation(nextLocation);
      }
      const key = buildLocationFeatureSettingKey(featureFlagMatch.feature);
      const existing = await input.repositories.configuration.tenantSettings.get(
        payload.locationSlug,
        key,
      );
      const setting = existing
        ? updateTenantSetting({
            setting: existing,
            value: payload.enabled,
            updatedByUserId: input.actor.userId,
          })
        : createTenantSetting({
            locationSlug: payload.locationSlug,
            key,
            value: payload.enabled,
            updatedByUserId: input.actor.userId,
          });
      await input.repositories.configuration.tenantSettings.save(setting);

      const flag = buildLocationFeatureFlagEntries({
        location: nextLocation,
        settings: await input.repositories.configuration.tenantSettings.list(
          payload.locationSlug,
        ),
      }).find((entry) => entry.feature === featureFlagMatch.feature);
      if (!flag) {
        throw new Error("Location feature flag state could not be resolved.");
      }

      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "location.feature_flag.updated",
        entityType: "tenant_setting",
        entityId: setting.id,
        summary: `Set feature ${featureFlagMatch.feature} to ${payload.enabled ? "enabled" : "disabled"}`,
        metadata: {
          feature: featureFlagMatch.feature,
          enabled: payload.enabled,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        locationFeatureFlagResponseSchema.parse({
          ok: true,
          data: {
            locationSlug: payload.locationSlug,
            featureFlags: buildLocationFeatureFlags(nextLocation),
            flag,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid location feature flag request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (isTenantSettingPath && input.method === "GET") {
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location tenant setting access is restricted.");
      return true;
    }
    const location = tenant.locations.find((entry) => entry.slug === locationSlug);
    if (!location) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      tenantSettingsResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          featureFlags: buildLocationFeatureFlags(location),
          settings: await input.repositories.configuration.tenantSettings.list(locationSlug),
        },
      }),
    );
    return true;
  }

  if (isTenantSettingPath && input.method === "PUT") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        tenantSettingUpsertRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location tenant setting access is restricted.");
        return true;
      }
      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const featureModule = featureKeyToModule.get(payload.key);
      let nextLocation = location;
      if (featureModule) {
        if (typeof payload.value !== "boolean") {
          sendError(
            input.response,
            400,
            "validation_error",
            "Feature settings must use boolean values.",
          );
          return true;
        }

        nextLocation = setLocationFeatureFlag({
          location,
          feature: featureModule,
          enabled: payload.value,
        });
        if (isCanonicalDefinitionWriteEnabled(input.env)) {
          await persistCanonicalLocationFeatureFlags({
            env: input.env,
            locationSlug: nextLocation.slug,
            enabledModules: nextLocation.enabledModules,
          });
        } else {
          upsertTenantLocation(nextLocation);
        }
      }

      const existing = await input.repositories.configuration.tenantSettings.get(
        payload.locationSlug,
        payload.key,
      );
      const setting = existing
        ? updateTenantSetting({
            setting: existing,
            value: payload.value,
            updatedByUserId: input.actor.userId,
          })
        : createTenantSetting({
            locationSlug: payload.locationSlug,
            key: payload.key,
            value: payload.value,
            updatedByUserId: input.actor.userId,
          });
      await input.repositories.configuration.tenantSettings.save(setting);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "tenant.setting.upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        summary: `Updated tenant setting ${payload.key}`,
        metadata: {
          key: payload.key,
          value: payload.value,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        tenantSettingResponseSchema.parse({
          ok: true,
          data: {
            locationSlug: payload.locationSlug,
            featureFlags: buildLocationFeatureFlags(nextLocation),
            setting,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid tenant setting request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
