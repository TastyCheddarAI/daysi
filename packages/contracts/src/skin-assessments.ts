import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

const skinAssessmentSignalValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const skinAssessmentConcernSeveritySchema = z.union([
  z.enum(["low", "moderate", "high"]),
  z.number().min(0).max(100),
]);

export const skinAssessmentConcernInputSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  severity: skinAssessmentConcernSeveritySchema.optional(),
});

export const skinAssessmentImageSchema = z.object({
  kind: z.enum(["analysis", "before", "after", "other"]),
  assetUrl: z.string().url(),
  checksum: z.string().trim().min(1).optional(),
  capturedAt: isoTimestampSchema.optional(),
});

export const skinAnalyzerWebhookRequestSchema = z.object({
  eventId: z.string().trim().min(1),
  eventType: z.literal("assessment.completed"),
  sourceApp: z.string().trim().min(1).default("skin-analyzer"),
  sourceVersion: z.string().trim().min(1).optional(),
  occurredAt: isoTimestampSchema.optional(),
  locationSlug: locationSlugSchema,
  customer: z.object({
    email: z.string().email(),
    name: z.string().trim().min(1).optional(),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    externalId: z.string().trim().min(1).optional(),
  }),
  assessment: z.object({
    id: z.string().trim().min(1),
    completedAt: isoTimestampSchema.optional(),
    analyzerVersion: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).optional(),
    skinType: z.string().trim().min(1).optional(),
    fitzpatrickType: z.string().trim().min(1).optional(),
    confidenceScore: z.number().min(0).max(100).optional(),
    concerns: z.array(skinAssessmentConcernInputSchema).default([]),
    treatmentGoals: z.array(z.string().trim().min(1)).default([]),
    contraindications: z.array(z.string().trim().min(1)).default([]),
    recommendedServiceSlugs: z.array(z.string().trim().min(1)).default([]),
    images: z.array(skinAssessmentImageSchema).default([]),
    signals: z.record(z.string(), skinAssessmentSignalValueSchema).default({}),
  }),
});

export const skinAssessmentConcernSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  severityScore: z.number().int().min(0).max(100),
});

export const skinAssessmentIntakeRecordSchema = z.object({
  id: z.string().min(1),
  sourceApp: z.string().min(1),
  eventId: z.string().min(1),
  eventType: z.literal("assessment.completed"),
  sourceVersion: z.string().min(1).optional(),
  locationSlug: locationSlugSchema,
  externalAssessmentId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  customerExternalId: z.string().min(1).optional(),
  signatureVerified: z.boolean(),
  receivedAt: isoTimestampSchema,
  signatureHeader: z.string().min(1).optional(),
  payload: z.unknown(),
});

export const skinAssessmentRecordSchema = z.object({
  id: z.string().min(1),
  rawIntakeId: z.string().min(1),
  sourceApp: z.string().min(1),
  eventId: z.string().min(1),
  locationSlug: locationSlugSchema,
  externalAssessmentId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  customerExternalId: z.string().min(1).optional(),
  analyzerVersion: z.string().min(1).optional(),
  capturedAt: isoTimestampSchema,
  receivedAt: isoTimestampSchema,
  summary: z.string().min(1),
  skinType: z.string().min(1).optional(),
  fitzpatrickType: z.string().min(1).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  concerns: z.array(skinAssessmentConcernSchema),
  dominantConcernKeys: z.array(z.string().min(1)),
  treatmentGoals: z.array(z.string().min(1)),
  contraindications: z.array(z.string().min(1)),
  recommendedServiceSlugs: z.array(z.string().min(1)),
  unresolvedRecommendedServiceSlugs: z.array(z.string().min(1)),
  images: z.array(skinAssessmentImageSchema),
  imageCount: z.number().int().nonnegative(),
  signals: z.record(z.string(), skinAssessmentSignalValueSchema),
});

export const skinAnalyzerWebhookResponseSchema = successEnvelope(
  z.object({
    received: z.boolean(),
    duplicate: z.boolean(),
    intakeId: z.string().min(1),
    assessmentId: z.string().min(1),
  }),
);

export const skinAssessmentsResponseSchema = successEnvelope(
  z.object({
    assessments: z.array(skinAssessmentRecordSchema),
  }),
);

export const skinAssessmentDetailResponseSchema = successEnvelope(
  z.object({
    assessment: skinAssessmentRecordSchema,
    intake: skinAssessmentIntakeRecordSchema,
  }),
);
