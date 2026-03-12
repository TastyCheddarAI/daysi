import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminBookingCancelRequestSchema,
  adminBookingMutationResponseSchema,
  adminBookingRescheduleRequestSchema,
  adminBookingsResponseSchema,
  adminBookingListQuerySchema,
  availabilitySearchRequestSchema,
  availabilitySearchResponseSchema,
  bookingResponseSchema,
  cancelBookingRequestSchema,
  createBookingRequestSchema,
  createBookingResponseSchema,
  publicEducationOffersResponseSchema,
  publicProductsResponseSchema,
  publicServicePackagesResponseSchema,
  publicServiceDetailResponseSchema,
  publicServicesResponseSchema,
  rebookingOptionsQuerySchema,
  rebookingOptionsResponseSchema,
  rescheduleBookingRequestSchema,
} from "../../../packages/contracts/src";
import {
  cancelBookingRecord,
  canManageLocation,
  createBookingRecord,
  getServiceBySlug,
  listServicePackageOffersForLocation,
  listEducationOffersForLocation,
  listProductsForLocation,
  listServicesForLocation,
  resolveRebookingSearchWindow,
  rescheduleBookingRecord,
  treatmentPlanIncludesService,
  type AppActor,
} from "../../../packages/domain/src";

import { findSlotById, getServiceAvailability } from "./availability-support";
import { recordOperationalMetricEvent } from "./analytics-support";
import { getRuntimeClinicData, getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
} from "./email-service";
import { readJsonBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
import type { AppRepositories } from "./persistence/app-repositories";
import type { StoredBookingRecord } from "./persistence/commerce-repository";

const matchCatalogPath = (
  pathname: string,
):
  | { type: "services"; locationSlug: string }
  | { type: "service-detail"; locationSlug: string; serviceSlug: string }
  | { type: "products"; locationSlug: string }
  | { type: "packages"; locationSlug: string }
  | { type: "education-offers"; locationSlug: string }
  | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length >= 6 &&
    segments[0] === "v1" &&
    segments[1] === "public" &&
    segments[2] === "locations" &&
    segments[4] === "catalog"
  ) {
    if (segments.length === 6 && segments[5] === "services") {
      return { type: "services", locationSlug: segments[3] };
    }

    if (segments.length === 7 && segments[5] === "services") {
      return {
        type: "service-detail",
        locationSlug: segments[3],
        serviceSlug: segments[6],
      };
    }

    if (segments.length === 6 && segments[5] === "products") {
      return { type: "products", locationSlug: segments[3] };
    }

    if (segments.length === 6 && segments[5] === "packages") {
      return { type: "packages", locationSlug: segments[3] };
    }

    if (segments.length === 6 && segments[5] === "education-offers") {
      return { type: "education-offers", locationSlug: segments[3] };
    }
  }

  return null;
};

const matchBookingPath = (
  pathname: string,
):
  | { type: "get"; bookingId: string }
  | { type: "cancel"; bookingId: string }
  | { type: "reschedule"; bookingId: string }
  | { type: "rebooking-options"; bookingId: string }
  | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 3 && segments[0] === "v1" && segments[1] === "bookings") {
    return {
      type: "get",
      bookingId: segments[2],
    };
  }

  if (segments.length === 4 && segments[0] === "v1" && segments[1] === "bookings") {
    if (segments[3] === "cancel") {
      return { type: "cancel", bookingId: segments[2] };
    }

    if (segments[3] === "reschedule") {
      return { type: "reschedule", bookingId: segments[2] };
    }

    if (segments[3] === "rebooking-options") {
      return { type: "rebooking-options", bookingId: segments[2] };
    }
  }

  return null;
};

const matchAdminBookingMutationPath = (
  pathname: string,
): { type: "cancel" | "reschedule"; bookingId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "bookings"
  ) {
    if (segments[4] === "cancel") {
      return {
        type: "cancel",
        bookingId: segments[3],
      };
    }

    if (segments[4] === "reschedule") {
      return {
        type: "reschedule",
        bookingId: segments[3],
      };
    }
  }

  return null;
};

