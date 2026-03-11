import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  skinAnalyzerWebhookRequestSchema,
  skinAnalyzerWebhookResponseSchema,
  skinAssessmentDetailResponseSchema,
  skinAssessmentsResponseSchema,
} from "../../../packages/contracts/src";
import {
  canManageLocation,
  createSkinAssessmentIntakeRecord,
  createSkinAssessmentRecord,
  filterSkinAssessmentRecords,
  type AppActor,
} from "../../../packages/domain/src";

import { getRuntimeClinicData, getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import { readRawBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
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

const parseSignedWebhookHeader = (
  headerValue: string,
): { timestamp: string; signature: string } | null => {
  const parts = headerValue.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) {
    return null;
  }

  return {
    timestamp,
    signature,
  };
};

const verifyWebhookSignature = (input: {
  rawBody: string;
  signatureHeader: string | undefined;
  secret: string | undefined;
}): boolean => {
  if (!input.secret) {
    return true;
  }

  if (!input.signatureHeader) {
    return false;
  }

  const parsed = parseSignedWebhookHeader(input.signatureHeader);
  if (!parsed) {
    return false;
  }

  const expectedSignature = createHmac("sha256", input.secret)
    .update(`${parsed.timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(parsed.signature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    );
  } catch {
    return false;
  }
};

const matchAssessmentPath = (pathname: string): { assessmentId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "skin-assessments"
  ) {
    return {
      assessmentId: segments[3],
    };
  }

  return null;
};

export const handleSkinAssessmentRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "POST" && input.pathname === "/v1/webhooks/skin-analyzer") {
    const rawBody = await readRawBody(input.request);
    const signatureHeaderValue = input.request.headers["x-daysi-skin-signature"];
    const signatureHeader =
      typeof signatureHeaderValue === "string" ? signatureHeaderValue : undefined;

    if (
      !verifyWebhookSignature({
        rawBody,
        signatureHeader,
        secret: input.env.SKIN_ANALYZER_WEBHOOK_SECRET,
      })
    ) {
      sendError(
        input.response,
        401,
        "unauthorized",
        "Skin analyzer webhook signature is invalid.",
      );
      return true;
    }

    try {
      const payload = skinAnalyzerWebhookRequestSchema.parse(JSON.parse(rawBody));
      const tenant = getRuntimeTenantContext(input.env);
      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
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

      const existingIntake =
        await input.repositories.clinicalIntelligence.skinAssessments.findIntakeByEvent({
          locationSlug: payload.locationSlug,
          sourceApp: payload.sourceApp,
          eventId: payload.eventId,
        });
      if (existingIntake) {
        const existingAssessment =
          await input.repositories.clinicalIntelligence.skinAssessments.getByRawIntakeId(
            existingIntake.id,
          );
        if (!existingAssessment) {
          sendError(
            input.response,
            500,
            "internal_error",
            "Skin assessment intake exists without a normalized record.",
          );
          return true;
        }

        sendJson(
          input.response,
          200,
          skinAnalyzerWebhookResponseSchema.parse({
            ok: true,
            data: {
              received: true,
              duplicate: true,
              intakeId: existingIntake.id,
              assessmentId: existingAssessment.id,
            },
          }),
        );
        return true;
      }

      const intake = createSkinAssessmentIntakeRecord({
        payload,
        rawPayload: JSON.parse(rawBody) as unknown,
        signatureVerified: true,
        signatureHeader,
      });
      const clinicData = getRuntimeClinicData(input.env);
      const assessment = createSkinAssessmentRecord({
        intake,
        payload,
        knownServiceSlugs: clinicData.catalog.services
          .filter((service) => service.locationSlug === payload.locationSlug)
          .map((service) => service.slug),
      });

      await input.repositories.clinicalIntelligence.skinAssessments.saveIntake(intake);
      await input.repositories.clinicalIntelligence.skinAssessments.save(assessment);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: assessment.locationSlug,
        customerEmail: assessment.customerEmail,
        customerName: assessment.customerName,
        source: "skinAnalysis",
        eventType: "skin_assessment.completed",
        payload: {
          assessmentId: assessment.id,
          externalAssessmentId: assessment.externalAssessmentId,
          dominantConcernKeys: assessment.dominantConcernKeys,
          recommendedServiceSlugs: assessment.recommendedServiceSlugs,
          unresolvedRecommendedServiceSlugs: assessment.unresolvedRecommendedServiceSlugs,
          imageCount: assessment.imageCount,
        },
        occurredAt: assessment.capturedAt,
      });

      sendJson(
        input.response,
        201,
        skinAnalyzerWebhookResponseSchema.parse({
          ok: true,
          data: {
            received: true,
            duplicate: false,
            intakeId: intake.id,
            assessmentId: assessment.id,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid skin analyzer webhook payload.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/skin-assessments") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    const customerEmail = url.searchParams.get("customerEmail") ?? undefined;
    if (!locationSlug) {
      sendError(input.response, 400, "bad_request", "locationSlug is required.");
      return true;
    }
    if (!getRuntimeTenantContext(input.env).locations.some((location) => location.slug === locationSlug)) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(
        input.response,
        403,
        "forbidden",
        "Skin assessment access is restricted.",
      );
      return true;
    }

    const assessments = filterSkinAssessmentRecords({
      assessments: await input.repositories.clinicalIntelligence.skinAssessments.list(
        locationSlug,
      ),
      locationSlug,
      customerEmail,
    });
    sendJson(
      input.response,
      200,
      skinAssessmentsResponseSchema.parse({
        ok: true,
        data: {
          assessments,
        },
      }),
    );
    return true;
  }

  const assessmentMatch = matchAssessmentPath(input.pathname);
  if (assessmentMatch && input.method === "GET") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const assessment = await input.repositories.clinicalIntelligence.skinAssessments.getById(
      assessmentMatch.assessmentId,
    );
    if (!assessment) {
      sendError(input.response, 404, "not_found", "Skin assessment not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, assessment.locationSlug)) {
      sendError(
        input.response,
        403,
        "forbidden",
        "Skin assessment access is restricted.",
      );
      return true;
    }

    const intake = await input.repositories.clinicalIntelligence.skinAssessments.getIntake(
      assessment.rawIntakeId,
    );
    if (!intake) {
      sendError(
        input.response,
        500,
        "internal_error",
        "Skin assessment intake archive not found.",
      );
      return true;
    }

    sendJson(
      input.response,
      200,
      skinAssessmentDetailResponseSchema.parse({
        ok: true,
        data: {
          assessment,
          intake,
        },
      }),
    );
    return true;
  }

  return false;
};
