import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminWaitlistListResponseSchema,
  cancelWaitlistRequestSchema,
  createWaitlistRequestSchema,
  createWaitlistResponseSchema,
  updateWaitlistStatusRequestSchema,
  waitlistListResponseSchema,
  waitlistMatchesResponseSchema,
  waitlistResponseSchema,
  waitlistStatusSchema,
} from "../../../packages/contracts/src";
import {
  cancelWaitlistEntry,
  canManageLocation,
  createWaitlistEntry,
  filterWaitlistEntries,
  getServiceBySlug,
  updateWaitlistStatus,
  type AppActor,
  type WaitlistStatus,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { recordOperationalMetricEvent } from "./analytics-support";
import { getServiceAvailability } from "./availability-support";
import { getRuntimeClinicData, getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import type { StoredWaitlistEntryRecord } from "./persistence/engagement-repository";

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

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const canAccessStoredWaitlistEntry = (input: {
  stored: StoredWaitlistEntryRecord;
  actor: AppActor | null;
  managementToken?: string;
}): boolean =>
  !!(
    (input.actor?.userId && input.stored.waitlistEntry.actorUserId === input.actor.userId) ||
    (input.actor?.email &&
      input.stored.waitlistEntry.customer.email.toLowerCase() === input.actor.email.toLowerCase()) ||
    (input.managementToken && input.managementToken === input.stored.managementToken)
  );

const matchWaitlistPath = (
  pathname: string,
):
  | { type: "get"; waitlistEntryId: string }
  | { type: "cancel"; waitlistEntryId: string }
  | { type: "matches"; waitlistEntryId: string }
  | { type: "admin-status"; waitlistEntryId: string }
  | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 3 && segments[0] === "v1" && segments[1] === "waitlist") {
    return {
      type: "get",
      waitlistEntryId: segments[2],
    };
  }

  if (segments.length === 4 && segments[0] === "v1" && segments[1] === "waitlist") {
    if (segments[3] === "cancel") {
      return {
        type: "cancel",
        waitlistEntryId: segments[2],
      };
    }

    if (segments[3] === "matches") {
      return {
        type: "matches",
        waitlistEntryId: segments[2],
      };
    }
  }

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "waitlist" &&
    segments[4] === "status"
  ) {
    return {
      type: "admin-status",
      waitlistEntryId: segments[3],
    };
  }

  return null;
};

const resolveWaitlistEventType = (status: WaitlistStatus): string => {
  switch (status) {
    case "active":
      return "waitlist.reactivated";
    case "notified":
      return "waitlist.notified";
    case "booked":
      return "waitlist.booked";
    case "cancelled":
      return "waitlist.cancelled";
  }
};