const requireIdempotencyKey = (request: IncomingMessage): string | null => {
  const header = request.headers["idempotency-key"];

  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }

  return null;
};

const respondFromIdempotencyCache = async (
  repositories: AppRepositories,
  response: ServerResponse,
  scope: string,
  key: string,
): Promise<boolean> => {
  const cached = await repositories.reliability.idempotency.get(scope, key);
  if (!cached) {
    return false;
  }

  sendJson(response, cached.statusCode, cached.payload);
  return true;
};

const canAccessStoredBooking = (input: {
  stored: StoredBookingRecord;
  actor: AppActor | null;
  managementToken?: string;
}): boolean =>
  !!(
    input.actor?.roles.some((role) => ["staff", "admin", "owner"].includes(role)) ||
    (input.actor?.userId && input.stored.booking.actorUserId === input.actor.userId) ||
    (input.managementToken && input.managementToken === input.stored.managementToken)
  );

const listScopedBookingLocations = (input: {
  actor: AppActor | null;
  env: AppEnv;
  requestedLocationSlug?: string;
}): string[] => {
  if (!input.actor) {
    return [];
  }

  const actor = input.actor;

  if (input.requestedLocationSlug) {
    return canManageLocation(
      actor,
      "booking.manage.location",
      input.requestedLocationSlug,
    )
      ? [input.requestedLocationSlug]
      : [];
  }

  return getRuntimeTenantContext(input.env).locations
    .filter((location) =>
      canManageLocation(actor, "booking.manage.location", location.slug),
    )
    .map((location) => location.slug);
};

const validateTreatmentPlanContext = async (input: {
  treatmentPlanId?: string;
  actor: AppActor | null;
  locationSlug: string;
  serviceSlug: string;
  repositories: AppRepositories;
}): Promise<
  | {
      ok: true;
      treatmentPlan?: Awaited<
        ReturnType<AppRepositories["clinicalIntelligence"]["treatmentPlans"]["get"]>
      >;
    }
  | {
  ok: false;
  statusCode: number;
  code: "unauthorized" | "forbidden" | "not_found" | "conflict";
  message: string;
    }
> => {
  if (!input.treatmentPlanId) {
    return { ok: true };
  }

  const treatmentPlan = await input.repositories.clinicalIntelligence.treatmentPlans.get(
    input.treatmentPlanId,
  );
  if (!treatmentPlan) {
    return {
      ok: false,
      statusCode: 404,
      code: "not_found",
      message: "Referenced treatment plan not found.",
    };
  }
  if (treatmentPlan.locationSlug !== input.locationSlug) {
    return {
      ok: false,
      statusCode: 409,
      code: "conflict",
      message: "Referenced treatment plan belongs to a different location.",
    };
  }
  if (treatmentPlan.status !== "accepted") {
    return {
      ok: false,
      statusCode: 409,
      code: "conflict",
      message: "Referenced treatment plan must be accepted before booking.",
    };
  }
  if (!treatmentPlanIncludesService(treatmentPlan, input.serviceSlug)) {
    return {
      ok: false,
      statusCode: 409,
      code: "conflict",
      message: "Referenced treatment plan does not include this service.",
    };
  }
  if (!input.actor) {
    return {
      ok: false,
      statusCode: 401,
      code: "unauthorized",
      message: "Authenticated access is required for treatment-plan conversion.",
    };
  }
  if (
    input.actor.roles.some((role) => ["admin", "owner"].includes(role)) &&
    canManageLocation(input.actor, "admin.customer.manage", input.locationSlug)
  ) {
    return {
      ok: true,
      treatmentPlan,
    };
  }
  if (treatmentPlan.customerEmail !== input.actor.email?.toLowerCase()) {
    return {
      ok: false,
      statusCode: 403,
      code: "forbidden",
      message: "Referenced treatment plan does not belong to this customer.",
    };
  }

  return {
    ok: true,
    treatmentPlan,
  };
};

