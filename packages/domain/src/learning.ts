import { randomUUID } from "node:crypto";

import type { BookingCustomer } from "./bookings";
import type { EducationOffer } from "./catalog";
import type { MembershipPlan, MembershipSubscription } from "./memberships";

export interface LearningEntitlementProvisioningEffect {
  kind: "grant-learning-entitlement";
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  source: "purchase" | "membership" | "admin_grant";
  membershipSubscriptionId?: string;
  grantedByUserId?: string;
}

export interface LearningEntitlement {
  id: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  source: "purchase" | "membership" | "admin_grant";
  sourceOrderId?: string;
  membershipSubscriptionId?: string;
  grantedByUserId?: string;
  status: "active" | "revoked";
  grantedAt: string;
  revokedAt?: string;
}

export type LearningProgressStatus = "not_started" | "in_progress" | "completed";

export interface LearningEnrollment {
  id: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  entitlementId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface LessonProgressRecord {
  id: string;
  enrollmentId: string;
  moduleSlug: string;
  status: LearningProgressStatus;
  percentComplete: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface LearningCertificate {
  id: string;
  enrollmentId: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  issuedAt: string;
}

export interface LearningEnrollmentView {
  enrollment: LearningEnrollment;
  lessonProgress: LessonProgressRecord[];
  summary: {
    totalModules: number;
    completedModules: number;
    percentComplete: number;
  };
  certificate: LearningCertificate | null;
}

export interface AdminLearningOfferStats {
  offerSlug: string;
  offerTitle: string;
  activeEntitlementCount: number;
  enrollmentCount: number;
  completedEnrollmentCount: number;
  certificateCount: number;
  averagePercentComplete: number;
}

export interface AdminLearningStatsView {
  locationSlug: string;
  totals: {
    activeEntitlementCount: number;
    enrollmentCount: number;
    completedEnrollmentCount: number;
    inProgressEnrollmentCount: number;
    certificateCount: number;
    completionRate: number;
  };
  offers: AdminLearningOfferStats[];
}

export const buildEducationPurchaseProvisioningEffects = (input: {
  offers: EducationOffer[];
  customer: BookingCustomer;
  actorUserId?: string;
}): LearningEntitlementProvisioningEffect[] =>
  input.offers.map((offer) => ({
    kind: "grant-learning-entitlement",
    locationSlug: offer.locationSlug,
    educationOfferSlug: offer.slug,
    educationOfferTitle: offer.title,
    moduleSlugs: offer.moduleSlugs,
    customerEmail: input.customer.email,
    customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
    actorUserId: input.actorUserId,
    source: "purchase",
  }));

export const buildMembershipLearningProvisioningEffects = (input: {
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  offers: EducationOffer[];
  customer: BookingCustomer;
  actorUserId?: string;
}): LearningEntitlementProvisioningEffect[] => {
  const plansBySlug = new Map(input.plans.map((plan) => [plan.slug, plan]));
  const offersBySlug = new Map(input.offers.map((offer) => [offer.slug, offer]));

  return input.subscriptions.flatMap((subscription) => {
    const plan = plansBySlug.get(subscription.planSlug);
    if (!plan) {
      return [];
    }

    return plan.entitlements.educationOfferSlugs.flatMap((offerSlug) => {
      const offer = offersBySlug.get(offerSlug);
      if (!offer) {
        return [];
      }

      return [
        {
          kind: "grant-learning-entitlement" as const,
          locationSlug: offer.locationSlug,
          educationOfferSlug: offer.slug,
          educationOfferTitle: offer.title,
          moduleSlugs: offer.moduleSlugs,
          customerEmail: input.customer.email,
          customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
          actorUserId: input.actorUserId,
          source: "membership" as const,
          membershipSubscriptionId: subscription.id,
        },
      ];
    });
  });
};

export const createLearningEntitlement = (input: {
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  source: "purchase" | "membership" | "admin_grant";
  sourceOrderId?: string;
  membershipSubscriptionId?: string;
  grantedByUserId?: string;
  now?: string;
}): LearningEntitlement => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `lent_${randomUUID()}`,
    locationSlug: input.locationSlug,
    educationOfferSlug: input.educationOfferSlug,
    educationOfferTitle: input.educationOfferTitle,
    moduleSlugs: input.moduleSlugs,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    actorUserId: input.actorUserId,
    source: input.source,
    sourceOrderId: input.sourceOrderId,
    membershipSubscriptionId: input.membershipSubscriptionId,
    grantedByUserId: input.grantedByUserId,
    status: "active",
    grantedAt: now,
  };
};

export const createLearningEntitlementFromProvisioningEffect = (
  effect: LearningEntitlementProvisioningEffect,
  input: {
    sourceOrderId?: string;
    now?: string;
  } = {},
): LearningEntitlement =>
  createLearningEntitlement({
    ...effect,
    sourceOrderId: input.sourceOrderId,
    now: input.now,
  });

