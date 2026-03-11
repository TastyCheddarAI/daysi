import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminLearningEntitlementGrantRequestSchema,
  adminLearningEntitlementResponseSchema,
  adminLearningCertificatesResponseSchema,
  adminLearningEnrollmentsResponseSchema,
  adminLearningStatsResponseSchema,
  learningCertificatesResponseSchema,
  learningEnrollmentCreateRequestSchema,
  learningEnrollmentResponseSchema,
  learningEnrollmentsResponseSchema,
  learningEntitlementsResponseSchema,
  learningLessonProgressUpdateRequestSchema,
} from "../../../packages/contracts/src";
import {
  buildAdminLearningStatsView,
  buildLearningEnrollmentView,
  createLearningEntitlement,
  createLearningCertificate,
  createLearningEnrollment,
  finalizeEnrollmentCompletion,
  getEducationOfferBySlug,
  listAdminEducationOffersForLocation,
  listLearningCertificatesForActor as filterLearningCertificatesForActor,
  listLearningEnrollmentsForActor as filterLearningEnrollmentsForActor,
  listLearningEntitlementsForActor as filterLearningEntitlementsForActor,
  updateLessonProgressRecord as applyLessonProgressUpdate,
  type AppActor,
} from "../../../packages/domain/src";

import { getRuntimeClinicData } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordCustomerEvent } from "./customer-context-support";
import { readJsonBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
import type { AppRepositories } from "./persistence/app-repositories";
import {
  getLearningEnrollment,
  listAllLearningEntitlements,
  listLearningCertificates,
  listLearningEnrollments,
  listLearningEntitlementsForActor,
  listLessonProgressRecords,
  saveLearningCertificate,
  saveLearningEnrollment,
  saveLearningEntitlement,
  saveLessonProgressRecord,
  updateLearningEnrollment,
  updateLessonProgressRecord,
} from "./bootstrap-store";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const matchesSearch = (
  search: string | null,
  values: Array<string | undefined>,
): boolean => {
  const needle = search?.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(needle));
};

const matchLearningLessonProgressPath = (
  pathname: string,
): { lessonId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 6 &&
    segments[0] === "v1" &&
    segments[1] === "me" &&
    segments[2] === "education" &&
    segments[3] === "lessons" &&
    segments[5] === "progress"
  ) {
    return {
      lessonId: segments[4],
    };
  }

  return null;
};