export const handleCatalogRoutes = (
  method: string,
  pathname: string,
  response: ServerResponse,
  env: AppEnv,
): boolean => {
  if (method !== "GET") {
    return false;
  }

  const match = matchCatalogPath(pathname);
  if (!match) {
    return false;
  }

  const clinicData = getRuntimeClinicData(env);

  if (match.type === "services") {
    sendJson(
      response,
      200,
      publicServicesResponseSchema.parse({
        ok: true,
        data: {
          locationSlug: match.locationSlug,
          services: listServicesForLocation(clinicData.catalog, match.locationSlug),
        },
      }),
    );
    return true;
  }

  if (match.type === "service-detail") {
    const service = getServiceBySlug(clinicData.catalog, match.locationSlug, match.serviceSlug);
    if (!service) {
      sendError(response, 404, "not_found", "Service not found.");
      return true;
    }

    sendJson(
      response,
      200,
      publicServiceDetailResponseSchema.parse({
        ok: true,
        data: {
          locationSlug: match.locationSlug,
          service,
        },
      }),
    );
    return true;
  }

  if (match.type === "products") {
    sendJson(
      response,
      200,
      publicProductsResponseSchema.parse({
        ok: true,
        data: {
          locationSlug: match.locationSlug,
          products: listProductsForLocation(clinicData.catalog, match.locationSlug),
        },
      }),
    );
    return true;
  }

  if (match.type === "packages") {
    sendJson(
      response,
      200,
      publicServicePackagesResponseSchema.parse({
        ok: true,
        data: {
          locationSlug: match.locationSlug,
          servicePackages: listServicePackageOffersForLocation(
            clinicData.catalog,
            match.locationSlug,
          ),
        },
      }),
    );
    return true;
  }

  if (!isLocationFeatureEnabled(env, match.locationSlug, "education")) {
    sendError(response, 409, "conflict", "Education is not enabled at this location.");
    return true;
  }

  sendJson(
    response,
    200,
    publicEducationOffersResponseSchema.parse({
      ok: true,
      data: {
        locationSlug: match.locationSlug,
        educationOffers: listEducationOffersForLocation(clinicData.catalog, match.locationSlug),
      },
    }),
  );
  return true;
};

export const handleAvailabilityAndBookingRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const clinicData = getRuntimeClinicData(input.env);

  if (input.method === "GET" && input.pathname === "/v1/admin/bookings") {
    if (!input.actor) {
      sendError(input.response, 403, "forbidden", "Admin or staff access is required.");
      return true;
    }

    try {
      const url = new URL(
        input.request.url ?? "/",
        `http://${input.request.headers.host ?? `${input.env.DAYSI_API_HOST}:${input.env.DAYSI_API_PORT}`}`,
      );
      const query = adminBookingListQuerySchema.parse({
        locationSlug: url.searchParams.get("locationSlug") ?? undefined,
        fromDate: url.searchParams.get("fromDate") ?? undefined,
        toDate: url.searchParams.get("toDate") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        providerSlug: url.searchParams.get("providerSlug") ?? undefined,
        customerEmail: url.searchParams.get("customerEmail") ?? undefined,
      });
      const scopedLocationSlugs = listScopedBookingLocations({
        actor: input.actor,
        env: input.env,
        requestedLocationSlug: query.locationSlug,
      });

      if (scopedLocationSlugs.length === 0) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Booking access is restricted for the requested scope.",
        );
        return true;
      }

      const bookings = (await input.repositories.commerce.bookings.listAll())
        .filter((booking) => scopedLocationSlugs.includes(booking.locationSlug))
        .filter((booking) =>
          query.status ? booking.status === query.status : true,
        )
        .filter((booking) =>
          query.providerSlug ? booking.providerSlug === query.providerSlug : true,
        )
        .filter((booking) =>
          query.customerEmail
            ? booking.customer.email === query.customerEmail.toLowerCase()
            : true,
        )
        .filter((booking) =>
          query.fromDate ? booking.startAt.slice(0, 10) >= query.fromDate : true,
        )
        .filter((booking) =>
          query.toDate ? booking.startAt.slice(0, 10) <= query.toDate : true,
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt));

      sendJson(
        input.response,
        200,
        adminBookingsResponseSchema.parse({
          ok: true,
          data: {
            bookings,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid admin booking query.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/public/availability/search") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        availabilitySearchRequestSchema.parse(body),
      );
      const treatmentPlanContext = await validateTreatmentPlanContext({
        treatmentPlanId: payload.treatmentPlanId,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        serviceSlug: payload.serviceSlug,
        repositories: input.repositories,
      });
      if (!treatmentPlanContext.ok) {
        sendError(
          input.response,
          treatmentPlanContext.statusCode,
          treatmentPlanContext.code,
          treatmentPlanContext.message,
        );
        return true;
      }
      const availability = await getServiceAvailability({
        env: input.env,
        repositories: input.repositories,
        locationSlug: payload.locationSlug,
        serviceSlug: payload.serviceSlug,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        pricingMode: payload.pricingMode,
        preferredProviderSlug: payload.preferredProviderSlug,
      });

      if (!availability.service) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }
      if (availability.missingLocationSchedule) {
        sendError(input.response, 404, "not_found", "Location schedule not found.");
        return true;
      }

      sendJson(
        input.response,
        200,
        availabilitySearchResponseSchema.parse({
          ok: true,
          data: {
            locationSlug: payload.locationSlug,
            serviceSlug: payload.serviceSlug,
            pricingMode: payload.pricingMode,
            slots: availability.slots,
          },
        }),
      );
      await recordOperationalMetricEvent({
        repositories: input.repositories,
        eventType: "availability_search",
        locationSlug: payload.locationSlug,
        serviceSlug: payload.serviceSlug,
        providerSlug: payload.preferredProviderSlug,
        actorUserId: input.actor?.userId,
        customerEmail: input.actor?.email,
        occurredAt: new Date().toISOString(),
        metadata: {
          fromDate: payload.fromDate,
          toDate: payload.toDate,
          pricingMode: payload.pricingMode,
          slotCount: availability.slots.length,
          sourceTreatmentPlanId: treatmentPlanContext.treatmentPlan?.id,
        },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/public/bookings") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for booking creation.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        "booking.create",
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        createBookingRequestSchema.parse(body),
      );
      const service = getServiceBySlug(clinicData.catalog, payload.locationSlug, payload.serviceSlug);

      if (!service) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }

      if (service.variantSlug !== payload.serviceVariantSlug) {
        sendError(input.response, 409, "conflict", "Service variant does not match current catalog.");
        return true;
      }

      const treatmentPlanContext = await validateTreatmentPlanContext({
        treatmentPlanId: payload.treatmentPlanId,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        serviceSlug: payload.serviceSlug,
        repositories: input.repositories,
      });
      if (!treatmentPlanContext.ok) {
        sendError(
          input.response,
          treatmentPlanContext.statusCode,
          treatmentPlanContext.code,
          treatmentPlanContext.message,
        );
        return true;
      }

      const sourceAssessment =
        payload.assessmentId
          ? await input.repositories.clinicalIntelligence.skinAssessments.getById(
              payload.assessmentId,
            )
          : treatmentPlanContext.treatmentPlan
            ? await input.repositories.clinicalIntelligence.skinAssessments.getById(
                treatmentPlanContext.treatmentPlan.sourceAssessmentId,
              )
            : undefined;
      if (
        payload.assessmentId &&
        treatmentPlanContext.treatmentPlan &&
        payload.assessmentId !== treatmentPlanContext.treatmentPlan.sourceAssessmentId
      ) {
        sendError(
          input.response,
          409,
          "conflict",
          "Assessment reference does not match the selected treatment plan.",
        );
        return true;
      }
      if (payload.assessmentId && !sourceAssessment) {
        sendError(input.response, 404, "not_found", "Referenced skin assessment not found.");
        return true;
      }
      if (sourceAssessment && sourceAssessment.locationSlug !== payload.locationSlug) {
        sendError(
          input.response,
          409,
          "conflict",
          "Referenced skin assessment belongs to a different location.",
        );
        return true;
      }
      if (
        sourceAssessment &&
        sourceAssessment.customerEmail !== payload.customer.email.toLowerCase()
      ) {
        sendError(
          input.response,
          409,
          "conflict",
          "Referenced skin assessment does not belong to this customer.",
        );
        return true;
      }

      const slot = await findSlotById({
        env: input.env,
        repositories: input.repositories,
        slotId: payload.slotId,
        locationSlug: payload.locationSlug,
        serviceSlug: payload.serviceSlug,
        pricingMode: payload.pricingMode,
      });

      if (!slot) {
        sendError(input.response, 409, "conflict", "Selected slot is no longer available.");
        return true;
      }

      const draft = createBookingRecord({
        service,
        slot,
        customer: payload.customer,
        sourceAssessmentId: sourceAssessment?.id,
        sourceTreatmentPlanId: treatmentPlanContext.treatmentPlan?.id,
        requestedPricingMode: payload.pricingMode,
        actorUserId: input.actor?.userId,
        notes: payload.notes,
      });
      const parsedPayload = createBookingResponseSchema.parse({
        ok: true,
        data: {
          booking: draft.booking,
          managementToken: draft.managementToken,
        },
      });

      await input.repositories.commerce.bookings.save(
        draft.booking,
        draft.managementToken,
      );
      await recordOperationalMetricEvent({
        repositories: input.repositories,
        eventType: "booking_created",
        locationSlug: draft.booking.locationSlug,
        serviceSlug: draft.booking.serviceSlug,
        machineSlug: draft.booking.machineSlug,
        providerSlug: draft.booking.providerSlug,
        actorUserId: draft.booking.actorUserId,
        customerEmail: draft.booking.customer.email,
        referenceId: draft.booking.id,
        occurredAt: draft.booking.createdAt,
        metadata: {
          pricingMode: draft.booking.charge.appliedPricingMode,
          finalAmountCents: draft.booking.charge.finalAmountCents,
          roomSlug: draft.booking.roomSlug,
          roomName: draft.booking.roomName,
          sourceAssessmentId: draft.booking.sourceAssessmentId,
          sourceTreatmentPlanId: draft.booking.sourceTreatmentPlanId,
        },
      });
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: draft.booking.locationSlug,
        customerEmail: draft.booking.customer.email,
        customerName: `${draft.booking.customer.firstName} ${draft.booking.customer.lastName}`.trim(),
        actorUserId: draft.booking.actorUserId,
        source: "booking",
        eventType: "booking.created",
        payload: {
          bookingId: draft.booking.id,
          serviceSlug: draft.booking.serviceSlug,
          providerSlug: draft.booking.providerSlug,
          machineSlug: draft.booking.machineSlug,
          roomSlug: draft.booking.roomSlug,
          sourceAssessmentId: draft.booking.sourceAssessmentId,
          sourceTreatmentPlanId: draft.booking.sourceTreatmentPlanId,
          startAt: draft.booking.startAt,
        },
        occurredAt: draft.booking.createdAt,
      });
      await input.repositories.reliability.idempotency.save({
        scope: "booking.create",
        key: idempotencyKey,
        response: {
          statusCode: 201,
          payload: parsedPayload,
        },
      });

      // Fire-and-forget — email failure must never break the booking response
      const tenantContext = getRuntimeTenantContext(input.env);
      const durationMs =
        new Date(draft.booking.endAt).getTime() - new Date(draft.booking.startAt).getTime();
      sendBookingConfirmation(input.env, {
        customerName: `${draft.booking.customer.firstName} ${draft.booking.customer.lastName}`.trim(),
        customerEmail: draft.booking.customer.email ?? "",
        serviceName: draft.booking.serviceName,
        providerName: draft.booking.providerName,
        locationName: tenantContext.locations.find((l) => l.slug === draft.booking.locationSlug)?.name ?? draft.booking.locationSlug,
        startTime: draft.booking.startAt,
        durationMinutes: Math.round(durationMs / 60_000),
        bookingCode: draft.booking.id.slice(-8).toUpperCase(),
        brandName: tenantContext.brandName,
      }).catch((err) => console.error("[email] booking confirmation failed:", err));

      sendJson(input.response, 201, parsedPayload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid booking request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const bookingMatch = matchBookingPath(input.pathname);
  const adminBookingMutationMatch = matchAdminBookingMutationPath(input.pathname);
  if (!bookingMatch && !adminBookingMutationMatch) {
    return false;
  }

  const stored = await input.repositories.commerce.bookings.getStored(
    bookingMatch?.bookingId ?? adminBookingMutationMatch?.bookingId ?? "",
  );
  if (!stored) {
    sendError(input.response, 404, "not_found", "Booking not found.");
    return true;
  }

  if (adminBookingMutationMatch) {
    if (
      !input.actor ||
      !canManageLocation(input.actor, "booking.manage.location", stored.booking.locationSlug)
    ) {
      sendError(input.response, 403, "forbidden", "Booking access is not authorized.");
      return true;
    }

    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        `Idempotency key is required for booking ${adminBookingMutationMatch.type}.`,
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        `admin.booking.${adminBookingMutationMatch.type}.${adminBookingMutationMatch.bookingId}`,
        idempotencyKey,
      )
    ) {
      return true;
    }

    if (adminBookingMutationMatch.type === "cancel" && input.method === "POST") {
      try {
        const payload = await readJsonBody(input.request, (body) =>
          adminBookingCancelRequestSchema.parse(body),
        );
        const updatedBooking = cancelBookingRecord({
          booking: stored.booking,
          reason: payload.reason,
        });

        await input.repositories.commerce.bookings.update(updatedBooking);
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: updatedBooking.locationSlug,
          customerEmail: updatedBooking.customer.email,
          customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
          actorUserId: input.actor.userId,
          source: "booking",
          eventType: "booking.cancelled",
          payload: {
            bookingId: updatedBooking.id,
            reason: payload.reason,
          },
          occurredAt: updatedBooking.updatedAt,
        });
        const tenantContextForAdminCancel = getRuntimeTenantContext(input.env);
        sendBookingCancellation(input.env, {
          customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
          customerEmail: updatedBooking.customer.email ?? "",
          serviceName: updatedBooking.serviceName,
          startTime: updatedBooking.startAt,
          bookingCode: updatedBooking.id.slice(-8).toUpperCase(),
          brandName: tenantContextForAdminCancel.brandName,
        }).catch((err) => console.error("[email] admin booking cancellation email failed:", err));
        const responsePayload = adminBookingMutationResponseSchema.parse({
          ok: true,
          data: {
            booking: updatedBooking,
          },
        });
        await input.repositories.reliability.idempotency.save({
          scope: `admin.booking.cancel.${adminBookingMutationMatch.bookingId}`,
          key: idempotencyKey,
          response: {
            statusCode: 200,
            payload: responsePayload,
          },
        });
        sendJson(input.response, 200, responsePayload);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid admin cancellation request.";
        sendError(input.response, 400, "validation_error", message);
        return true;
      }
    }

    if (adminBookingMutationMatch.type === "reschedule" && input.method === "POST") {
      try {
        const payload = await readJsonBody(input.request, (body) =>
          adminBookingRescheduleRequestSchema.parse(body),
        );
        const service = getServiceBySlug(
          clinicData.catalog,
          stored.booking.locationSlug,
          stored.booking.serviceSlug,
        );
        if (!service) {
          sendError(input.response, 404, "not_found", "Service not found.");
          return true;
        }

        const slot = await findSlotById({
          env: input.env,
          repositories: input.repositories,
          slotId: payload.slotId,
          locationSlug: stored.booking.locationSlug,
          serviceSlug: stored.booking.serviceSlug,
          pricingMode: payload.pricingMode,
        });

        if (!slot) {
          sendError(input.response, 409, "conflict", "Selected slot is no longer available.");
          return true;
        }

        const updatedBooking = rescheduleBookingRecord({
          booking: stored.booking,
          service,
          slot,
          requestedPricingMode: payload.pricingMode,
        });

        await input.repositories.commerce.bookings.update(updatedBooking);
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: updatedBooking.locationSlug,
          customerEmail: updatedBooking.customer.email,
          customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
          actorUserId: input.actor.userId,
          source: "booking",
          eventType: "booking.rescheduled",
          payload: {
            bookingId: updatedBooking.id,
            startAt: updatedBooking.startAt,
            endAt: updatedBooking.endAt,
            roomSlug: updatedBooking.roomSlug,
          },
          occurredAt: updatedBooking.updatedAt,
        });
        const responsePayload = adminBookingMutationResponseSchema.parse({
          ok: true,
          data: {
            booking: updatedBooking,
          },
        });
        await input.repositories.reliability.idempotency.save({
          scope: `admin.booking.reschedule.${adminBookingMutationMatch.bookingId}`,
          key: idempotencyKey,
          response: {
            statusCode: 200,
            payload: responsePayload,
          },
        });
        sendJson(input.response, 200, responsePayload);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid admin reschedule request.";
        sendError(input.response, 400, "validation_error", message);
        return true;
      }
    }
  }

  if (bookingMatch?.type === "get" && input.method === "GET") {
    const managementToken = input.request.headers["x-booking-token"];
    const canAccess = canAccessStoredBooking({
      stored,
      actor: input.actor,
      managementToken: typeof managementToken === "string" ? managementToken : undefined,
    });

    if (!canAccess) {
      sendError(input.response, 403, "forbidden", "Booking access is not authorized.");
      return true;
    }

    sendJson(
      input.response,
      200,
      bookingResponseSchema.parse({
        ok: true,
        data: {
          booking: stored.booking,
        },
      }),
    );
    return true;
  }

  if (bookingMatch?.type === "rebooking-options" && input.method === "GET") {
    const managementToken = input.request.headers["x-booking-token"];
    const canAccess = canAccessStoredBooking({
      stored,
      actor: input.actor,
      managementToken: typeof managementToken === "string" ? managementToken : undefined,
    });

    if (!canAccess) {
      sendError(input.response, 403, "forbidden", "Booking access is not authorized.");
      return true;
    }

    try {
      const url = new URL(
        input.request.url ?? "/",
        `http://${input.request.headers.host ?? `${input.env.DAYSI_API_HOST}:${input.env.DAYSI_API_PORT}`}`,
      );
      const query = rebookingOptionsQuerySchema.parse({
        fromDate: url.searchParams.get("fromDate") ?? undefined,
        toDate: url.searchParams.get("toDate") ?? undefined,
        pricingMode: url.searchParams.get("pricingMode") ?? undefined,
      });
      const pricingMode = query.pricingMode ?? stored.booking.charge.appliedPricingMode;
      const window = resolveRebookingSearchWindow({
        booking: stored.booking,
        fromDate: query.fromDate,
        toDate: query.toDate,
      });
      const availability = await getServiceAvailability({
        env: input.env,
        repositories: input.repositories,
        locationSlug: stored.booking.locationSlug,
        serviceSlug: stored.booking.serviceSlug,
        fromDate: window.fromDate,
        toDate: window.toDate,
        pricingMode,
        preferredProviderSlug: stored.booking.providerSlug,
      });

      if (!availability.service) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }
      if (availability.missingLocationSchedule) {
        sendError(input.response, 404, "not_found", "Location schedule not found.");
        return true;
      }

      const slots = availability.slots.filter(
        (slot) =>
          !(
            slot.startAt === stored.booking.startAt &&
            slot.endAt === stored.booking.endAt &&
            slot.providerSlug === stored.booking.providerSlug &&
            slot.machineSlug === stored.booking.machineSlug
          ),
      );

      sendJson(
        input.response,
        200,
        rebookingOptionsResponseSchema.parse({
          ok: true,
          data: {
            booking: stored.booking,
            fromDate: window.fromDate,
            toDate: window.toDate,
            pricingMode,
            slots,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid rebooking search request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (bookingMatch?.type === "cancel" && input.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for booking cancellation.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        `booking.cancel.${bookingMatch.bookingId}`,
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        cancelBookingRequestSchema.parse(body),
      );
      const canAccess = canAccessStoredBooking({
        stored,
        actor: input.actor,
        managementToken: payload.managementToken,
      });

      if (!canAccess) {
        sendError(input.response, 403, "forbidden", "Booking access is not authorized.");
        return true;
      }

      const updatedBooking = cancelBookingRecord({
        booking: stored.booking,
        reason: payload.reason,
      });

      await input.repositories.commerce.bookings.update(updatedBooking);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: updatedBooking.locationSlug,
        customerEmail: updatedBooking.customer.email,
        customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
        actorUserId: updatedBooking.actorUserId,
        source: "booking",
        eventType: "booking.cancelled",
        payload: {
          bookingId: updatedBooking.id,
          reason: payload.reason,
        },
        occurredAt: updatedBooking.updatedAt,
      });
      const tenantContextForCancel = getRuntimeTenantContext(input.env);
      sendBookingCancellation(input.env, {
        customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
        customerEmail: updatedBooking.customer.email ?? "",
        serviceName: updatedBooking.serviceName,
        startTime: updatedBooking.startAt,
        bookingCode: updatedBooking.id.slice(-8).toUpperCase(),
        brandName: tenantContextForCancel.brandName,
      }).catch((err) => console.error("[email] booking cancellation email failed:", err));
      const responsePayload = bookingResponseSchema.parse({
        ok: true,
        data: {
          booking: updatedBooking,
        },
      });
      await input.repositories.reliability.idempotency.save({
        scope: `booking.cancel.${bookingMatch.bookingId}`,
        key: idempotencyKey,
        response: {
          statusCode: 200,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 200, responsePayload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid cancellation request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (bookingMatch?.type === "reschedule" && input.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for booking reschedule.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        `booking.reschedule.${bookingMatch.bookingId}`,
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        rescheduleBookingRequestSchema.parse(body),
      );
      const canAccess = canAccessStoredBooking({
        stored,
        actor: input.actor,
        managementToken: payload.managementToken,
      });

      if (!canAccess) {
        sendError(input.response, 403, "forbidden", "Booking access is not authorized.");
        return true;
      }

      const service = getServiceBySlug(
        clinicData.catalog,
        stored.booking.locationSlug,
        stored.booking.serviceSlug,
      );
      if (!service) {
        sendError(input.response, 404, "not_found", "Service not found.");
        return true;
      }

      const slot = await findSlotById({
        env: input.env,
        repositories: input.repositories,
        slotId: payload.slotId,
        locationSlug: stored.booking.locationSlug,
        serviceSlug: stored.booking.serviceSlug,
        pricingMode: payload.pricingMode,
      });

      if (!slot) {
        sendError(input.response, 409, "conflict", "Selected slot is no longer available.");
        return true;
      }

      const updatedBooking = rescheduleBookingRecord({
        booking: stored.booking,
        service,
        slot,
        requestedPricingMode: payload.pricingMode,
      });

      await input.repositories.commerce.bookings.update(updatedBooking);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: updatedBooking.locationSlug,
        customerEmail: updatedBooking.customer.email,
        customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`.trim(),
        actorUserId: updatedBooking.actorUserId,
        source: "booking",
        eventType: "booking.rescheduled",
        payload: {
          bookingId: updatedBooking.id,
          startAt: updatedBooking.startAt,
          endAt: updatedBooking.endAt,
          roomSlug: updatedBooking.roomSlug,
        },
        occurredAt: updatedBooking.updatedAt,
      });
      const responsePayload = bookingResponseSchema.parse({
        ok: true,
        data: {
          booking: updatedBooking,
        },
      });
      await input.repositories.reliability.idempotency.save({
        scope: `booking.reschedule.${bookingMatch.bookingId}`,
        key: idempotencyKey,
        response: {
          statusCode: 200,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 200, responsePayload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid reschedule request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