export const revokeLearningEntitlement = (
  entitlement: LearningEntitlement,
  now = new Date().toISOString(),
): LearningEntitlement => ({
  ...entitlement,
  status: "revoked",
  revokedAt: now,
});

export const listLearningEntitlementsForActor = (
  entitlements: LearningEntitlement[],
  input: { actorUserId?: string; actorEmail?: string },
): LearningEntitlement[] =>
  entitlements.filter(
    (entitlement) =>
      entitlement.status === "active" &&
      ((input.actorUserId && entitlement.actorUserId === input.actorUserId) ||
        (input.actorEmail && entitlement.customerEmail === input.actorEmail)),
  );

export const createLearningEnrollment = (input: {
  entitlement: LearningEntitlement;
  now?: string;
}): LearningEnrollment => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `lenr_${randomUUID()}`,
    locationSlug: input.entitlement.locationSlug,
    educationOfferSlug: input.entitlement.educationOfferSlug,
    educationOfferTitle: input.entitlement.educationOfferTitle,
    moduleSlugs: input.entitlement.moduleSlugs,
    customerEmail: input.entitlement.customerEmail,
    customerName: input.entitlement.customerName,
    actorUserId: input.entitlement.actorUserId,
    entitlementId: input.entitlement.id,
    createdAt: now,
    updatedAt: now,
  };
};

export const listLearningEnrollmentsForActor = (
  enrollments: LearningEnrollment[],
  input: { actorUserId?: string; actorEmail?: string },
): LearningEnrollment[] =>
  enrollments.filter(
    (enrollment) =>
      (input.actorUserId && enrollment.actorUserId === input.actorUserId) ||
      (input.actorEmail && enrollment.customerEmail === input.actorEmail),
  );

export const listLearningCertificatesForActor = (
  certificates: LearningCertificate[],
  input: { actorUserId?: string; actorEmail?: string },
): LearningCertificate[] =>
  certificates.filter(
    (certificate) =>
      (input.actorUserId && certificate.actorUserId === input.actorUserId) ||
      (input.actorEmail && certificate.customerEmail === input.actorEmail),
  );

export const createLessonProgressRecord = (input: {
  enrollmentId: string;
  moduleSlug: string;
  status: LearningProgressStatus;
  percentComplete?: number;
  now?: string;
}): LessonProgressRecord => {
  const now = input.now ?? new Date().toISOString();
  const percentComplete =
    input.status === "completed"
      ? 100
      : input.status === "not_started"
        ? 0
        : Math.max(1, Math.min(input.percentComplete ?? 1, 99));

  return {
    id: `lprog_${randomUUID()}`,
    enrollmentId: input.enrollmentId,
    moduleSlug: input.moduleSlug,
    status: input.status,
    percentComplete,
    startedAt: input.status === "not_started" ? undefined : now,
    completedAt: input.status === "completed" ? now : undefined,
    updatedAt: now,
  };
};

export const updateLessonProgressRecord = (input: {
  enrollment: LearningEnrollment;
  existingProgress: LessonProgressRecord | undefined;
  moduleSlug: string;
  status: LearningProgressStatus;
  percentComplete?: number;
  now?: string;
}): LessonProgressRecord => {
  if (!input.enrollment.moduleSlugs.includes(input.moduleSlug)) {
    throw new Error("Module is not part of this enrollment.");
  }

  if (!input.existingProgress) {
    return createLessonProgressRecord({
      enrollmentId: input.enrollment.id,
      moduleSlug: input.moduleSlug,
      status: input.status,
      percentComplete: input.percentComplete,
      now: input.now,
    });
  }

  const now = input.now ?? new Date().toISOString();
  const percentComplete =
    input.status === "completed"
      ? 100
      : input.status === "not_started"
        ? 0
        : Math.max(
            input.existingProgress.percentComplete,
            Math.min(input.percentComplete ?? input.existingProgress.percentComplete, 99),
          );

  return {
    ...input.existingProgress,
    status: input.status,
    percentComplete,
    startedAt:
      input.status === "not_started"
        ? input.existingProgress.startedAt
        : input.existingProgress.startedAt ?? now,
    completedAt:
      input.status === "completed" ? input.existingProgress.completedAt ?? now : undefined,
    updatedAt: now,
  };
};

export const buildLearningEnrollmentView = (input: {
  enrollment: LearningEnrollment;
  lessonProgress: LessonProgressRecord[];
  certificate?: LearningCertificate;
}): LearningEnrollmentView => {
  const progressByModule = new Map(
    input.lessonProgress
      .filter((entry) => entry.enrollmentId === input.enrollment.id)
      .map((entry) => [entry.moduleSlug, entry] as const),
  );
  const lessonProgress = input.enrollment.moduleSlugs.map(
    (moduleSlug) =>
      progressByModule.get(moduleSlug) ??
      createLessonProgressRecord({
        enrollmentId: input.enrollment.id,
        moduleSlug,
        status: "not_started",
        now: input.enrollment.createdAt,
      }),
  );
  const completedModules = lessonProgress.filter(
    (entry) => entry.status === "completed",
  ).length;
  const totalModules = input.enrollment.moduleSlugs.length;

  return {
    enrollment: input.enrollment,
    lessonProgress,
    summary: {
      totalModules,
      completedModules,
      percentComplete:
        totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100),
    },
    certificate: input.certificate ?? null,
  };
};

