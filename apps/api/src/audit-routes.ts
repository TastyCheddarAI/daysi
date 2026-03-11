import type { IncomingMessage, ServerResponse } from "node:http";
import type { AppEnv } from "./config";
import { sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import type { AuditActorType } from "./persistence/audit-repository";
import type { AppActor } from "../../../packages/domain/src";

const requireAdminActor = (
  actor: AppActor | null,
): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

export const handleAuditRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const { method, pathname, request, response, actor, repositories } = input;

  // GET /v1/admin/audit-logs - List audit logs
  if (method === "GET" && pathname === "/v1/admin/audit-logs") {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(request, input.env);
    const locationSlug = url.searchParams.get("locationSlug") ?? undefined;
    const entityType = url.searchParams.get("entityType") ?? undefined;
    const actorType = (url.searchParams.get("actorType") as AuditActorType) ?? undefined;
    const fromDate = url.searchParams.get("fromDate") ?? undefined;
    const toDate = url.searchParams.get("toDate") ?? undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    
    const result = await repositories.audit.list({
      locationSlug,
      entityType,
      actorType,
      fromDate,
      toDate,
      limit,
      offset,
    });

    sendJson(response, 200, {
      ok: true,
      data: {
        entries: result.entries,
        total: result.total,
        limit,
        offset,
      },
    });
    return true;
  }

  return false;
};

// Helper function to log audit events from other routes
export const logAuditEvent = async (
  repositories: AppRepositories,
  input: {
    actor: AppActor;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    metadata?: Record<string, unknown>;
    locationSlug?: string;
    ipAddress?: string;
  }
) => {
  const { randomUUID } = await import("node:crypto");
  
  await repositories.audit.save({
    id: `aud_${randomUUID()}`,
    timestamp: new Date().toISOString(),
    actor: {
      type: (input.actor.roles.includes("owner") ? "admin" : "staff") as import("./persistence/audit-repository").AuditActorType,
      email: input.actor.email ?? "unknown@daysi.local",
      name: input.actor.displayName ?? input.actor.email ?? "Unknown",
      userId: input.actor.userId,
    },
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata ?? {},
    locationSlug: input.locationSlug ?? "",
    ipAddress: input.ipAddress,
  });
};
