import type { IncomingMessage, ServerResponse } from "node:http";

import {
  importJobCreateRequestSchema,
  importJobListResponseSchema,
  importMappingProfileCreateRequestSchema,
  importMappingProfileListResponseSchema,
  importMappingProfileResponseSchema,
  importMappingProfileUpdateRequestSchema,
  importJobReconciliationResponseSchema,
  importJobResponseSchema,
  importJobRetryRequestSchema,
  importJobUpdateRequestSchema,
  locationOnboardingOverviewResponseSchema,
  reconciliationIssueUpdateRequestSchema,
} from "../../../packages/contracts/src";
import {
  buildLocationOnboardingOverview,
  buildImportJobReconciliationIssues,
  canManageLocation,
  createImportJob,
  createImportMappingProfile,
  retryImportJobRows,
  syncImportJobReconciliationIssues,
  updateImportMappingProfile as applyImportMappingProfileUpdate,
  updateImportJob as applyImportJobUpdate,
  updateReconciliationIssue,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import {
  getLocationOperatingSchedule,
  getRuntimeClinicData,
  getRuntimeTenantContext,
} from "./clinic-runtime";
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
  permission: "admin.import.manage" | "admin.onboarding.read",
): boolean => !!actor && canManageLocation(actor, permission, locationSlug);

const matchImportJobPath = (pathname: string): { importJobId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "import-jobs"
  ) {
    return {
      importJobId: segments[3],
    };
  }

  return null;
};

const matchImportMappingProfilePath = (
  pathname: string,
): { profileId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "import-mapping-profiles"
  ) {
    return {
      profileId: segments[3],
    };
  }

  return null;
};

const matchImportJobReconciliationPath = (
  pathname: string,
): { importJobId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "import-jobs" &&
    segments[4] === "reconciliation"
  ) {
    return {
      importJobId: segments[3],
    };
  }

  return null;
};

const matchImportJobRetryPath = (pathname: string): { importJobId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "import-jobs" &&
    segments[4] === "retry"
  ) {
    return {
      importJobId: segments[3],
    };
  }

  return null;
};

const matchReconciliationIssuePath = (
  pathname: string,
): { importJobId: string; issueId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 7 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "import-jobs" &&
    segments[4] === "reconciliation" &&
    segments[5] === "issues"
  ) {
    return {
      importJobId: segments[3],
      issueId: segments[6],
    };
  }

  return null;
};

const syncStoredReconciliationIssues = async (
  repositories: AppRepositories,
  importJobId: string,
  updatedImportJob: ReturnType<typeof applyImportJobUpdate>,
): Promise<void> => {
  const nextIssues = syncImportJobReconciliationIssues({
    job: updatedImportJob,
    existingIssues: await repositories.operations.imports.listReconciliationIssues(importJobId),
  });

  for (const issue of nextIssues) {
    await repositories.operations.imports.saveReconciliationIssue(issue);
  }
};

