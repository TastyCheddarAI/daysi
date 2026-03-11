import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminBusinessProfileResponseSchema,
  adminBusinessProfileUpsertRequestSchema,
  businessProfileSchema,
  publicBusinessProfileResponseSchema,
  type BusinessProfile,
} from "../../../packages/contracts/src";
import {
  canManageLocation,
  createTenantSetting,
  updateTenantSetting,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";

const BUSINESS_PROFILE_SETTING_KEY = "business.profile";

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

const matchPublicBusinessProfilePath = (
  pathname: string,
): { locationSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "public" &&
    segments[2] === "locations" &&
    segments[4] === "business-profile"
  ) {
    return {
      locationSlug: segments[3],
    };
  }

  return null;
};

const readStoredBusinessProfile = async (
  repositories: AppRepositories,
  locationSlug: string,
): Promise<BusinessProfile | null> => {
  const setting = await repositories.configuration.tenantSettings.get(
    locationSlug,
    BUSINESS_PROFILE_SETTING_KEY,
  );
  if (!setting) {
    return null;
  }

  return businessProfileSchema.parse(setting.value);
};

export const handleBusinessProfileRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const publicMatch = matchPublicBusinessProfilePath(input.pathname);
  const isAdminBusinessProfilePath = input.pathname === "/v1/admin/business-profile";

  if (!publicMatch && !isAdminBusinessProfilePath) {
    return false;
  }

  const tenant = getRuntimeTenantContext(input.env);

  if (publicMatch) {
    if (input.method !== "GET") {
      return false;
    }

    const location = tenant.locations.find((entry) => entry.slug === publicMatch.locationSlug);
    if (!location) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      publicBusinessProfileResponseSchema.parse({
        ok: true,
        data: {
          locationSlug: location.slug,
          profile: await readStoredBusinessProfile(input.repositories, location.slug),
        },
      }),
    );
    return true;
  }

  if (!requireAdminActor(input.actor)) {
    sendError(input.response, 403, "forbidden", "Admin access is required.");
    return true;
  }

  const url = buildUrl(input.request, input.env);

  if (input.method === "GET") {
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Location business profile access is restricted.");
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
      adminBusinessProfileResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          profile: await readStoredBusinessProfile(input.repositories, locationSlug),
        },
      }),
    );
    return true;
  }

  if (input.method === "PUT") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminBusinessProfileUpsertRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Location business profile access is restricted.");
        return true;
      }

      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const existing = await input.repositories.configuration.tenantSettings.get(
        payload.locationSlug,
        BUSINESS_PROFILE_SETTING_KEY,
      );
      const setting = existing
        ? updateTenantSetting({
            setting: existing,
            value: payload.profile,
            updatedByUserId: input.actor.userId,
          })
        : createTenantSetting({
            locationSlug: payload.locationSlug,
            key: BUSINESS_PROFILE_SETTING_KEY,
            value: payload.profile,
            updatedByUserId: input.actor.userId,
          });
      await input.repositories.configuration.tenantSettings.save(setting);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "business.profile.updated",
        entityType: "tenant_setting",
        entityId: setting.id,
        summary: `Updated business profile for ${payload.locationSlug}`,
        metadata: {
          key: BUSINESS_PROFILE_SETTING_KEY,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        adminBusinessProfileResponseSchema.parse({
          ok: true,
          data: {
            locationSlug: payload.locationSlug,
            profile: payload.profile,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid business profile request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
