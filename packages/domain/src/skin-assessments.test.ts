import { describe, expect, it } from "vitest";

import {
  createSkinAssessmentIntakeRecord,
  createSkinAssessmentRecord,
  filterSkinAssessmentRecords,
  mapSkinAssessmentSeverityToScore,
  type SkinAnalyzerWebhookPayload,
} from "./skin-assessments";

const payload: SkinAnalyzerWebhookPayload = {
  eventId: "evt_skin_1",
  eventType: "assessment.completed",
  sourceApp: "skin-analyzer",
  sourceVersion: "1.2.0",
  occurredAt: "2026-03-08T12:00:00.000Z",
  locationSlug: "daysi-flagship",
  customer: {
    email: "Skin.Customer@example.com",
    firstName: "Skin",
    lastName: "Customer",
    externalId: "sa_customer_1",
  },
  assessment: {
    id: "assessment_1",
    completedAt: "2026-03-08T11:58:00.000Z",
    analyzerVersion: "2.0.1",
    skinType: "Combination",
    fitzpatrickType: "III",
    concerns: [
      {
        key: "pigmentation",
        label: "Pigmentation",
        severity: "high",
      },
      {
        key: "texture",
        label: "Texture",
        severity: 47,
      },
    ],
    treatmentGoals: ["even tone", "brightening"],
    contraindications: ["recent peel"],
    recommendedServiceSlugs: ["skin-rejuvenation", "unknown-service"],
    images: [
      {
        kind: "analysis",
        assetUrl: "https://assets.daysi.ca/analysis/assessment-1.png",
      },
    ],
    signals: {
      hydrationScore: 72,
      sensitivityFlag: true,
    },
  },
};

describe("skin assessment domain", () => {
  it("normalizes signed intake payloads into internal assessment records", () => {
    const intake = createSkinAssessmentIntakeRecord({
      payload,
      rawPayload: payload,
      signatureVerified: true,
      signatureHeader: "t=1741435200,v1=test",
      receivedAt: "2026-03-08T12:00:10.000Z",
    });
    const assessment = createSkinAssessmentRecord({
      intake,
      payload,
      knownServiceSlugs: ["laser-hair-removal", "skin-rejuvenation"],
    });

    expect(intake.customerEmail).toBe("skin.customer@example.com");
    expect(assessment.customerName).toBe("Skin Customer");
    expect(assessment.recommendedServiceSlugs).toEqual(["skin-rejuvenation"]);
    expect(assessment.unresolvedRecommendedServiceSlugs).toEqual(["unknown-service"]);
    expect(assessment.dominantConcernKeys[0]).toBe("pigmentation");
    expect(assessment.imageCount).toBe(1);
  });

  it("filters location and customer assessment views deterministically", () => {
    const intake = createSkinAssessmentIntakeRecord({
      payload,
      rawPayload: payload,
      signatureVerified: true,
      receivedAt: "2026-03-08T12:00:10.000Z",
    });
    const assessment = createSkinAssessmentRecord({
      intake,
      payload,
      knownServiceSlugs: ["skin-rejuvenation"],
    });
    const otherAssessment = {
      ...assessment,
      id: "srec_other",
      customerEmail: "other@example.com",
      capturedAt: "2026-03-08T12:05:00.000Z",
    };

    const filtered = filterSkinAssessmentRecords({
      assessments: [assessment, otherAssessment],
      locationSlug: "daysi-flagship",
      customerEmail: "skin.customer@example.com",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.customerEmail).toBe("skin.customer@example.com");
  });

  it("maps severity inputs to bounded internal scores", () => {
    expect(mapSkinAssessmentSeverityToScore("low")).toBe(30);
    expect(mapSkinAssessmentSeverityToScore("moderate")).toBe(60);
    expect(mapSkinAssessmentSeverityToScore("high")).toBe(90);
    expect(mapSkinAssessmentSeverityToScore(144)).toBe(100);
    expect(mapSkinAssessmentSeverityToScore()).toBe(50);
  });
});
