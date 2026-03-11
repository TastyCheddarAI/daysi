import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminTreatmentPlanCreateRequestSchema,
  adminTreatmentPlanResponseSchema,
  adminTreatmentPlansResponseSchema,
  adminTreatmentPlanUpdateRequestSchema,
  myTreatmentPlansResponseSchema,
} from "../../../packages/contracts/src";
import {
  acceptTreatmentPlan,
  archiveTreatmentPlan,
  buildAssessmentFollowUpRecommendations,
  canManageLocation,
  createTreatmentPlan,
  listTreatmentPlansForCustomer,
  restoreTreatmentPlanToDraft,
  shareTreatmentPlan,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeClinicData, getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
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
): boolean => !!actor && canManageLocation(actor, "admin.customer.manage", locationSlug);

const matchAdminTreatmentPlanPath = (
  pathname: string,
): { treatmentPlanId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "treatment-plans"
  ) {
    return {
      treatmentPlanId: segments[3],
    };
  }

  return null;
};

const matchMyTreatmentPlanAcceptPath = (
  pathname: string,
): { treatmentPlanId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "me" &&
    segments[2] === "treatment-plans" &&
    segments[4] === "accept"
  ) {
    return {
      treatmentPlanId: segments[3],
    };
  }

  return null;
};

export const handleTreatmentPlanRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "POST" && input.pathname === "/v1/admin/treatment-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminTreatmentPlanCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Treatment plan access is restricted.",
        );
        return true;
      }

      const tenant = getRuntimeTenantContext(input.env);
      if (!tenant.locations.some((location) => location.slug === payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const assessment = await input.repositories.clinicalIntelligence.skinAssessments.getById(
        payload.assessmentId,
      );
      if (!assessment) {
        sendError(input.response, 404, "not_found", "Skin assessment not found.");
        return true;
      }
      if (assessment.locationSlug !== payload.locationSlug) {
        sendError(
          input.response,
          409,
          "conflict",
          "Skin assessment location does not match the requested treatment-plan location.",
        );
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const followUp = buildAssessmentFollowUpRecommendations({
        locationSlug: payload.locationSlug,
        actorUserId: input.actor.userId,
        assessment,
        prefersMembership: payload.prefersMembership,
        services: clinicData.catalog.services.filter(
          (service) => service.locationSlug === payload.locationSlug && service.bookable,
        ),
        membershipPlans: clinicData.membershipPlans.filter(
          (plan) => plan.locationSlug === payload.locationSlug,
        ),
      });
      await input.repositories.clinicalIntelligence.aiRuns.save(followUp.run);

      const treatmentPlan = createTreatmentPlan({
        assessment,
        followUp,
        createdByUserId: input.actor.userId,
        internalNotes: payload.internalNotes,
      });
      await input.repositories.clinicalIntelligence.treatmentPlans.save(treatmentPlan);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "treatment_plan.created",
        entityType: "treatment_plan",
        entityId: treatmentPlan.id,
        summary: `Created treatment plan for ${treatmentPlan.customerEmail}`,
        repositories: input.repositories,
      });
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: treatmentPlan.locationSlug,
        customerEmail: treatmentPlan.customerEmail,
        customerName: treatmentPlan.customerName,
        actorUserId: input.actor.userId,
        source: "manual",
        eventType: "treatment_plan.created",
        payload: {
          treatmentPlanId: treatmentPlan.id,
          sourceAssessmentId: treatmentPlan.sourceAssessmentId,
          sourceAiRunId: treatmentPlan.sourceAiRunId,
        },
        occurredAt: treatmentPlan.createdAt,
      });

      sendJson(
        input.response,
        201,
        adminTreatmentPlanResponseSchema.parse({
          ok: true,
          data: {
            treatmentPlan,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid treatment-plan request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/treatment-plans") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    const customerEmail = url.searchParams.get("customerEmail")?.toLowerCase();
    if (!locationSlug) {
      sendError(input.response, 400, "bad_request", "locationSlug is required.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(
        input.response,
        403,
        "forbidden",
        "Treatment plan access is restricted.",
      );
      return true;
    }

    const treatmentPlans = (
      await input.repositories.clinicalIntelligence.treatmentPlans.list(locationSlug)
    ).filter((treatmentPlan) =>
      customerEmail ? treatmentPlan.customerEmail === customerEmail : true,
    );

    sendJson(
      input.response,
      200,
      adminTreatmentPlansResponseSchema.parse({
        ok: true,
        data: {
          treatmentPlans,
        },
      }),
    );
    return true;
  }

  const adminTreatmentPlanMatch = matchAdminTreatmentPlanPath(input.pathname);
  if (adminTreatmentPlanMatch && input.method === "GET") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const treatmentPlan = await input.repositories.clinicalIntelligence.treatmentPlans.get(
      adminTreatmentPlanMatch.treatmentPlanId,
    );
    if (!treatmentPlan) {
      sendError(input.response, 404, "not_found", "Treatment plan not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, treatmentPlan.locationSlug)) {
      sendError(
        input.response,
        403,
        "forbidden",
        "Treatment plan access is restricted.",
      );
      return true;
    }

    sendJson(
      input.response,
      200,
      adminTreatmentPlanResponseSchema.parse({
        ok: true,
        data: {
          treatmentPlan,
        },
      }),
    );
    return true;
  }

  if (adminTreatmentPlanMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const treatmentPlan = await input.repositories.clinicalIntelligence.treatmentPlans.get(
        adminTreatmentPlanMatch.treatmentPlanId,
      );
      if (!treatmentPlan) {
        sendError(input.response, 404, "not_found", "Treatment plan not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, treatmentPlan.locationSlug)) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Treatment plan access is restricted.",
        );
        return true;
      }

      const payload = await readJsonBody(input.request, (body) =>
        adminTreatmentPlanUpdateRequestSchema.parse(body),
      );

      const nextTreatmentPlan =
        payload.status === "shared"
          ? shareTreatmentPlan({
              treatmentPlan,
              internalNotes: payload.internalNotes,
            })
          : payload.status === "archived"
            ? archiveTreatmentPlan({
                treatmentPlan,
                internalNotes: payload.internalNotes,
                archivedReason: payload.archivedReason,
              })
            : restoreTreatmentPlanToDraft({
                treatmentPlan,
                internalNotes: payload.internalNotes,
              });

      await input.repositories.clinicalIntelligence.treatmentPlans.update(nextTreatmentPlan);
      await recordAdminAction({
        actor: input.actor,
        locationSlug: nextTreatmentPlan.locationSlug,
        action: `treatment_plan.${nextTreatmentPlan.status}`,
        entityType: "treatment_plan",
        entityId: nextTreatmentPlan.id,
        summary: `Updated treatment plan ${nextTreatmentPlan.id} to ${nextTreatmentPlan.status}`,
        repositories: input.repositories,
      });
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: nextTreatmentPlan.locationSlug,
        customerEmail: nextTreatmentPlan.customerEmail,
        customerName: nextTreatmentPlan.customerName,
        actorUserId: input.actor.userId,
        source: "manual",
        eventType: `treatment_plan.${nextTreatmentPlan.status}`,
        payload: {
          treatmentPlanId: nextTreatmentPlan.id,
        },
        occurredAt: nextTreatmentPlan.updatedAt,
      });

      sendJson(
        input.response,
        200,
        adminTreatmentPlanResponseSchema.parse({
          ok: true,
          data: {
            treatmentPlan: nextTreatmentPlan,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid treatment-plan update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/me/treatment-plans") {
    if (!input.actor?.email) {
      sendError(input.response, 401, "unauthorized", "Authenticated customer access is required.");
      return true;
    }

    const treatmentPlans = listTreatmentPlansForCustomer({
      treatmentPlans: await input.repositories.clinicalIntelligence.treatmentPlans.list(),
      customerEmail: input.actor.email,
    });

    sendJson(
      input.response,
      200,
      myTreatmentPlansResponseSchema.parse({
        ok: true,
        data: {
          treatmentPlans,
        },
      }),
    );
    return true;
  }

  const acceptMatch = matchMyTreatmentPlanAcceptPath(input.pathname);
  if (acceptMatch && input.method === "POST") {
    if (!input.actor?.email) {
      sendError(input.response, 401, "unauthorized", "Authenticated customer access is required.");
      return true;
    }

    try {
      const treatmentPlan = await input.repositories.clinicalIntelligence.treatmentPlans.get(
        acceptMatch.treatmentPlanId,
      );
      if (!treatmentPlan) {
        sendError(input.response, 404, "not_found", "Treatment plan not found.");
        return true;
      }
      if (treatmentPlan.customerEmail !== input.actor.email.toLowerCase()) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Treatment plan access is restricted.",
        );
        return true;
      }

      const acceptedTreatmentPlan = acceptTreatmentPlan({
        treatmentPlan,
      });
      await input.repositories.clinicalIntelligence.treatmentPlans.update(
        acceptedTreatmentPlan,
      );
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: acceptedTreatmentPlan.locationSlug,
        customerEmail: acceptedTreatmentPlan.customerEmail,
        customerName: acceptedTreatmentPlan.customerName,
        actorUserId: input.actor.userId,
        source: "manual",
        eventType: "treatment_plan.accepted",
        payload: {
          treatmentPlanId: acceptedTreatmentPlan.id,
        },
        occurredAt: acceptedTreatmentPlan.acceptedAt,
      });

      sendJson(
        input.response,
        200,
        adminTreatmentPlanResponseSchema.parse({
          ok: true,
          data: {
            treatmentPlan: acceptedTreatmentPlan,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid treatment-plan accept request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
