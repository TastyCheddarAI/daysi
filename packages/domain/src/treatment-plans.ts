import { randomUUID } from "node:crypto";

import type { BookingAssistantAssessmentFollowUpResponse } from "./ai";
import type { SkinAssessmentRecord } from "./skin-assessments";

export type TreatmentPlanStatus = "draft" | "shared" | "accepted" | "archived";

export interface TreatmentPlanLine {
  serviceSlug: string;
  serviceName: string;
  rationale: string;
  retailAmountCents: number;
  memberAmountCents: number;
  durationMinutes: number;
  priority: number;
}

export interface TreatmentPlanRecord {
  id: string;
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  sourceAssessmentId: string;
  sourceAiRunId: string;
  status: TreatmentPlanStatus;
  summary: string;
  dominantConcernKeys: string[];
  recommendedServiceSlugs: string[];
  unresolvedRecommendedServiceSlugs: string[];
  lines: TreatmentPlanLine[];
  membershipSuggestion?: {
    planSlug: string;
    reason: string;
  };
  nextActions: string[];
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  sharedAt?: string;
  acceptedAt?: string;
  archivedAt?: string;
  archivedReason?: string;
}

export const createTreatmentPlan = (input: {
  assessment: SkinAssessmentRecord;
  followUp: BookingAssistantAssessmentFollowUpResponse;
  createdByUserId?: string;
  internalNotes?: string;
  now?: string;
}): TreatmentPlanRecord => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `tplan_${randomUUID()}`,
    locationSlug: input.assessment.locationSlug,
    customerEmail: input.assessment.customerEmail,
    customerName: input.assessment.customerName,
    sourceAssessmentId: input.assessment.id,
    sourceAiRunId: input.followUp.run.id,
    status: "draft",
    summary: input.followUp.assessment.summary,
    dominantConcernKeys: input.followUp.assessment.dominantConcernKeys,
    recommendedServiceSlugs: input.followUp.assessment.recommendedServiceSlugs,
    unresolvedRecommendedServiceSlugs:
      input.followUp.assessment.unresolvedRecommendedServiceSlugs,
    lines: input.followUp.recommendations.map((recommendation, index) => ({
      serviceSlug: recommendation.serviceSlug,
      serviceName: recommendation.serviceName,
      rationale: recommendation.reason,
      retailAmountCents: recommendation.retailAmountCents,
      memberAmountCents: recommendation.memberAmountCents,
      durationMinutes: recommendation.durationMinutes,
      priority: index + 1,
    })),
    membershipSuggestion: input.followUp.membershipSuggestion,
    nextActions: input.followUp.followUpPlan.nextActions,
    internalNotes: input.internalNotes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.createdByUserId,
  };
};

export const shareTreatmentPlan = (input: {
  treatmentPlan: TreatmentPlanRecord;
  internalNotes?: string;
  now?: string;
}): TreatmentPlanRecord => {
  const now = input.now ?? new Date().toISOString();

  return {
    ...input.treatmentPlan,
    status: "shared",
    internalNotes: input.internalNotes?.trim() || input.treatmentPlan.internalNotes,
    updatedAt: now,
    sharedAt: input.treatmentPlan.sharedAt ?? now,
    archivedAt: undefined,
    archivedReason: undefined,
  };
};

export const restoreTreatmentPlanToDraft = (input: {
  treatmentPlan: TreatmentPlanRecord;
  internalNotes?: string;
  now?: string;
}): TreatmentPlanRecord => ({
  ...input.treatmentPlan,
  status: "draft",
  internalNotes: input.internalNotes?.trim() || input.treatmentPlan.internalNotes,
  updatedAt: input.now ?? new Date().toISOString(),
  archivedAt: undefined,
  archivedReason: undefined,
});

export const archiveTreatmentPlan = (input: {
  treatmentPlan: TreatmentPlanRecord;
  archivedReason?: string;
  internalNotes?: string;
  now?: string;
}): TreatmentPlanRecord => {
  const now = input.now ?? new Date().toISOString();

  return {
    ...input.treatmentPlan,
    status: "archived",
    internalNotes: input.internalNotes?.trim() || input.treatmentPlan.internalNotes,
    updatedAt: now,
    archivedAt: now,
    archivedReason: input.archivedReason?.trim() || input.treatmentPlan.archivedReason,
  };
};

export const acceptTreatmentPlan = (input: {
  treatmentPlan: TreatmentPlanRecord;
  now?: string;
}): TreatmentPlanRecord => {
  if (!["shared", "accepted"].includes(input.treatmentPlan.status)) {
    throw new Error("Only shared treatment plans can be accepted.");
  }

  const now = input.now ?? new Date().toISOString();

  return {
    ...input.treatmentPlan,
    status: "accepted",
    updatedAt: now,
    acceptedAt: input.treatmentPlan.acceptedAt ?? now,
    sharedAt: input.treatmentPlan.sharedAt ?? now,
  };
};

export const listTreatmentPlansForCustomer = (input: {
  treatmentPlans: TreatmentPlanRecord[];
  customerEmail: string;
}): TreatmentPlanRecord[] => {
  const customerEmail = input.customerEmail.trim().toLowerCase();

  return input.treatmentPlans
    .filter(
      (treatmentPlan) =>
        treatmentPlan.customerEmail === customerEmail &&
        ["shared", "accepted"].includes(treatmentPlan.status),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const treatmentPlanIncludesService = (
  treatmentPlan: TreatmentPlanRecord,
  serviceSlug: string,
): boolean => treatmentPlan.lines.some((line) => line.serviceSlug === serviceSlug);
