import { describe, expect, it } from "vitest";

import type { CatalogService } from "./catalog";
import type { MembershipPlan } from "./memberships";
import type { SkinAssessmentRecord } from "./skin-assessments";
import {
  buildAssessmentFollowUpRecommendations,
  buildBookingAssistantChat,
  buildBookingAssistantRecommendations,
  resolveAiProviderRoute,
} from "./ai";

const services: CatalogService[] = [
  {
    id: "svc_laser",
    slug: "laser-hair-removal",
    variantSlug: "laser-hair-removal-full-body-60",
    categorySlug: "laser",
    locationSlug: "daysi-flagship",
    name: "Laser Hair Removal",
    shortDescription: "Laser hair removal service",
    description: "Hair removal with shared machine scheduling.",
    durationMinutes: 60,
    bookable: true,
    price: {
      currency: "CAD",
      retailAmountCents: 29900,
      memberAmountCents: 24900,
      membershipRequired: false,
    },
    bookingPolicy: {
      cancellationWindowHours: 24,
      bufferMinutes: 15,
      requiresDeposit: false,
    },
    machineCapabilities: ["laser-hair-removal"],
    featureTags: ["flagship", "device-based"],
  },
  {
    id: "svc_skin",
    slug: "skin-rejuvenation",
    variantSlug: "skin-rejuvenation-photofacial-45",
    categorySlug: "skin",
    locationSlug: "daysi-flagship",
    name: "Skin Rejuvenation",
    shortDescription: "Skin rejuvenation service",
    description: "Photofacial treatment for texture and pigment.",
    durationMinutes: 45,
    bookable: true,
    price: {
      currency: "CAD",
      retailAmountCents: 23900,
      memberAmountCents: 19900,
      membershipRequired: false,
    },
    bookingPolicy: {
      cancellationWindowHours: 24,
      bufferMinutes: 10,
      requiresDeposit: false,
    },
    machineCapabilities: ["skin-rejuvenation"],
    featureTags: ["photofacial"],
  },
];

const memberships: MembershipPlan[] = [
  {
    id: "mplan_glow",
    slug: "glow-membership",
    locationSlug: "daysi-flagship",
    name: "Glow Membership",
    description: "Member pricing plan",
    billingInterval: "month",
    price: {
      currency: "CAD",
      amountCents: 12900,
    },
    educationOnly: false,
    entitlements: {
      includedServiceSlugs: [],
      educationOfferSlugs: [],
      monthlyServiceCredits: [],
      memberDiscountPercent: 15,
    },
  },
];

const assessment: SkinAssessmentRecord = {
  id: "srec_ai_1",
  rawIntakeId: "sai_ai_1",
  sourceApp: "skin-analyzer",
  eventId: "evt_ai_1",
  locationSlug: "daysi-flagship",
  externalAssessmentId: "assessment_ai_1",
  customerEmail: "ai@example.com",
  customerName: "AI Customer",
  capturedAt: "2026-03-08T12:05:00.000Z",
  receivedAt: "2026-03-08T12:05:05.000Z",
  summary: "Photofacial fit with pigmentation and texture concerns.",
  confidenceScore: 91,
  concerns: [
    {
      key: "pigmentation",
      label: "Pigmentation",
      severityScore: 92,
    },
  ],
  dominantConcernKeys: ["pigmentation"],
  treatmentGoals: ["tone correction"],
  contraindications: ["recent peel"],
  recommendedServiceSlugs: ["skin-rejuvenation"],
  unresolvedRecommendedServiceSlugs: ["external-service"],
  images: [],
  imageCount: 0,
  signals: {},
};

describe("ai gateway domain", () => {
  it("routes long booking chat prompts to the long-context provider", () => {
    const route = resolveAiProviderRoute({
      task: "assistant.booking_chat",
      prompt: "hair ".repeat(250),
    });

    expect(route.provider).toBe("kimi");
    expect(route.model).toBe("kimi-k2.5-long");
  });

  it("grounds booking chat responses in matching services and memberships", () => {
    const response = buildBookingAssistantChat({
      locationSlug: "daysi-flagship",
      messages: [
        {
          role: "user",
          content: "I want smoother skin and less shaving. Is there a membership option?",
        },
      ],
      services,
      membershipPlans: memberships,
      now: "2026-03-08T12:00:00.000Z",
    });

    expect(response.answer.suggestedServiceSlugs[0]).toBe("laser-hair-removal");
    expect(response.answer.suggestedMembershipPlanSlugs[0]).toBe("glow-membership");
    expect(response.run.sourceProvenance.some((source) => source.kind === "internal_catalog")).toBe(true);
  });

  it("builds booking recommendations within budget and returns a booking action", () => {
    const response = buildBookingAssistantRecommendations({
      locationSlug: "daysi-flagship",
      concern: "I want better skin tone and photofacial results",
      budgetAmountCents: 25000,
      prefersMembership: true,
      services,
      membershipPlans: memberships,
      now: "2026-03-08T12:00:00.000Z",
    });

    expect(response.run.provider).toBe("openai");
    expect(response.recommendations[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(response.membershipSuggestion?.planSlug).toBe("glow-membership");
    expect(response.bookingSuggestion.recommendedAction).toContain("Search availability");
  });

  it("builds assessment follow-up recommendations grounded in captured assessments", () => {
    const response = buildAssessmentFollowUpRecommendations({
      locationSlug: "daysi-flagship",
      assessment,
      prefersMembership: true,
      services,
      membershipPlans: memberships,
      now: "2026-03-08T12:10:00.000Z",
    });

    expect(response.run.task).toBe("assistant.assessment_follow_up");
    expect(
      response.run.sourceProvenance.some(
        (source) => source.kind === "internal_skin_assessment",
      ),
    ).toBe(true);
    expect(response.recommendations[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(response.membershipSuggestion?.planSlug).toBe("glow-membership");
    expect(response.followUpPlan.nextActions[0]).toContain("contraindications");
  });
});