export const handleOnboardingAndImportRoutes = async (input: {
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

  if (input.method === "GET" && input.pathname === "/v1/admin/import-mapping-profiles") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (locationSlug && !ensureScopedAdminAccess(actor, locationSlug, "admin.import.manage")) {
      sendError(input.response, 403, "forbidden", "Location import access is restricted.");
      return true;
    }
    const sourceSystem = url.searchParams.get("sourceSystem");
    const entityType = url.searchParams.get("entityType");
    const mappingProfiles = (
      await input.repositories.operations.imports.listMappingProfiles(locationSlug ?? undefined)
    ).filter(
      (profile) =>
        (!locationSlug
          ? actor.roles.includes("owner") || actor.locationScopes.includes(profile.locationSlug)
          : true) &&
        (!sourceSystem || profile.sourceSystem === sourceSystem) &&
        (!entityType || profile.entityType === entityType),
    );

    sendJson(
      input.response,
      200,
      importMappingProfileListResponseSchema.parse({
        ok: true,
        data: {
          mappingProfiles,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/import-mapping-profiles") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        importMappingProfileCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }
      if (!tenant.locations.some((location) => location.slug === payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const mappingProfile = createImportMappingProfile({
        locationSlug: payload.locationSlug,
        sourceSystem: payload.sourceSystem,
        entityType: payload.entityType,
        name: payload.name,
        status: payload.status,
        fieldMappings: payload.fieldMappings,
        updatedByUserId: input.actor.userId,
      });
      await input.repositories.operations.imports.saveMappingProfile(mappingProfile);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: mappingProfile.locationSlug,
        action: "import.mapping_profile.created",
        entityType: "import_mapping_profile",
        entityId: mappingProfile.id,
        summary: `Created import mapping profile ${mappingProfile.name}`,
        metadata: {
          sourceSystem: mappingProfile.sourceSystem,
          entityType: mappingProfile.entityType,
          status: mappingProfile.status,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        201,
        importMappingProfileResponseSchema.parse({
          ok: true,
          data: {
            mappingProfile,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid mapping profile request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/onboarding/overview") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.onboarding.read")) {
      sendError(input.response, 403, "forbidden", "Location onboarding access is restricted.");
      return true;
    }

    const location = tenant.locations.find((entry) => entry.slug === locationSlug);
    if (!location) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }

    const clinicData = getRuntimeClinicData(input.env);
    const overview = buildLocationOnboardingOverview({
      tenant,
      locationSlug,
      locationSchedule: getLocationOperatingSchedule(input.env, locationSlug),
      services: clinicData.catalog.services,
      providers: clinicData.providers,
      machines: clinicData.machines,
      rooms: clinicData.rooms,
      membershipPlans: clinicData.membershipPlans,
      importJobs: await input.repositories.operations.imports.listJobs(),
    });

    sendJson(
      input.response,
      200,
      locationOnboardingOverviewResponseSchema.parse({
        ok: true,
        data: {
          overview,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/import-jobs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.import.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location import access is restricted.");
      return true;
    }

    const importJobs = (await input.repositories.operations.imports.listJobs()).filter(
      (importJob) =>
        locationSlug
          ? importJob.locationSlug === locationSlug
          : actor.roles.includes("owner")
            ? true
            : actor.locationScopes.includes(importJob.locationSlug),
    );

    sendJson(
      input.response,
      200,
      importJobListResponseSchema.parse({
        ok: true,
        data: {
          importJobs,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/import-jobs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        importJobCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }
      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const importJob = createImportJob({
        locationSlug: payload.locationSlug,
        sourceSystem: payload.sourceSystem,
        entityType: payload.entityType,
        fileName: payload.fileName,
        metadata: payload.metadata,
        rows: payload.rows,
        initiatedByUserId: input.actor.userId,
      });
      await input.repositories.operations.imports.saveJob(importJob);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: importJob.locationSlug,
        action: "import.job.created",
        entityType: "import_job",
        entityId: importJob.id,
        summary: `Created ${importJob.entityType} import job from ${importJob.sourceSystem}`,
        metadata: {
          entityType: importJob.entityType,
          sourceSystem: importJob.sourceSystem,
          rowCount: importJob.counts.totalRows,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        201,
        importJobResponseSchema.parse({
          ok: true,
          data: {
            importJob,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid import job request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const importJobMatch = matchImportJobPath(input.pathname);
  const importMappingProfileMatch = matchImportMappingProfilePath(input.pathname);
  const importJobReconciliationMatch = matchImportJobReconciliationPath(input.pathname);
  const importJobRetryMatch = matchImportJobRetryPath(input.pathname);
  const reconciliationIssueMatch = matchReconciliationIssuePath(input.pathname);

  if (importMappingProfileMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        importMappingProfileUpdateRequestSchema.parse(body),
      );
      const existingProfile = await input.repositories.operations.imports.getMappingProfile(
        importMappingProfileMatch.profileId,
      );
      if (!existingProfile) {
        sendError(input.response, 404, "not_found", "Import mapping profile not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, existingProfile.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }

      const mappingProfile = applyImportMappingProfileUpdate({
        profile: existingProfile,
        name: payload.name,
        status: payload.status,
        fieldMappings: payload.fieldMappings,
        updatedByUserId: input.actor.userId,
      });
      await input.repositories.operations.imports.saveMappingProfile(mappingProfile);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: mappingProfile.locationSlug,
        action: "import.mapping_profile.updated",
        entityType: "import_mapping_profile",
        entityId: mappingProfile.id,
        summary: `Updated import mapping profile ${mappingProfile.name}`,
        metadata: {
          status: mappingProfile.status,
          fieldMappingCount: mappingProfile.fieldMappings.length,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        importMappingProfileResponseSchema.parse({
          ok: true,
          data: {
            mappingProfile,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid mapping profile update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (importJobReconciliationMatch && input.method === "GET") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const importJob = await input.repositories.operations.imports.getJob(
      importJobReconciliationMatch.importJobId,
    );
    if (!importJob) {
      sendError(input.response, 404, "not_found", "Import job not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, importJob.locationSlug, "admin.import.manage")) {
      sendError(input.response, 403, "forbidden", "Location import access is restricted.");
      return true;
    }

    const issues = await input.repositories.operations.imports.listReconciliationIssues(
      importJob.id,
    );
    sendJson(
      input.response,
      200,
      importJobReconciliationResponseSchema.parse({
        ok: true,
        data: {
          importJob,
          issues: issues.length ? issues : buildImportJobReconciliationIssues(importJob),
        },
      }),
    );
    return true;
  }

  if (reconciliationIssueMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        reconciliationIssueUpdateRequestSchema.parse(body),
      );
      const importJob = await input.repositories.operations.imports.getJob(
        reconciliationIssueMatch.importJobId,
      );
      if (!importJob) {
        sendError(input.response, 404, "not_found", "Import job not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, importJob.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }
      const issue = await input.repositories.operations.imports.getReconciliationIssue(
        reconciliationIssueMatch.issueId,
      );
      if (!issue || issue.importJobId !== importJob.id) {
        sendError(input.response, 404, "not_found", "Reconciliation issue not found.");
        return true;
      }

      const updatedIssue = updateReconciliationIssue({
        issue,
        status: payload.status,
      });
      await input.repositories.operations.imports.saveReconciliationIssue(updatedIssue);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: updatedIssue.locationSlug,
        action: "import.reconciliation_issue.updated",
        entityType: "reconciliation_issue",
        entityId: updatedIssue.id,
        summary: `Updated reconciliation issue for row ${updatedIssue.rowNumber}`,
        metadata: {
          status: updatedIssue.status,
          issueCode: updatedIssue.issueCode,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        importJobReconciliationResponseSchema.parse({
          ok: true,
          data: {
            importJob,
            issues: await input.repositories.operations.imports.listReconciliationIssues(
              importJob.id,
            ),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid reconciliation issue update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (importJobRetryMatch && input.method === "POST") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        importJobRetryRequestSchema.parse(body),
      );
      const importJob = await input.repositories.operations.imports.getJob(
        importJobRetryMatch.importJobId,
      );
      if (!importJob) {
        sendError(input.response, 404, "not_found", "Import job not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, importJob.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }

      const updatedImportJob = retryImportJobRows({
        job: importJob,
        rowNumbers: payload.rowNumbers,
      });
      await input.repositories.operations.imports.saveJob(updatedImportJob);
      await syncStoredReconciliationIssues(input.repositories, importJob.id, updatedImportJob);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: updatedImportJob.locationSlug,
        action: "import.job.retried",
        entityType: "import_job",
        entityId: updatedImportJob.id,
        summary: `Retried import job ${updatedImportJob.id}`,
        metadata: {
          retriedRowNumbers:
            payload.rowNumbers ??
            buildImportJobReconciliationIssues(importJob).map((issue) => issue.rowNumber),
          remainingQueuedRows: updatedImportJob.counts.queuedRows,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        importJobResponseSchema.parse({
          ok: true,
          data: {
            importJob: updatedImportJob,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid import retry request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (importJobMatch && input.method === "GET") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const importJob = await input.repositories.operations.imports.getJob(
      importJobMatch.importJobId,
    );
    if (!importJob) {
      sendError(input.response, 404, "not_found", "Import job not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, importJob.locationSlug, "admin.import.manage")) {
      sendError(input.response, 403, "forbidden", "Location import access is restricted.");
      return true;
    }

    sendJson(
      input.response,
      200,
      importJobResponseSchema.parse({
        ok: true,
        data: {
          importJob,
        },
      }),
    );
    return true;
  }

  if (importJobMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        importJobUpdateRequestSchema.parse(body),
      );
      const importJob = await input.repositories.operations.imports.getJob(
        importJobMatch.importJobId,
      );
      if (!importJob) {
        sendError(input.response, 404, "not_found", "Import job not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, importJob.locationSlug, "admin.import.manage")) {
        sendError(input.response, 403, "forbidden", "Location import access is restricted.");
        return true;
      }

      const updatedImportJob = applyImportJobUpdate({
        job: importJob,
        status: payload.status,
        metadata: payload.metadata,
        rowUpdates: payload.rowUpdates,
        errorMessage: payload.errorMessage,
      });
      await input.repositories.operations.imports.saveJob(updatedImportJob);
      await syncStoredReconciliationIssues(input.repositories, importJob.id, updatedImportJob);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: updatedImportJob.locationSlug,
        action: "import.job.updated",
        entityType: "import_job",
        entityId: updatedImportJob.id,
        summary: `Updated import job ${updatedImportJob.id} to ${updatedImportJob.status}`,
        metadata: {
          status: updatedImportJob.status,
          processedRows: updatedImportJob.counts.processedRows,
          failedRows: updatedImportJob.counts.failedRows,
        },
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        importJobResponseSchema.parse({
          ok: true,
          data: {
            importJob: updatedImportJob,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid import job update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