export const finalizeEnrollmentCompletion = (input: {
  enrollment: LearningEnrollment;
  lessonProgress: LessonProgressRecord[];
  now?: string;
}): LearningEnrollment => {
  const completedModules = input.enrollment.moduleSlugs.filter((moduleSlug) =>
    input.lessonProgress.some(
      (entry) =>
        entry.enrollmentId === input.enrollment.id &&
        entry.moduleSlug === moduleSlug &&
        entry.status === "completed",
    ),
  ).length;
  const now = input.now ?? new Date().toISOString();

  return {
    ...input.enrollment,
    updatedAt: now,
    completedAt:
      completedModules === input.enrollment.moduleSlugs.length ? now : input.enrollment.completedAt,
  };
};

export const createLearningCertificate = (input: {
  enrollment: LearningEnrollment;
  now?: string;
}): LearningCertificate => ({
  id: `lcert_${randomUUID()}`,
  enrollmentId: input.enrollment.id,
  locationSlug: input.enrollment.locationSlug,
  educationOfferSlug: input.enrollment.educationOfferSlug,
  educationOfferTitle: input.enrollment.educationOfferTitle,
  customerEmail: input.enrollment.customerEmail,
  customerName: input.enrollment.customerName,
  actorUserId: input.enrollment.actorUserId,
  issuedAt: input.now ?? new Date().toISOString(),
});

export const buildAdminLearningStatsView = (input: {
  locationSlug: string;
  offers: Array<Pick<EducationOffer, "slug" | "title">>;
  entitlements: LearningEntitlement[];
  enrollments: LearningEnrollmentView[];
  certificates: LearningCertificate[];
}): AdminLearningStatsView => {
  const activeEntitlements = input.entitlements.filter(
    (entitlement) =>
      entitlement.locationSlug === input.locationSlug && entitlement.status === "active",
  );
  const enrollments = input.enrollments.filter(
    (enrollment) => enrollment.enrollment.locationSlug === input.locationSlug,
  );
  const certificates = input.certificates.filter(
    (certificate) => certificate.locationSlug === input.locationSlug,
  );
  const offerTitles = new Map(input.offers.map((offer) => [offer.slug, offer.title] as const));
  const offerSlugs = new Set([
    ...input.offers.map((offer) => offer.slug),
    ...activeEntitlements.map((entitlement) => entitlement.educationOfferSlug),
    ...enrollments.map((enrollment) => enrollment.enrollment.educationOfferSlug),
    ...certificates.map((certificate) => certificate.educationOfferSlug),
  ]);

  const offers = [...offerSlugs]
    .map((offerSlug) => {
      const offerEnrollments = enrollments.filter(
        (enrollment) => enrollment.enrollment.educationOfferSlug === offerSlug,
      );
      const completedEnrollmentCount = offerEnrollments.filter(
        (enrollment) => enrollment.summary.percentComplete >= 100,
      ).length;
      const certificateCount = certificates.filter(
        (certificate) => certificate.educationOfferSlug === offerSlug,
      ).length;
      const activeEntitlementCount = activeEntitlements.filter(
        (entitlement) => entitlement.educationOfferSlug === offerSlug,
      ).length;

      return {
        offerSlug,
        offerTitle: offerTitles.get(offerSlug) ?? offerSlug,
        activeEntitlementCount,
        enrollmentCount: offerEnrollments.length,
        completedEnrollmentCount,
        certificateCount,
        averagePercentComplete:
          offerEnrollments.length === 0
            ? 0
            : Math.round(
                offerEnrollments.reduce(
                  (total, enrollment) => total + enrollment.summary.percentComplete,
                  0,
                ) / offerEnrollments.length,
              ),
      };
    })
    .sort((left, right) => {
      if (right.enrollmentCount !== left.enrollmentCount) {
        return right.enrollmentCount - left.enrollmentCount;
      }
      return left.offerTitle.localeCompare(right.offerTitle);
    });

  const completedEnrollmentCount = enrollments.filter(
    (enrollment) => enrollment.summary.percentComplete >= 100,
  ).length;

  return {
    locationSlug: input.locationSlug,
    totals: {
      activeEntitlementCount: activeEntitlements.length,
      enrollmentCount: enrollments.length,
      completedEnrollmentCount,
      inProgressEnrollmentCount: enrollments.length - completedEnrollmentCount,
      certificateCount: certificates.length,
      completionRate:
        enrollments.length === 0
          ? 0
          : Math.round((completedEnrollmentCount / enrollments.length) * 100),
    },
    offers,
  };
};
