import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import type { ImportJob, ImportJobStatus, ImportJobType } from "./persistence/import-repository";
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

export const handleImportRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const { method, pathname, request, response, actor, repositories } = input;

  // GET /v1/admin/imports - List import jobs
  if (method === "GET" && pathname === "/v1/admin/imports") {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    
    const jobs = locationSlug 
      ? await repositories.imports.listByLocation(locationSlug)
      : await repositories.imports.listAll();

    sendJson(response, 200, {
      ok: true,
      data: { jobs },
    });
    return true;
  }

  // POST /v1/admin/imports - Create import job
  if (method === "POST" && pathname === "/v1/admin/imports") {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(request, (body) => {
        const data = body as Record<string, unknown>;
        if (!data.locationSlug || !data.type || !data.fileName || !data.rowCount) {
          throw new Error("locationSlug, type, fileName, and rowCount are required.");
        }
        if (!["customers", "services", "bookings", "memberships", "products"].includes(String(data.type))) {
          throw new Error("Invalid import type.");
        }
        return {
          locationSlug: String(data.locationSlug),
          type: String(data.type) as ImportJobType,
          fileName: String(data.fileName),
          rowCount: Number(data.rowCount),
          metadata: (data.metadata as Record<string, unknown>) ?? {},
        };
      });

      const job: ImportJob = {
        id: `imp_${randomUUID()}`,
        locationSlug: payload.locationSlug,
        type: payload.type,
        status: "pending",
        fileName: payload.fileName,
        rowCount: payload.rowCount,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        createdAt: new Date().toISOString(),
        metadata: payload.metadata ?? {},
        createdByUserId: actor?.userId,
      };

      await repositories.imports.save(job);

      // Log audit event
      await repositories.audit.save({
        id: `aud_${randomUUID()}`,
        timestamp: new Date().toISOString(),
        actor: {
          type: (actor.roles.includes("owner") ? "admin" : "staff") as import("./persistence/audit-repository").AuditActorType,
          email: actor.email ?? "unknown@daysi.local",
          name: actor.displayName ?? actor.email ?? "Unknown",
          userId: actor.userId,
        },
        action: "import.created",
        entityType: "import",
        entityId: job.id,
        summary: `Created ${payload.type} import job for ${payload.fileName}`,
        metadata: { type: payload.type, rowCount: payload.rowCount },
        locationSlug: payload.locationSlug,
        ipAddress: undefined,
      });

      sendJson(response, 201, {
        ok: true,
        data: { job },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid import request.";
      sendError(response, 400, "validation_error", message);
      return true;
    }
  }

  // GET /v1/admin/imports/:id - Get import job
  const matchGet = pathname.match(/^\/v1\/admin\/imports\/([^\/]+)$/);
  if (method === "GET" && matchGet) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const jobId = matchGet[1];
    const job = await repositories.imports.get(jobId);

    if (!job) {
      sendError(response, 404, "not_found", "Import job not found.");
      return true;
    }

    sendJson(response, 200, {
      ok: true,
      data: { job },
    });
    return true;
  }

  // PATCH /v1/admin/imports/:id - Update import job status
  const matchPatch = pathname.match(/^\/v1\/admin\/imports\/([^\/]+)$/);
  if (method === "PATCH" && matchPatch) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const jobId = matchPatch[1];
    const job = await repositories.imports.get(jobId);

    if (!job) {
      sendError(response, 404, "not_found", "Import job not found.");
      return true;
    }

    try {
      const payload = await readJsonBody(request, (body) => {
        return body as {
          status?: ImportJobStatus;
          processedCount?: number;
          successCount?: number;
          errorCount?: number;
          errors?: Array<{ row: number; message: string }>;
        };
      });

      const updatedJob: ImportJob = {
        ...job,
        status: payload.status ?? job.status,
        processedCount: payload.processedCount ?? job.processedCount,
        successCount: payload.successCount ?? job.successCount,
        errorCount: payload.errorCount ?? job.errorCount,
        errors: payload.errors ?? job.errors,
      };

      if (payload.status === "completed" || payload.status === "failed") {
        updatedJob.completedAt = new Date().toISOString();
      }

      await repositories.imports.save(updatedJob);

      sendJson(response, 200, {
        ok: true,
        data: { job: updatedJob },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid update request.";
      sendError(response, 400, "validation_error", message);
      return true;
    }
  }

  // DELETE /v1/admin/imports/:id - Delete import job
  const matchDelete = pathname.match(/^\/v1\/admin\/imports\/([^\/]+)$/);
  if (method === "DELETE" && matchDelete) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const jobId = matchDelete[1];
    await repositories.imports.delete(jobId);

    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
};
