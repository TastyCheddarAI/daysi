import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const treatmentPlanStatusSchema = z.enum([
  "draft",
  "shared",
  "accepted",
  "archived",
]);

export const treatmentPlanLineSchema = z.object({
  serviceSlug: z.string().min(1),
  serviceName: z.string().min(1),
  rationale: z.string().min(1),
  retailAmountCents: z.number().int().nonnegative(),
  memberAmountCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  priority: z.number().int().positive(),
});

export const treatmentPlanSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  sourceAssessmentId: z.string().min(1),
  sourceAiRunId: z.string().min(1),
  status: treatmentPlanStatusSchema,
  summary: z.string().min(1),
  dominantConcernKeys: z.array(z.string().min(1)),
  recommendedServiceSlugs: z.array(z.string().min(1)),
  unresolvedRecommendedServiceSlugs: z.array(z.string().min(1)),
  lines: z.array(treatmentPlanLineSchema),
  membershipSuggestion: z
    .object({
      planSlug: z.string().min(1),
      reason: z.string().min(1),
    })
    .optional(),
  nextActions: z.array(z.string().min(1)),
  internalNotes: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  createdByUserId: z.string().min(1).optional(),
  sharedAt: isoTimestampSchema.optional(),
  acceptedAt: isoTimestampSchema.optional(),
  archivedAt: isoTimestampSchema.optional(),
  archivedReason: z.string().min(1).optional(),
});

export const adminTreatmentPlanCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  assessmentId: z.string().trim().min(1),
  prefersMembership: z.boolean().optional(),
  internalNotes: z.string().trim().min(1).optional(),
});

export const adminTreatmentPlanUpdateRequestSchema = z.object({
  status: z.enum(["draft", "shared", "archived"]),
  internalNotes: z.string().trim().min(1).optional(),
  archivedReason: z.string().trim().min(1).optional(),
});

export const adminTreatmentPlanResponseSchema = successEnvelope(
  z.object({
    treatmentPlan: treatmentPlanSchema,
  }),
);

export const adminTreatmentPlansResponseSchema = successEnvelope(
  z.object({
    treatmentPlans: z.array(treatmentPlanSchema),
  }),
);

export const myTreatmentPlansResponseSchema = successEnvelope(
  z.object({
    treatmentPlans: z.array(treatmentPlanSchema),
  }),
);
