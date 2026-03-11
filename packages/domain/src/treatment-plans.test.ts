import { describe, expect, it } from "vitest";

import type { BookingAssistantAssessmentFollowUpResponse } from "./ai";
import type { SkinAssessmentRecord } from "./skin-assessments";
import {
  acceptTreatmentPlan,
  archiveTreatmentPlan,
  createTreatmentPlan,
  listTreatmentPlansForCustomer,
  shareTreatmentPlan,
} from "./treatment-plans";

const assessment: SkinAssessmentRecord = {
  id: "srec_plan_1",
  rawIntakeId: "sai_plan_1",
  sourceApp: "skin-analyzer",
  eventId: "evt_plan_1",
  locationSlug: "daysi-flagship",
  externalAssessmentId: "assessment_plan_1",
  customerEmail: "plan@example.com",
  customerName: "Plan Customer",
  capturedAt: "2026-03-08T14:00:00.000Z",
  receivedAt: "2026-03-08T14:00:05.000Z",
  summary: "Pigmentation concern with photofacial fit.",
  concerns: [
    {
      key: "pigmentation",
      label: "Pigmentation",
      severityScore: 90,
    },
  ],
  dominantConcernKeys: ["pigmentation"],
  treatmentGoals: ["tone correction"],
  contraindications: [],
  recommendedServiceSlugs: ["skin-rejuvenation"],
  unresolvedRecommendedServiceSlugs: ["external-service"],
  images: [],
  imageCount: 0,
  signals: {},
};

const followUp: BookingAssistantAssessmentFollowUpResponse = {
  run: {
    id: "airun_plan_1",
    task: "assistant.assessment_follow_up",
    locationSlug: "daysi-flagship",
    provider: "openai",
    model: "gpt-5-mini",
    promptVersion: "assessment-follow-up-v1",
    status: "completed",
    sourceProvenance: [],
    evaluation: {
      groundingScore: 90,
      recommendationCoverageScore: 80,
      safetyFlags: [],
      notes: [],
    },
    createdAt: "2026-03-08T14:01:00.000Z",
    completedAt: "2026-03-08T14:01:00.000Z",
  },
  assessment: {
    assessmentId: "srec_plan_1",
    capturedAt: "2026-03-08T14:00:00.000Z",
    summary: "Pigmentation concern with photofacial fit.",
    dominantConcernKeys: ["pigmentation"],
    recommendedServiceSlugs: ["skin-rejuvenation"],
    unresolvedRecommendedServiceSlugs: ["external-service"],
  },
  recommendations: [
    {
      serviceSlug: "skin-rejuvenation",
      serviceName: "Skin Rejuvenation",
      reason: "Directly matched from the assessment recommendation set and concern profile.",
      retailAmountCents: 23900,
      memberAmountCents: 19900,
      durationMinutes: 45,
    },
  ],
  membershipSuggestion: {
    planSlug: "glow-membership",
    reason: "This membership can reduce follow-up treatment cost or unlock member pricing.",
  },
  followUpPlan: {
    recommendedAction: "Review availability for Skin Rejuvenation.",
    nextActions: ["Confirm the client is ready for the recommended treatment path."],
  },
};

describe("treatment plan domain", () => {
  it("creates, shares, and accepts treatment plans", () => {
    const created = createTreatmentPlan({
      assessment,
      followUp,
      createdByUserId: "usr_admin",
      internalNotes: "High-value follow-up lead.",
      now: "2026-03-08T14:05:00.000Z",
    });
    const shared = shareTreatmentPlan({
      treatmentPlan: created,
      now: "2026-03-08T14:06:00.000Z",
    });
    const accepted = acceptTreatmentPlan({
      treatmentPlan: shared,
      now: "2026-03-08T14:07:00.000Z",
    });

    expect(created.sourceAssessmentId).toBe("srec_plan_1");
    expect(created.lines[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(shared.status).toBe("shared");
    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).toBe("2026-03-08T14:07:00.000Z");
  });

  it("filters customer-visible plans to shared and accepted only", () => {
    const created = createTreatmentPlan({
      assessment,
      followUp,
      now: "2026-03-08T14:05:00.000Z",
    });
    const archived = archiveTreatmentPlan({
      treatmentPlan: created,
      archivedReason: "Superseded",
      now: "2026-03-08T14:06:00.000Z",
    });
    const shared = shareTreatmentPlan({
      treatmentPlan: {
        ...created,
        id: "tplan_shared_1",
      },
      now: "2026-03-08T14:07:00.000Z",
    });

    const visible = listTreatmentPlansForCustomer({
      treatmentPlans: [created, archived, shared],
      customerEmail: "plan@example.com",
    });

    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe("tplan_shared_1");
  });
});
