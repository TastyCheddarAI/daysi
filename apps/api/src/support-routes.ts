import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminActionLogListResponseSchema,
  supportCaseCreateRequestSchema,
  supportCaseEventCreateRequestSchema,
  supportCaseListResponseSchema,
  supportCaseResponseSchema,
  supportCaseUpdateRequestSchema,
} from "../../../packages/contracts/src";
import {
  canManageLocation,
  createSupportCase,
  createSupportCaseEvent,
  updateSupportCase as applySupportCaseUpdate,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";

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
  permission: "admin.support.manage" | "admin.audit.read",
): boolean => !!actor && canManageLocation(actor, permission, locationSlug);

const matchSupportCasePath = (pathname: string): { supportCaseId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "support-cases"
  ) {
    return {
      supportCaseId: segments[3],
    };
  }

  return null;
};

const matchSupportCaseEventsPath = (pathname: string): { supportCaseId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "support-cases" &&
    segments[4] === "events"
  ) {
    return {
      supportCaseId: segments[3],
    };
  }

  return null;
};

export const handleSupportAndAuditRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const url = buildUrl(input.request, input.env);
  const tenant = getRuntimeTenantContext(input.env);

  if (input.method === "GET" && input.pathname === "/v1/admin/support-cases") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.support.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location support access is restricted.");
      return true;
    }

    const supportCases = (await input.repositories.operations.support.listCases()).filter(
      (supportCase) =>
        locationSlug
          ? supportCase.locationSlug === locationSlug
          : actor.roles.includes("owner")
            ? true
            : actor.locationScopes.includes(supportCase.locationSlug),
    );

    sendJson(
      input.response,
      200,
      supportCaseListResponseSchema.parse({
        ok: true,
        data: {
          supportCases,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/support-cases") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        supportCaseCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.support.manage")) {
        sendError(input.response, 403, "forbidden", "Location support access is restricted.");
        return true;
      }
      if (!tenant.locations.some((location) => location.slug === payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const created = createSupportCase({
        locationSlug: payload.locationSlug,
        subject: payload.subject,
        category: payload.category,
        priority: payload.priority,
        tags: payload.tags,
        initialMessage: payload.initialMessage,
        initialVisibility: payload.initialVisibility,
        openedByUserId: input.actor.userId,
        openedByEmail: input.actor.email,
        actorDisplayName: input.actor.displayName,
      });
      await input.repositories.operations.support.saveCase(created.supportCase);
      if (created.initialEvent) {
        await input.repositories.operations.support.saveEvent(created.initialEvent);
      }

      await recordAdminAction({
        actor: input.actor,
        locationSlug: created.supportCase.locationSlug,
        action: "support.case.created",
        entityType: "support_case",
        entityId: created.supportCase.id,
        summary: `Created support case ${created.supportCase.subject}`,
        metadata: {
          category: created.supportCase.category,
          priority: created.supportCase.priority,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        201,
        supportCaseResponseSchema.parse({
          ok: true,
          data: {
            supportCase: created.supportCase,
            events: created.initialEvent ? [created.initialEvent] : [],
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid support case request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const supportCaseMatch = matchSupportCasePath(input.pathname);
  if (supportCaseMatch && input.method === "GET") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const supportCase = await input.repositories.operations.support.getCase(
      supportCaseMatch.supportCaseId,
    );
    if (!supportCase) {
      sendError(input.response, 404, "not_found", "Support case not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, supportCase.locationSlug, "admin.support.manage")) {
      sendError(input.response, 403, "forbidden", "Location support access is restricted.");
      return true;
    }

    sendJson(
      input.response,
      200,
      supportCaseResponseSchema.parse({
        ok: true,
        data: {
          supportCase,
          events: await input.repositories.operations.support.listEvents(supportCase.id),
        },
      }),
    );
    return true;
  }

  if (supportCaseMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        supportCaseUpdateRequestSchema.parse(body),
      );
      const supportCase = await input.repositories.operations.support.getCase(
        supportCaseMatch.supportCaseId,
      );
      if (!supportCase) {
        sendError(input.response, 404, "not_found", "Support case not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, supportCase.locationSlug, "admin.support.manage")) {
        sendError(input.response, 403, "forbidden", "Location support access is restricted.");
        return true;
      }

      const updated = applySupportCaseUpdate({
        supportCase,
        status: payload.status,
        priority: payload.priority,
        assignedToUserId: Object.prototype.hasOwnProperty.call(payload, "assignedToUserId")
          ? payload.assignedToUserId
          : undefined,
        tags: payload.tags,
        actorUserId: input.actor.userId,
        actorDisplayName: input.actor.displayName,
        note: payload.note,
      });
      await input.repositories.operations.support.saveCase(updated.supportCase);
      for (const event of updated.events) {
        await input.repositories.operations.support.saveEvent(event);
      }

      await recordAdminAction({
        actor: input.actor,
        locationSlug: updated.supportCase.locationSlug,
        action: "support.case.updated",
        entityType: "support_case",
        entityId: updated.supportCase.id,
        summary: `Updated support case ${updated.supportCase.subject}`,
        metadata: {
          status: updated.supportCase.status,
          priority: updated.supportCase.priority,
          eventCount: updated.events.length,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        supportCaseResponseSchema.parse({
          ok: true,
          data: {
            supportCase: updated.supportCase,
            events: await input.repositories.operations.support.listEvents(
              updated.supportCase.id,
            ),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid support case update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const supportCaseEventsMatch = matchSupportCaseEventsPath(input.pathname);
  if (supportCaseEventsMatch && input.method === "POST") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        supportCaseEventCreateRequestSchema.parse(body),
      );
      const supportCase = await input.repositories.operations.support.getCase(
        supportCaseEventsMatch.supportCaseId,
      );
      if (!supportCase) {
        sendError(input.response, 404, "not_found", "Support case not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, supportCase.locationSlug, "admin.support.manage")) {
        sendError(input.response, 403, "forbidden", "Location support access is restricted.");
        return true;
      }

      const event = createSupportCaseEvent({
        supportCase,
        type: payload.visibility === "internal" ? "internal_note" : "note",
        visibility: payload.visibility,
        body: payload.body,
        createdByUserId: input.actor.userId,
        createdByDisplayName: input.actor.displayName,
      });
      await input.repositories.operations.support.saveEvent(event);
      const updatedSupportCase = {
        ...supportCase,
        updatedAt: event.createdAt,
      };
      await input.repositories.operations.support.saveCase(updatedSupportCase);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: supportCase.locationSlug,
        action: "support.case.event_added",
        entityType: "support_case",
        entityId: supportCase.id,
        summary: `Added support case event to ${supportCase.subject}`,
        metadata: {
          eventType: event.type,
          visibility: event.visibility,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        supportCaseResponseSchema.parse({
          ok: true,
          data: {
            supportCase: updatedSupportCase,
            events: await input.repositories.operations.support.listEvents(supportCase.id),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid support case event.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/audit-log") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.audit.read")
    ) {
      sendError(input.response, 403, "forbidden", "Location audit access is restricted.");
      return true;
    }

    const entries = (await input.repositories.operations.audit.listAll()).filter((entry) =>
      locationSlug
        ? entry.locationSlug === locationSlug
        : actor.roles.includes("owner")
          ? true
          : entry.locationSlug
            ? actor.locationScopes.includes(entry.locationSlug)
            : false,
    );

    sendJson(
      input.response,
      200,
      adminActionLogListResponseSchema.parse({
        ok: true,
        data: {
          entries,
        },
      }),
    );
    return true;
  }

  return false;
};
