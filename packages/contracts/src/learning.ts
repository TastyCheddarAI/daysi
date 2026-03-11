import { z } from "zod";

import { locationSlugSchema, successEnvelope } from "./common";

export const learningEntitlementSourceSchema = z.enum([
  "purchase",
  "membership",
  "admin_grant",
]);
export const learningEntitlementStatusSchema = z.enum(["active", "revoked"]);
export const learningProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);

export const learningEntitlementSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  educationOfferSlug: z.string().min(1),
  educationOfferTitle: z.string().min(1),
  moduleSlugs: z.array(z.string().min(1)).min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  actorUserId: z.string().min(1).optional(),
  source: learningEntitlementSourceSchema,
  sourceOrderId: z.string().min(1).optional(),
  membershipSubscriptionId: z.string().min(1).optional(),
  grantedByUserId: z.string().min(1).optional(),
  status: learningEntitlementStatusSchema,
  grantedAt: z.string().datetime({ offset: true }),
  revokedAt: z.string().datetime({ offset: true }).optional(),
});

export const learningEntitlementsResponseSchema = successEnvelope(
  z.object({
    entitlements: z.array(learningEntitlementSchema),
  }),
);

export const adminLearningEntitlementGrantRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  offerSlug: z.string().trim().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1).optional(),
});

export const adminLearningEntitlementResponseSchema = successEnvelope(
  z.object({
    entitlement: learningEntitlementSchema,
  }),
);

export const learningEnrollmentSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  educationOfferSlug: z.string().min(1),
  educationOfferTitle: z.string().min(1),
  moduleSlugs: z.array(z.string().min(1)).min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  actorUserId: z.string().min(1).optional(),
  entitlementId: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).optional(),
});

export const lessonProgressRecordSchema = z.object({
  id: z.string().min(1),
  enrollmentId: z.string().min(1),
  moduleSlug: z.string().min(1),
  status: learningProgressStatusSchema,
  percentComplete: z.number().int().min(0).max(100),
  startedAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }),
});

export const learningCertificateSchema = z.object({
  id: z.string().min(1),
  enrollmentId: z.string().min(1),
  locationSlug: locationSlugSchema,
  educationOfferSlug: z.string().min(1),
  educationOfferTitle: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  actorUserId: z.string().min(1).optional(),
  issuedAt: z.string().datetime({ offset: true }),
});

export const learningEnrollmentViewSchema = z.object({
  enrollment: learningEnrollmentSchema,
  lessonProgress: z.array(lessonProgressRecordSchema),
  summary: z.object({
    totalModules: z.number().int().nonnegative(),
    completedModules: z.number().int().nonnegative(),
    percentComplete: z.number().int().min(0).max(100),
  }),
  certificate: learningCertificateSchema.nullable(),
});

export const learningEnrollmentCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  offerSlug: z.string().trim().min(1),
});

export const learningEnrollmentResponseSchema = successEnvelope(
  z.object({
    enrollment: learningEnrollmentViewSchema,
  }),
);

export const learningEnrollmentsResponseSchema = successEnvelope(
  z.object({
    enrollments: z.array(learningEnrollmentViewSchema),
  }),
);

export const learningLessonProgressUpdateRequestSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  status: learningProgressStatusSchema,
  percentComplete: z.number().int().min(0).max(100).optional(),
});

export const learningCertificatesResponseSchema = successEnvelope(
  z.object({
    certificates: z.array(learningCertificateSchema),
  }),
);

export const adminLearningOfferStatsSchema = z.object({
  offerSlug: z.string().min(1),
  offerTitle: z.string().min(1),
  activeEntitlementCount: z.number().int().nonnegative(),
  enrollmentCount: z.number().int().nonnegative(),
  completedEnrollmentCount: z.number().int().nonnegative(),
  certificateCount: z.number().int().nonnegative(),
  averagePercentComplete: z.number().int().min(0).max(100),
});

export const adminLearningStatsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    totals: z.object({
      activeEntitlementCount: z.number().int().nonnegative(),
      enrollmentCount: z.number().int().nonnegative(),
      completedEnrollmentCount: z.number().int().nonnegative(),
      inProgressEnrollmentCount: z.number().int().nonnegative(),
      certificateCount: z.number().int().nonnegative(),
      completionRate: z.number().int().min(0).max(100),
    }),
    offers: z.array(adminLearningOfferStatsSchema),
  }),
);

export const adminLearningEnrollmentsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    enrollments: z.array(learningEnrollmentViewSchema),
  }),
);

export const adminLearningCertificatesResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    certificates: z.array(learningCertificateSchema),
  }),
);
