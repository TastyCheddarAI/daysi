import { describe, expect, it } from "vitest";

import type { EducationOffer } from "./catalog";
import type { MembershipPlan, MembershipSubscription } from "./memberships";
import {
  buildEducationPurchaseProvisioningEffects,
  buildLearningEnrollmentView,
  buildMembershipLearningProvisioningEffects,
  createLearningCertificate,
  createLearningEnrollment,
  createLearningEntitlementFromProvisioningEffect,
  finalizeEnrollmentCompletion,
  updateLessonProgressRecord,
} from "./learning";

const offer: EducationOffer = {
  id: "edu_signature_method",
  slug: "signature-laser-method",
  locationSlug: "daysi-flagship",
  title: "Daysi Signature Laser Method",
  shortDescription: "Professional training offer",
  status: "published",
  moduleSlugs: ["laser-foundations", "consulting-script"],
  membershipEligible: true,
  staffGrantEnabled: true,
  requiresEntitlement: true,
  price: {
    currency: "CAD",
    amountCents: 49900,
    isFree: false,
  },
};

const plan: MembershipPlan = {
  id: "mplan_education",
  slug: "education-membership",
  locationSlug: "daysi-flagship",
  name: "Education Membership",
  description: "Education access membership",
  billingInterval: "month",
  price: {
    currency: "CAD",
    amountCents: 19900,
  },
  educationOnly: true,
  entitlements: {
    includedServiceSlugs: [],
    educationOfferSlugs: ["signature-laser-method"],
    monthlyServiceCredits: [],
    memberDiscountPercent: 0,
  },
};

const subscription: MembershipSubscription = {
  id: "msub_1",
  planSlug: "education-membership",
  locationSlug: "daysi-flagship",
  status: "active",
  actorUserId: "usr_education_1",
  customerEmail: "student@example.com",
  customerName: "Student Example",
  sourceOrderId: "ord_1",
  createdAt: "2026-03-07T10:00:00.000Z",
  activatedAt: "2026-03-07T10:05:00.000Z",
};

describe("learning domain", () => {
  it("builds purchase provisioning effects for education offers", () => {
    const effects = buildEducationPurchaseProvisioningEffects({
      offers: [offer],
      customer: {
        firstName: "Student",
        lastName: "Example",
        email: "student@example.com",
      },
      actorUserId: "usr_education_1",
    });

    const entitlement = createLearningEntitlementFromProvisioningEffect(effects[0]!, {
      sourceOrderId: "ord_1",
      now: "2026-03-07T10:10:00.000Z",
    });

    expect(effects).toHaveLength(1);
    expect(entitlement.educationOfferSlug).toBe("signature-laser-method");
    expect(entitlement.source).toBe("purchase");
  });

  it("derives education entitlements from membership plans", () => {
    const effects = buildMembershipLearningProvisioningEffects({
      plans: [plan],
      subscriptions: [subscription],
      offers: [offer],
      customer: {
        firstName: "Student",
        lastName: "Example",
        email: "student@example.com",
      },
      actorUserId: "usr_education_1",
    });

    expect(effects).toHaveLength(1);
    expect(effects[0]?.membershipSubscriptionId).toBe("msub_1");
    expect(effects[0]?.source).toBe("membership");
  });

  it("tracks module progress and issues a certificate when enrollment completes", () => {
    const entitlement = createLearningEntitlementFromProvisioningEffect(
      buildEducationPurchaseProvisioningEffects({
        offers: [offer],
        customer: {
          firstName: "Student",
          lastName: "Example",
          email: "student@example.com",
        },
        actorUserId: "usr_education_1",
      })[0]!,
      {
        sourceOrderId: "ord_1",
        now: "2026-03-07T10:10:00.000Z",
      },
    );
    const enrollment = createLearningEnrollment({
      entitlement,
      now: "2026-03-07T10:11:00.000Z",
    });
    const firstModule = updateLessonProgressRecord({
      enrollment,
      existingProgress: undefined,
      moduleSlug: "laser-foundations",
      status: "completed",
      now: "2026-03-07T10:12:00.000Z",
    });
    const secondModule = updateLessonProgressRecord({
      enrollment,
      existingProgress: undefined,
      moduleSlug: "consulting-script",
      status: "completed",
      now: "2026-03-07T10:13:00.000Z",
    });
    const completedEnrollment = finalizeEnrollmentCompletion({
      enrollment,
      lessonProgress: [firstModule, secondModule],
      now: "2026-03-07T10:13:00.000Z",
    });
    const certificate = createLearningCertificate({
      enrollment: completedEnrollment,
      now: completedEnrollment.completedAt,
    });
    const view = buildLearningEnrollmentView({
      enrollment: completedEnrollment,
      lessonProgress: [firstModule, secondModule],
      certificate,
    });

    expect(completedEnrollment.completedAt).toBe("2026-03-07T10:13:00.000Z");
    expect(view.summary.percentComplete).toBe(100);
    expect(view.certificate?.educationOfferSlug).toBe("signature-laser-method");
  });
});
