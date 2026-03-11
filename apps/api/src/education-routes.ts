import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminEducationOfferCreateRequestSchema,
  adminEducationOfferResponseSchema,
  adminEducationOffersResponseSchema,
  adminEducationOfferUpdateRequestSchema,
  publicEducationCatalogResponseSchema,
} from "../../../packages/contracts/src";
import {
  getEducationOfferBySlug,
  listAdminEducationOffersForLocation,
  listEducationOffersForLocation,
  type AppActor,
  type EducationOffer,
} from "../../../packages/domain/src";

import { getRuntimeClinicData, upsertEducationOffer } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalEducationOffer,
} from "./persistence/canonical-definition-writes";

const matchAdminEducationOfferPath = (
  pathname: string,
): { offerSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "education" &&
    segments[3] === "offers"
  ) {
    return {
      offerSlug: segments[4],
    };
  }

  return null;
};

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const normalizeOfferSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("Education offer slug is invalid.");
  }

  return normalized;
};

const normalizeEducationOffer = (
  offer: Omit<EducationOffer, "price"> & {
    price: { currency: string; amountCents: number; isFree: boolean };
  },
): EducationOffer => ({
  ...offer,
  slug: normalizeOfferSlug(offer.slug),
  requiresEntitlement: true,
  price: {
    currency: offer.price.currency,
    amountCents: offer.price.isFree ? 0 : offer.price.amountCents,
    isFree: offer.price.isFree,
  },
});

export const handleEducationRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);

  if (input.method === "GET" && input.pathname === "/v1/public/education/offers") {
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!isLocationFeatureEnabled(input.env, locationSlug, "education")) {
      sendError(input.response, 409, "conflict", "Education is not enabled at this location.");
      return true;
    }
    const clinicData = getRuntimeClinicData(input.env);

    sendJson(
      input.response,
      200,
      publicEducationCatalogResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          educationOffers: listEducationOffersForLocation(clinicData.catalog, locationSlug),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/education/offers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const clinicData = getRuntimeClinicData(input.env);

    sendJson(
      input.response,
      200,
      adminEducationOffersResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          educationOffers: listAdminEducationOffersForLocation(
            clinicData.catalog,
            locationSlug,
          ),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/education/offers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationOfferCreateRequestSchema.parse(body),
      );

      const nextOffer = normalizeEducationOffer({
        id: `edu_${randomUUID()}`,
        slug: payload.slug,
        locationSlug: payload.locationSlug,
        title: payload.title,
        shortDescription: payload.shortDescription,
        status: payload.status,
        moduleSlugs: payload.moduleSlugs,
        membershipEligible: payload.membershipEligible,
        staffGrantEnabled: payload.staffGrantEnabled,
        requiresEntitlement: true,
        price: payload.price,
      });
      const offer = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalEducationOffer({
            env: input.env,
            offer: nextOffer,
          }),
          getEducationOfferBySlug(
            getRuntimeClinicData(input.env).catalog,
            nextOffer.locationSlug,
            nextOffer.slug,
            { includeDraft: true },
          ) ?? nextOffer)
        : upsertEducationOffer(nextOffer);

      sendJson(
        input.response,
        201,
        adminEducationOfferResponseSchema.parse({
          ok: true,
          data: {
            educationOffer: offer,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid education offer request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const adminOfferMatch = matchAdminEducationOfferPath(input.pathname);
  if (adminOfferMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminEducationOfferUpdateRequestSchema.parse(body),
      );
      const clinicData = getRuntimeClinicData(input.env);
      const existingOffer = getEducationOfferBySlug(
        clinicData.catalog,
        payload.locationSlug,
        adminOfferMatch.offerSlug,
        { includeDraft: true },
      );

      if (!existingOffer) {
        sendError(input.response, 404, "not_found", "Education offer not found.");
        return true;
      }

      const nextOffer = normalizeEducationOffer({
        ...existingOffer,
        ...payload,
        slug: existingOffer.slug,
        moduleSlugs: payload.moduleSlugs ?? existingOffer.moduleSlugs,
        membershipEligible:
          payload.membershipEligible ?? existingOffer.membershipEligible,
        staffGrantEnabled:
          payload.staffGrantEnabled ?? existingOffer.staffGrantEnabled,
        status: payload.status ?? existingOffer.status,
        price: payload.price ?? existingOffer.price,
      });
      const updatedOffer = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalEducationOffer({
            env: input.env,
            offer: nextOffer,
          }),
          getEducationOfferBySlug(
            getRuntimeClinicData(input.env).catalog,
            nextOffer.locationSlug,
            nextOffer.slug,
            { includeDraft: true },
          ) ?? nextOffer)
        : upsertEducationOffer(nextOffer);

      sendJson(
        input.response,
        200,
        adminEducationOfferResponseSchema.parse({
          ok: true,
          data: {
            educationOffer: updatedOffer,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid education offer update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