export const handleWaitlistRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const clinicData = getRuntimeClinicData(input.env);
  const tenant = getRuntimeTenantContext(input.env);
  const url = buildUrl(input.request, input.env);

  if (input.method === "POST" && input.pathname === "/v1/public/waitlist") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for waitlist creation.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        "waitlist.create",
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        createWaitlistRequestSchema.parse(body),
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

      const draft = createWaitlistEntry({
        service,
        customer: payload.customer,
        preferredProviderSlug: payload.preferredProviderSlug,
        preferredPricingMode: payload.pricingMode,
        requestedWindow: payload.requestedWindow,
        actorUserId: input.actor?.userId,
        notes: payload.notes,
      });
      const responsePayload = createWaitlistResponseSchema.parse({
        ok: true,
        data: {
          waitlistEntry: draft.waitlistEntry,
          managementToken: draft.managementToken,
        },
      });

      await input.repositories.engagement.waitlist.save(
        draft.waitlistEntry,
        draft.managementToken,
      );
      await recordOperationalMetricEvent({
        repositories: input.repositories,
        eventType: "waitlist_created",
        locationSlug: draft.waitlistEntry.locationSlug,
        serviceSlug: draft.waitlistEntry.serviceSlug,
        providerSlug: draft.waitlistEntry.preferredProviderSlug,
        actorUserId: draft.waitlistEntry.actorUserId,
        customerEmail: draft.waitlistEntry.customer.email,
        referenceId: draft.waitlistEntry.id,
        occurredAt: draft.waitlistEntry.createdAt,
        metadata: {
          fromDate: draft.waitlistEntry.requestedWindow.fromDate,
          toDate: draft.waitlistEntry.requestedWindow.toDate,
          pricingMode: draft.waitlistEntry.preferredPricingMode,
        },
      });
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: draft.waitlistEntry.locationSlug,
        customerEmail: draft.waitlistEntry.customer.email,
        customerName: `${draft.waitlistEntry.customer.firstName} ${draft.waitlistEntry.customer.lastName}`.trim(),
        actorUserId: draft.waitlistEntry.actorUserId,
        source: "booking",
        eventType: "waitlist.created",
        payload: {
          waitlistEntryId: draft.waitlistEntry.id,
          serviceSlug: draft.waitlistEntry.serviceSlug,
          preferredProviderSlug: draft.waitlistEntry.preferredProviderSlug,
          fromDate: draft.waitlistEntry.requestedWindow.fromDate,
          toDate: draft.waitlistEntry.requestedWindow.toDate,
        },
        occurredAt: draft.waitlistEntry.createdAt,
      });
      await input.repositories.reliability.idempotency.save({
        scope: "waitlist.create",
        key: idempotencyKey,
        response: {
          statusCode: 201,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 201, responsePayload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid waitlist request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/me/waitlist") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Missing or invalid bearer token.");
      return true;
    }

    sendJson(
      input.response,
      200,
      waitlistListResponseSchema.parse({
        ok: true,
        data: {
          entries: await input.repositories.engagement.waitlist.listForActor({
            // Waitlist ownership remains email/user based until auth cutover is complete.
            actorUserId: input.actor.userId,
            actorEmail: input.actor.email,
          }),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/waitlist") {
    const locationSlug = url.searchParams.get("locationSlug");
    const serviceSlug = url.searchParams.get("serviceSlug") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    if (!locationSlug) {
      sendError(input.response, 400, "bad_request", "locationSlug is required.");
      return true;
    }
    if (!tenant.locations.some((location) => location.slug === locationSlug)) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }
    if (!input.actor || !canManageLocation(input.actor, "booking.manage.location", locationSlug)) {
      sendError(input.response, 403, "forbidden", "Waitlist access is restricted.");
      return true;
    }

    try {
      const parsedStatus = status ? waitlistStatusSchema.parse(status) : undefined;
      sendJson(
        input.response,
        200,
        adminWaitlistListResponseSchema.parse({
          ok: true,
          data: {
            locationSlug,
            entries: filterWaitlistEntries({
              entries: await input.repositories.engagement.waitlist.listAll(),
              locationSlug,
              serviceSlug,
              status: parsedStatus,
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid waitlist filter request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const waitlistMatch = matchWaitlistPath(input.pathname);
  if (!waitlistMatch) {
    return false;
  }

  const stored = await input.repositories.engagement.waitlist.getStored(
    waitlistMatch.waitlistEntryId,
  );
  if (!stored) {
    sendError(input.response, 404, "not_found", "Waitlist entry not found.");
    return true;
  }

  if (waitlistMatch.type === "get" && input.method === "GET") {
    const managementToken = input.request.headers["x-waitlist-token"];
    const canAccess = canAccessStoredWaitlistEntry({
      stored,
      actor: input.actor,
      managementToken: typeof managementToken === "string" ? managementToken : undefined,
    });

    if (!canAccess) {
      sendError(input.response, 403, "forbidden", "Waitlist access is not authorized.");
      return true;
    }

    sendJson(
      input.response,
      200,
      waitlistResponseSchema.parse({
        ok: true,
        data: {
          waitlistEntry: stored.waitlistEntry,
        },
      }),
    );
    return true;
  }

  if (waitlistMatch.type === "matches" && input.method === "GET") {
    const managementToken = input.request.headers["x-waitlist-token"];
    const canAccess = canAccessStoredWaitlistEntry({
      stored,
      actor: input.actor,
      managementToken: typeof managementToken === "string" ? managementToken : undefined,
    });

    if (!canAccess) {
      sendError(input.response, 403, "forbidden", "Waitlist access is not authorized.");
      return true;
    }

    const availability = await getServiceAvailability({
      env: input.env,
      repositories: input.repositories,
      locationSlug: stored.waitlistEntry.locationSlug,
      serviceSlug: stored.waitlistEntry.serviceSlug,
      fromDate: stored.waitlistEntry.requestedWindow.fromDate,
      toDate: stored.waitlistEntry.requestedWindow.toDate,
      pricingMode: stored.waitlistEntry.preferredPricingMode,
      preferredProviderSlug: stored.waitlistEntry.preferredProviderSlug,
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
      waitlistMatchesResponseSchema.parse({
        ok: true,
        data: {
          waitlistEntry: stored.waitlistEntry,
          pricingMode: stored.waitlistEntry.preferredPricingMode,
          slots: availability.slots,
        },
      }),
    );
    return true;
  }

  if (waitlistMatch.type === "cancel" && input.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for waitlist cancellation.",
      );
      return true;
    }

    const scope = `waitlist.cancel.${waitlistMatch.waitlistEntryId}`;
    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        scope,
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        cancelWaitlistRequestSchema.parse(body),
      );
      const canAccess = canAccessStoredWaitlistEntry({
        stored,
        actor: input.actor,
        managementToken: payload.managementToken,
      });

      if (!canAccess) {
        sendError(input.response, 403, "forbidden", "Waitlist access is not authorized.");
        return true;
      }

      const updatedEntry = cancelWaitlistEntry({
        entry: stored.waitlistEntry,
        reason: payload.reason,
      });
      await input.repositories.engagement.waitlist.update(updatedEntry);

      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: updatedEntry.locationSlug,
        customerEmail: updatedEntry.customer.email,
        customerName: `${updatedEntry.customer.firstName} ${updatedEntry.customer.lastName}`.trim(),
        actorUserId: updatedEntry.actorUserId,
        source: "booking",
        eventType: "waitlist.cancelled",
        payload: {
          waitlistEntryId: updatedEntry.id,
          reason: payload.reason,
        },
        occurredAt: updatedEntry.updatedAt,
      });

      const responsePayload = waitlistResponseSchema.parse({
        ok: true,
        data: {
          waitlistEntry: updatedEntry,
        },
      });
      await input.repositories.reliability.idempotency.save({
        scope,
        key: idempotencyKey,
        response: {
          statusCode: 200,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 200, responsePayload);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid waitlist cancellation request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (waitlistMatch.type === "admin-status" && input.method === "POST") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for waitlist status updates.",
      );
      return true;
    }

    const scope = `waitlist.status.${waitlistMatch.waitlistEntryId}`;
    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        scope,
        idempotencyKey,
      )
    ) {
      return true;
    }

    if (
      !input.actor ||
      !canManageLocation(input.actor, "booking.manage.location", stored.waitlistEntry.locationSlug)
    ) {
      sendError(input.response, 403, "forbidden", "Waitlist access is restricted.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        updateWaitlistStatusRequestSchema.parse(body),
      );
      const updatedEntry = updateWaitlistStatus({
        entry: stored.waitlistEntry,
        status: payload.status,
        note: payload.note,
        fulfilledByBookingId: payload.fulfilledByBookingId,
      });
      await input.repositories.engagement.waitlist.update(updatedEntry);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: updatedEntry.locationSlug,
        action: `waitlist.${payload.status}`,
        entityType: "waitlist_entry",
        entityId: updatedEntry.id,
        summary: `Marked waitlist entry ${updatedEntry.id} as ${payload.status}`,
        repositories: input.repositories,
      });
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: updatedEntry.locationSlug,
        customerEmail: updatedEntry.customer.email,
        customerName: `${updatedEntry.customer.firstName} ${updatedEntry.customer.lastName}`.trim(),
        actorUserId: updatedEntry.actorUserId,
        source: "booking",
        eventType: resolveWaitlistEventType(payload.status),
        payload: {
          waitlistEntryId: updatedEntry.id,
          note: payload.note,
          fulfilledByBookingId: payload.fulfilledByBookingId,
        },
        occurredAt: updatedEntry.updatedAt,
      });

      const responsePayload = waitlistResponseSchema.parse({
        ok: true,
        data: {
          waitlistEntry: updatedEntry,
        },
      });
      await input.repositories.reliability.idempotency.save({
        scope,
        key: idempotencyKey,
        response: {
          statusCode: 200,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 200, responsePayload);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid waitlist status request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
