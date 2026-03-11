import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminCouponCreateRequestSchema,
  adminCouponResponseSchema,
  adminCouponsResponseSchema,
  adminCouponUpdateRequestSchema,
} from "../../../packages/contracts/src";
import {
  getCouponByCode,
  listCouponsForLocation,
  normalizeCouponCode,
  type AppActor,
  type CouponDefinition,
} from "../../../packages/domain/src";

import { getRuntimeClinicData, upsertCouponDefinition } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalCoupon,
} from "./persistence/canonical-definition-writes";

const matchAdminCouponPath = (
  pathname: string,
): { couponCode: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 4 && segments[0] === "v1" && segments[1] === "admin" && segments[2] === "coupons") {
    return {
      couponCode: segments[3],
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

const normalizeCouponInput = (
  coupon: CouponDefinition,
): CouponDefinition => ({
  ...coupon,
  code: normalizeCouponCode(coupon.code),
  percentOff: coupon.discountType === "percent" ? coupon.percentOff : undefined,
  amountOff: coupon.discountType === "fixed_amount" ? coupon.amountOff : undefined,
});

export const handlePromotionRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);

  if (input.method === "GET" && input.pathname === "/v1/admin/coupons") {
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
      adminCouponsResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          coupons: listCouponsForLocation(clinicData.coupons, locationSlug),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/coupons") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCouponCreateRequestSchema.parse(body),
      );
      const clinicData = getRuntimeClinicData(input.env);
      const existing = getCouponByCode(
        clinicData.coupons,
        payload.locationSlug,
        payload.code,
      );

      if (existing) {
        sendError(input.response, 409, "conflict", "Coupon already exists.");
        return true;
      }

      const nextCoupon = normalizeCouponInput({
        id: `cpn_${randomUUID()}`,
        code: payload.code,
        name: payload.name,
        locationSlug: payload.locationSlug,
        status: payload.status,
        stackable: payload.stackable,
        discountType: payload.discountType,
        percentOff: payload.percentOff,
        amountOff: payload.amountOff,
        appliesToKinds: payload.appliesToKinds,
        appliesToRevenueStreams: payload.appliesToRevenueStreams,
        eligibleReferenceIds: payload.eligibleReferenceIds,
      });
      const coupon = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalCoupon(input.env, nextCoupon),
          getCouponByCode(
            getRuntimeClinicData(input.env).coupons,
            nextCoupon.locationSlug,
            nextCoupon.code,
          ) ?? nextCoupon)
        : upsertCouponDefinition(nextCoupon);

      sendJson(
        input.response,
        201,
        adminCouponResponseSchema.parse({
          ok: true,
          data: {
            coupon,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid coupon request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const couponMatch = matchAdminCouponPath(input.pathname);
  if (couponMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCouponUpdateRequestSchema.parse(body),
      );
      const clinicData = getRuntimeClinicData(input.env);
      const existing = getCouponByCode(
        clinicData.coupons,
        payload.locationSlug,
        couponMatch.couponCode,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Coupon not found.");
        return true;
      }

      const nextCoupon = normalizeCouponInput({
        ...existing,
        ...payload,
        code: existing.code,
        name: payload.name ?? existing.name,
        status: payload.status ?? existing.status,
        stackable: payload.stackable ?? existing.stackable,
        discountType: payload.discountType ?? existing.discountType,
        percentOff:
          payload.discountType === "percent"
            ? payload.percentOff
            : payload.percentOff ?? existing.percentOff,
        amountOff:
          payload.discountType === "fixed_amount"
            ? payload.amountOff
            : payload.amountOff ?? existing.amountOff,
        appliesToKinds: payload.appliesToKinds ?? existing.appliesToKinds,
        appliesToRevenueStreams:
          payload.appliesToRevenueStreams ?? existing.appliesToRevenueStreams,
        eligibleReferenceIds:
          payload.eligibleReferenceIds ?? existing.eligibleReferenceIds,
      });
      const coupon = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalCoupon(input.env, nextCoupon),
          getCouponByCode(
            getRuntimeClinicData(input.env).coupons,
            nextCoupon.locationSlug,
            nextCoupon.code,
          ) ?? nextCoupon)
        : upsertCouponDefinition(nextCoupon);

      sendJson(
        input.response,
        200,
        adminCouponResponseSchema.parse({
          ok: true,
          data: {
            coupon,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid coupon update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
