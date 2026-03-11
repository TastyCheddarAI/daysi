import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import type { IntakeForm, IntakeFormStatus, FormField } from "./persistence/intake-forms-repository";
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

export const handleIntakeFormsRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const { method, pathname, request, response, actor, repositories } = input;

  // GET /v1/admin/intake-forms - List forms
  if (method === "GET" && pathname === "/v1/admin/intake-forms") {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    
    const forms = locationSlug 
      ? await repositories.intakeForms.listByLocation(locationSlug)
      : await repositories.intakeForms.listAll();

    sendJson(response, 200, {
      ok: true,
      data: { forms },
    });
    return true;
  }

  // POST /v1/admin/intake-forms - Create form
  if (method === "POST" && pathname === "/v1/admin/intake-forms") {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(request, (body) => {
        const data = body as Record<string, unknown>;
        if (!data.locationSlug || !data.name) {
          throw new Error("locationSlug and name are required.");
        }
        return {
          locationSlug: String(data.locationSlug),
          name: String(data.name),
          description: String(data.description ?? ""),
          fields: (data.fields as FormField[]) ?? [],
          assignedServices: (data.assignedServices as string[]) ?? [],
          requiredForBooking: Boolean(data.requiredForBooking ?? false),
        };
      });

      const now = new Date().toISOString();
      const form: IntakeForm = {
        id: `form_${randomUUID()}`,
        locationSlug: payload.locationSlug,
        name: payload.name,
        description: payload.description ?? "",
        status: "draft",
        fields: payload.fields ?? [],
        assignedServices: payload.assignedServices ?? [],
        requiredForBooking: payload.requiredForBooking ?? false,
        completionCount: 0,
        createdAt: now,
        updatedAt: now,
        createdByUserId: actor?.userId,
      };

      await repositories.intakeForms.save(form);

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
        action: "intake_form.created",
        entityType: "intake_form",
        entityId: form.id,
        summary: `Created intake form "${form.name}"`,
        metadata: { name: form.name },
        locationSlug: payload.locationSlug,
        ipAddress: undefined,
      });

      sendJson(response, 201, {
        ok: true,
        data: { form },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid form request.";
      sendError(response, 400, "validation_error", message);
      return true;
    }
  }

  // GET /v1/admin/intake-forms/:id - Get form
  const matchGet = pathname.match(/^\/v1\/admin\/intake-forms\/([^\/]+)$/);
  if (method === "GET" && matchGet) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const formId = matchGet[1];
    const form = await repositories.intakeForms.get(formId);

    if (!form) {
      sendError(response, 404, "not_found", "Intake form not found.");
      return true;
    }

    sendJson(response, 200, {
      ok: true,
      data: { form },
    });
    return true;
  }

  // PATCH /v1/admin/intake-forms/:id - Update form
  const matchPatch = pathname.match(/^\/v1\/admin\/intake-forms\/([^\/]+)$/);
  if (method === "PATCH" && matchPatch) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const formId = matchPatch[1];
    const form = await repositories.intakeForms.get(formId);

    if (!form) {
      sendError(response, 404, "not_found", "Intake form not found.");
      return true;
    }

    try {
      const payload = await readJsonBody(request, (body) => {
        return body as {
          name?: string;
          description?: string;
          status?: IntakeFormStatus;
          fields?: FormField[];
          assignedServices?: string[];
          requiredForBooking?: boolean;
        };
      });

      const updatedForm: IntakeForm = {
        ...form,
        name: payload.name ?? form.name,
        description: payload.description ?? form.description,
        status: payload.status ?? form.status,
        fields: payload.fields ?? form.fields,
        assignedServices: payload.assignedServices ?? form.assignedServices,
        requiredForBooking: payload.requiredForBooking ?? form.requiredForBooking,
        updatedAt: new Date().toISOString(),
      };

      await repositories.intakeForms.save(updatedForm);

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
        action: "intake_form.updated",
        entityType: "intake_form",
        entityId: form.id,
        summary: `Updated intake form "${updatedForm.name}"`,
        metadata: { name: updatedForm.name },
        locationSlug: form.locationSlug,
        ipAddress: undefined,
      });

      sendJson(response, 200, {
        ok: true,
        data: { form: updatedForm },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid update request.";
      sendError(response, 400, "validation_error", message);
      return true;
    }
  }

  // DELETE /v1/admin/intake-forms/:id - Delete form
  const matchDelete = pathname.match(/^\/v1\/admin\/intake-forms\/([^\/]+)$/);
  if (method === "DELETE" && matchDelete) {
    if (!requireAdminActor(actor)) {
      sendError(response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const formId = matchDelete[1];
    const form = await repositories.intakeForms.get(formId);
    
    if (form) {
      await repositories.intakeForms.delete(formId);

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
        action: "intake_form.deleted",
        entityType: "intake_form",
        entityId: formId,
        summary: `Deleted intake form "${form.name}"`,
        metadata: { name: form.name },
        locationSlug: form.locationSlug,
        ipAddress: undefined,
      });
    }

    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
};
