import type { IncomingMessage, ServerResponse } from "node:http";

import {
  bookingAssistantAssessmentFollowUpRequestSchema,
  bookingAssistantAssessmentFollowUpResponseSchema,
  bookingAssistantChatRequestSchema,
  bookingAssistantChatResponseSchema,
  bookingAssistantRecommendationsRequestSchema,
  bookingAssistantRecommendationsResponseSchema,
} from "../../../packages/contracts/src";
import {
  buildAssessmentFollowUpRecommendations,
  buildBookingAssistantChat,
  buildBookingAssistantRecommendations,
  canManageLocation,
  type AppActor,
} from "../../../packages/domain/src";

import { getRuntimeClinicData, getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import { readJsonBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
import type { AppRepositories } from "./persistence/app-repositories";

const locationExists = (env: AppEnv, locationSlug: string): boolean =>
  getRuntimeTenantContext(env).locations.some((location) => location.slug === locationSlug);

const canAccessCustomerAssessment = (input: {
  actor: AppActor | null;
  locationSlug: string;
  customerEmail?: string;
}): boolean => {
  if (!input.customerEmail) {
    return !!input.actor;
  }

  if (!input.actor) {
    return false;
  }

  if (input.actor.roles.some((role) => ["admin", "owner"].includes(role))) {
    return canManageLocation(input.actor, "admin.customer.manage", input.locationSlug);
  }

  return input.actor.email === input.customerEmail.toLowerCase();
};

export const handleAiRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "POST" && input.pathname === "/v1/ai/booking-assistant/chat") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        bookingAssistantChatRequestSchema.parse(body),
      );
      if (!locationExists(input.env, payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const responsePayload = buildBookingAssistantChat({
        locationSlug: payload.locationSlug,
        actorUserId: input.actor?.userId,
        messages: payload.messages,
        services: clinicData.catalog.services.filter(
          (service) => service.locationSlug === payload.locationSlug && service.bookable,
        ),
        membershipPlans: clinicData.membershipPlans.filter(
          (plan) => plan.locationSlug === payload.locationSlug,
        ),
      });
      await input.repositories.clinicalIntelligence.aiRuns.save(responsePayload.run);
      if (input.actor?.email) {
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: payload.locationSlug,
          customerEmail: input.actor.email,
          customerName: input.actor.displayName,
          actorUserId: input.actor.userId,
          source: "ai",
          eventType: "ai.run_completed",
          payload: {
            runId: responsePayload.run.id,
            task: responsePayload.run.task,
            provider: responsePayload.run.provider,
          },
          occurredAt: responsePayload.run.completedAt,
        });
      }

      sendJson(
        input.response,
        200,
        bookingAssistantChatResponseSchema.parse({
          ok: true,
          data: responsePayload,
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid booking assistant request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (
    input.method === "POST" &&
    input.pathname === "/v1/ai/booking-assistant/recommendations"
  ) {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        bookingAssistantRecommendationsRequestSchema.parse(body),
      );
      if (!locationExists(input.env, payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const responsePayload = buildBookingAssistantRecommendations({
        locationSlug: payload.locationSlug,
        actorUserId: input.actor?.userId,
        concern: payload.concern,
        budgetAmountCents: payload.budgetAmountCents,
        prefersMembership: payload.prefersMembership,
        services: clinicData.catalog.services.filter(
          (service) => service.locationSlug === payload.locationSlug && service.bookable,
        ),
        membershipPlans: clinicData.membershipPlans.filter(
          (plan) => plan.locationSlug === payload.locationSlug,
        ),
      });
      await input.repositories.clinicalIntelligence.aiRuns.save(responsePayload.run);
      if (input.actor?.email) {
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: payload.locationSlug,
          customerEmail: input.actor.email,
          customerName: input.actor.displayName,
          actorUserId: input.actor.userId,
          source: "ai",
          eventType: "ai.run_completed",
          payload: {
            runId: responsePayload.run.id,
            task: responsePayload.run.task,
            provider: responsePayload.run.provider,
          },
          occurredAt: responsePayload.run.completedAt,
        });
      }

      sendJson(
        input.response,
        200,
        bookingAssistantRecommendationsResponseSchema.parse({
          ok: true,
          data: responsePayload,
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid booking recommendation request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (
    input.method === "POST" &&
    input.pathname === "/v1/ai/booking-assistant/assessment-follow-up"
  ) {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        bookingAssistantAssessmentFollowUpRequestSchema.parse(body),
      );
      if (!locationExists(input.env, payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!isLocationFeatureEnabled(input.env, payload.locationSlug, "skinAnalysis")) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Skin analysis is disabled for this location.",
        );
        return true;
      }

      const requestedCustomerEmail = payload.customerEmail?.toLowerCase() ?? input.actor?.email;
      if (
        !canAccessCustomerAssessment({
          actor: input.actor,
          locationSlug: payload.locationSlug,
          customerEmail: requestedCustomerEmail,
        })
      ) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Assessment follow-up access is restricted.",
        );
        return true;
      }

      const assessment = payload.assessmentId
        ? await input.repositories.clinicalIntelligence.skinAssessments.getById(
            payload.assessmentId,
          )
        : (await input.repositories.clinicalIntelligence.skinAssessments.list(
            payload.locationSlug,
          )).find((entry) =>
            requestedCustomerEmail ? entry.customerEmail === requestedCustomerEmail : false,
          );
      if (!assessment || assessment.locationSlug !== payload.locationSlug) {
        sendError(input.response, 404, "not_found", "Skin assessment not found.");
        return true;
      }
      if (
        requestedCustomerEmail &&
        assessment.customerEmail !== requestedCustomerEmail &&
        !input.actor?.roles.some((role) => ["admin", "owner"].includes(role))
      ) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Assessment follow-up access is restricted.",
        );
        return true;
      }

      const clinicData = getRuntimeClinicData(input.env);
      const responsePayload = buildAssessmentFollowUpRecommendations({
        locationSlug: payload.locationSlug,
        actorUserId: input.actor?.userId,
        assessment,
        prefersMembership: payload.prefersMembership,
        services: clinicData.catalog.services.filter(
          (service) => service.locationSlug === payload.locationSlug && service.bookable,
        ),
        membershipPlans: clinicData.membershipPlans.filter(
          (plan) => plan.locationSlug === payload.locationSlug,
        ),
      });
      await input.repositories.clinicalIntelligence.aiRuns.save(responsePayload.run);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: payload.locationSlug,
        customerEmail: assessment.customerEmail,
        customerName: assessment.customerName,
        actorUserId: input.actor?.userId,
        source: "ai",
        eventType: "ai.assessment_follow_up_completed",
        payload: {
          runId: responsePayload.run.id,
          task: responsePayload.run.task,
          provider: responsePayload.run.provider,
          assessmentId: assessment.id,
        },
        occurredAt: responsePayload.run.completedAt,
      });

      sendJson(
        input.response,
        200,
        bookingAssistantAssessmentFollowUpResponseSchema.parse({
          ok: true,
          data: responsePayload,
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid assessment follow-up request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