export const handleLearningRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "POST" && input.pathname === "/v1/education/enrollments") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        learningEnrollmentCreateRequestSchema.parse(body),
      );
      if (!isLocationFeatureEnabled(input.env, payload.locationSlug, "education")) {
        sendError(input.response, 409, "conflict", "Education is not enabled at this location.");
        return true;
      }
      const entitlement = listLearningEntitlementsForActor({
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
      }).find(
        (entry) =>
          entry.locationSlug === payload.locationSlug &&
          entry.educationOfferSlug === payload.offerSlug &&
          entry.status === "active",
      );

      if (!entitlement) {
        sendError(
          input.response,
          403,
          "forbidden",
          "Active education entitlement is required before enrollment.",
        );
        return true;
      }

      const existing = listLearningEnrollments().find(
        (enrollment) => enrollment.entitlementId === entitlement.id,
      );
      const enrollment = existing ?? createLearningEnrollment({ entitlement });
      if (!existing) {
        saveLearningEnrollment(enrollment);
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: enrollment.locationSlug,
          customerEmail: enrollment.customerEmail,
          customerName: enrollment.customerName,
          actorUserId: enrollment.actorUserId,
          source: "learning",
          eventType: "education.enrollment_created",
          payload: {
            enrollmentId: enrollment.id,
            educationOfferSlug: enrollment.educationOfferSlug,
          },
          occurredAt: enrollment.createdAt,
        });
      }

      sendJson(
        input.response,
        existing ? 200 : 201,
        learningEnrollmentResponseSchema.parse({
          ok: true,
          data: {
            enrollment: buildLearningEnrollmentView({
              enrollment,
              lessonProgress: listLessonProgressRecords(enrollment.id),
              certificate: listLearningCertificates().find(
                (certificate) => certificate.enrollmentId === enrollment.id,
              ),
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid learning enrollment request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/me/education/enrollments") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    const certificates = listLearningCertificates();
    const enrollments = filterLearningEnrollmentsForActor(listLearningEnrollments(), {
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
    }).map((enrollment) =>
      buildLearningEnrollmentView({
        enrollment,
        lessonProgress: listLessonProgressRecords(enrollment.id),
        certificate: certificates.find(
          (certificate) => certificate.enrollmentId === enrollment.id,
        ),
      }),
    );

    sendJson(
      input.response,
      200,
      learningEnrollmentsResponseSchema.parse({
        ok: true,
        data: {
          enrollments,
        },
      }),
    );
    return true;
  }

  const lessonProgressMatch = matchLearningLessonProgressPath(input.pathname);
  if (lessonProgressMatch && input.method === "POST") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        learningLessonProgressUpdateRequestSchema.parse(body),
      );
      const enrollment = getLearningEnrollment(payload.enrollmentId);
      if (!enrollment) {
        sendError(input.response, 404, "not_found", "Learning enrollment not found.");
        return true;
      }
      if (
        !filterLearningEnrollmentsForActor([enrollment], {
          actorUserId: input.actor.userId,
          actorEmail: input.actor.email,
        }).length
      ) {
        sendError(input.response, 403, "forbidden", "Enrollment access is restricted.");
        return true;
      }

      const existingProgress = listLessonProgressRecords(enrollment.id).find(
        (entry) => entry.moduleSlug === lessonProgressMatch.lessonId,
      );
      const progress = applyLessonProgressUpdate({
        enrollment,
        existingProgress,
        moduleSlug: lessonProgressMatch.lessonId,
        status: payload.status,
        percentComplete: payload.percentComplete,
      });
      if (existingProgress) {
        updateLessonProgressRecord(progress);
      } else {
        saveLessonProgressRecord(progress);
      }
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: enrollment.locationSlug,
        customerEmail: enrollment.customerEmail,
        customerName: enrollment.customerName,
        actorUserId: enrollment.actorUserId,
        source: "learning",
        eventType: "education.progress_updated",
        payload: {
          enrollmentId: enrollment.id,
          moduleSlug: progress.moduleSlug,
          status: progress.status,
          percentComplete: progress.percentComplete,
        },
        occurredAt: progress.updatedAt,
      });

      const allProgress = [
        ...listLessonProgressRecords(enrollment.id).filter(
          (entry) => entry.moduleSlug !== lessonProgressMatch.lessonId,
        ),
        progress,
      ];
      const updatedEnrollment = finalizeEnrollmentCompletion({
        enrollment,
        lessonProgress: allProgress,
      });
      updateLearningEnrollment(updatedEnrollment);

      let certificate = listLearningCertificates().find(
        (entry) => entry.enrollmentId === enrollment.id,
      );
      if (!certificate && updatedEnrollment.completedAt) {
        certificate = createLearningCertificate({
          enrollment: updatedEnrollment,
          now: updatedEnrollment.completedAt,
        });
        saveLearningCertificate(certificate);
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: updatedEnrollment.locationSlug,
          customerEmail: updatedEnrollment.customerEmail,
          customerName: updatedEnrollment.customerName,
          actorUserId: updatedEnrollment.actorUserId,
          source: "learning",
          eventType: "education.certificate_issued",
          payload: {
            enrollmentId: updatedEnrollment.id,
            certificateId: certificate.id,
            educationOfferSlug: updatedEnrollment.educationOfferSlug,
          },
          occurredAt: certificate.issuedAt,
        });
      }

      sendJson(
        input.response,
        200,
        learningEnrollmentResponseSchema.parse({
          ok: true,
          data: {
            enrollment: buildLearningEnrollmentView({
              enrollment: updatedEnrollment,
              lessonProgress: allProgress,
              certificate,
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid learning progress request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/me/education/certificates") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    sendJson(
      input.response,
      200,
      learningCertificatesResponseSchema.parse({
        ok: true,
        data: {
          certificates: filterLearningCertificatesForActor(listLearningCertificates(), {
            actorUserId: input.actor.userId,
            actorEmail: input.actor.email,
          }),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/me/education/entitlements") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

    sendJson(
      input.response,
      200,
      learningEntitlementsResponseSchema.parse({
        ok: true,
        data: {
          entitlements: listLearningEntitlementsForActor({
            actorUserId: input.actor.userId,
            actorEmail: input.actor.email,
          }),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/education/entitlements") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const actorEmail = url.searchParams.get("customerEmail") ?? undefined;
    const actorUserId = url.searchParams.get("actorUserId") ?? undefined;
    const entitlements = actorEmail || actorUserId
      ? filterLearningEntitlementsForActor(listAllLearningEntitlements(), {
          actorEmail,
          actorUserId,
        })
      : listAllLearningEntitlements().filter((entitlement) => entitlement.status === "active");

    sendJson(
      input.response,
      200,
      learningEntitlementsResponseSchema.parse({
        ok: true,
        data: {
          entitlements,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/education/enrollments") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const offerSlug = url.searchParams.get("offerSlug") ?? undefined;
    const search = url.searchParams.get("search");
    const certificates = listLearningCertificates();

    const enrollments = listLearningEnrollments()
      .filter(
        (enrollment) =>
          enrollment.locationSlug === locationSlug &&
          (!offerSlug || enrollment.educationOfferSlug === offerSlug),
      )
      .map((enrollment) =>
        buildLearningEnrollmentView({
          enrollment,
          lessonProgress: listLessonProgressRecords(enrollment.id),
          certificate: certificates.find(
            (certificate) => certificate.enrollmentId === enrollment.id,
          ),
        }),
      )
      .filter((enrollment) =>
        matchesSearch(search, [
          enrollment.enrollment.customerName,
          enrollment.enrollment.customerEmail,
          enrollment.enrollment.educationOfferTitle,
          enrollment.enrollment.educationOfferSlug,
        ]),
      );

    sendJson(
      input.response,
      200,
      adminLearningEnrollmentsResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          enrollments,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/education/certificates") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const offerSlug = url.searchParams.get("offerSlug") ?? undefined;
    const search = url.searchParams.get("search");

    const certificates = listLearningCertificates().filter(
      (certificate) =>
        certificate.locationSlug === locationSlug &&
        (!offerSlug || certificate.educationOfferSlug === offerSlug) &&
        matchesSearch(search, [
          certificate.customerName,
          certificate.customerEmail,
          certificate.educationOfferTitle,
          certificate.educationOfferSlug,
        ]),
    );

    sendJson(
      input.response,
      200,
      adminLearningCertificatesResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          certificates,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/education/stats") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    const clinicData = getRuntimeClinicData(input.env);
    const certificates = listLearningCertificates().filter(
      (certificate) => certificate.locationSlug === locationSlug,
    );
    const enrollmentViews = listLearningEnrollments()
      .filter((enrollment) => enrollment.locationSlug === locationSlug)
      .map((enrollment) =>
        buildLearningEnrollmentView({
          enrollment,
          lessonProgress: listLessonProgressRecords(enrollment.id),
          certificate: certificates.find(
            (certificate) => certificate.enrollmentId === enrollment.id,
          ),
        }),
      );

    sendJson(
      input.response,
      200,
      adminLearningStatsResponseSchema.parse({
        ok: true,
        data: buildAdminLearningStatsView({
          locationSlug,
          offers: listAdminEducationOffersForLocation(clinicData.catalog, locationSlug),
          entitlements: listAllLearningEntitlements(),
          enrollments: enrollmentViews,
          certificates,
        }),
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/education/grants") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminLearningEntitlementGrantRequestSchema.parse(body),
      );
      if (!isLocationFeatureEnabled(input.env, payload.locationSlug, "education")) {
        sendError(input.response, 409, "conflict", "Education is not enabled at this location.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const offer = getEducationOfferBySlug(
        clinicData.catalog,
        payload.locationSlug,
        payload.offerSlug,
        { includeDraft: true },
      );

      if (!offer) {
        sendError(input.response, 404, "not_found", "Education offer not found.");
        return true;
      }

      if (!offer.staffGrantEnabled) {
        sendError(
          input.response,
          409,
          "conflict",
          "This education offer is not enabled for admin grants.",
        );
        return true;
      }

      const entitlement = saveLearningEntitlement(
        createLearningEntitlement({
          locationSlug: offer.locationSlug,
          educationOfferSlug: offer.slug,
          educationOfferTitle: offer.title,
          moduleSlugs: offer.moduleSlugs,
          customerEmail: payload.customerEmail,
          customerName: payload.customerName,
          actorUserId: payload.actorUserId,
          source: "admin_grant",
          grantedByUserId: input.actor.userId,
        }),
      );

      sendJson(
        input.response,
        201,
        adminLearningEntitlementResponseSchema.parse({
          ok: true,
          data: {
            entitlement,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid education grant request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
