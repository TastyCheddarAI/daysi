import { randomUUID } from "node:crypto";

export type SkinAssessmentSeverityInput = "low" | "moderate" | "high" | number;
export type SkinAssessmentSignalValue = string | number | boolean;
export type SkinAssessmentImageKind = "analysis" | "before" | "after" | "other";

export interface SkinAssessmentConcernInput {
  key: string;
  label: string;
  severity?: SkinAssessmentSeverityInput;
}

export interface SkinAssessmentImage {
  kind: SkinAssessmentImageKind;
  assetUrl: string;
  checksum?: string;
  capturedAt?: string;
}

export interface SkinAnalyzerWebhookPayload {
  eventId: string;
  eventType: "assessment.completed";
  sourceApp: string;
  sourceVersion?: string;
  occurredAt?: string;
  locationSlug: string;
  customer: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  };
  assessment: {
    id: string;
    completedAt?: string;
    analyzerVersion?: string;
    summary?: string;
    skinType?: string;
    fitzpatrickType?: string;
    confidenceScore?: number;
    concerns: SkinAssessmentConcernInput[];
    treatmentGoals: string[];
    contraindications: string[];
    recommendedServiceSlugs: string[];
    images: SkinAssessmentImage[];
    signals: Record<string, SkinAssessmentSignalValue>;
  };
}

export interface SkinAssessmentIntakeRecord {
  id: string;
  sourceApp: string;
  eventId: string;
  eventType: "assessment.completed";
  sourceVersion?: string;
  locationSlug: string;
  externalAssessmentId: string;
  customerEmail: string;
  customerName?: string;
  customerExternalId?: string;
  signatureVerified: boolean;
  receivedAt: string;
  signatureHeader?: string;
  payload: unknown;
}

export interface SkinAssessmentConcern {
  key: string;
  label: string;
  severityScore: number;
}

export interface SkinAssessmentRecord {
  id: string;
  rawIntakeId: string;
  sourceApp: string;
  eventId: string;
  locationSlug: string;
  externalAssessmentId: string;
  customerEmail: string;
  customerName?: string;
  customerExternalId?: string;
  analyzerVersion?: string;
  capturedAt: string;
  receivedAt: string;
  summary: string;
  skinType?: string;
  fitzpatrickType?: string;
  confidenceScore?: number;
  concerns: SkinAssessmentConcern[];
  dominantConcernKeys: string[];
  treatmentGoals: string[];
  contraindications: string[];
  recommendedServiceSlugs: string[];
  unresolvedRecommendedServiceSlugs: string[];
  images: SkinAssessmentImage[];
  imageCount: number;
  signals: Record<string, SkinAssessmentSignalValue>;
}

const normalizeText = (value: string): string => value.trim();
const normalizeSlugLike = (value: string): string => value.trim().toLowerCase();
const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const unique = (values: string[]): string[] => [...new Set(values)];

const resolveCustomerName = (customer: SkinAnalyzerWebhookPayload["customer"]): string | undefined => {
  const explicit = customer.name?.trim();
  if (explicit) {
    return explicit;
  }

  const combined = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return combined || undefined;
};

export const mapSkinAssessmentSeverityToScore = (
  severity?: SkinAssessmentSeverityInput,
): number => {
  if (typeof severity === "number") {
    return Math.max(0, Math.min(100, Math.round(severity)));
  }

  switch (severity) {
    case "low":
      return 30;
    case "moderate":
      return 60;
    case "high":
      return 90;
    default:
      return 50;
  }
};

const buildFallbackSummary = (input: {
  concerns: SkinAssessmentConcern[];
  treatmentGoals: string[];
  recommendedServiceSlugs: string[];
  unresolvedRecommendedServiceSlugs: string[];
}): string => {
  const concernSummary =
    input.concerns.length > 0
      ? input.concerns
          .slice(0, 2)
          .map((concern) => concern.label)
          .join(", ")
      : "general skin goals";
  const goalSummary =
    input.treatmentGoals.length > 0
      ? `Goals: ${input.treatmentGoals.slice(0, 2).join(", ")}.`
      : "";
  const recommendationSummary =
    input.recommendedServiceSlugs.length > 0
      ? `Mapped services: ${input.recommendedServiceSlugs.join(", ")}.`
      : input.unresolvedRecommendedServiceSlugs.length > 0
        ? `External services pending mapping: ${input.unresolvedRecommendedServiceSlugs.join(", ")}.`
        : "";

  return [`Assessment flagged ${concernSummary}.`, goalSummary, recommendationSummary]
    .filter(Boolean)
    .join(" ")
    .trim();
};

export const createSkinAssessmentIntakeRecord = (input: {
  payload: SkinAnalyzerWebhookPayload;
  rawPayload: unknown;
  signatureVerified: boolean;
  signatureHeader?: string;
  receivedAt?: string;
}): SkinAssessmentIntakeRecord => ({
  id: `sai_${randomUUID()}`,
  sourceApp: normalizeText(input.payload.sourceApp),
  eventId: normalizeText(input.payload.eventId),
  eventType: input.payload.eventType,
  sourceVersion: input.payload.sourceVersion?.trim() || undefined,
  locationSlug: input.payload.locationSlug,
  externalAssessmentId: normalizeText(input.payload.assessment.id),
  customerEmail: normalizeEmail(input.payload.customer.email),
  customerName: resolveCustomerName(input.payload.customer),
  customerExternalId: input.payload.customer.externalId?.trim() || undefined,
  signatureVerified: input.signatureVerified,
  receivedAt: input.receivedAt ?? new Date().toISOString(),
  signatureHeader: input.signatureHeader,
  payload: input.rawPayload,
});

export const createSkinAssessmentRecord = (input: {
  intake: SkinAssessmentIntakeRecord;
  payload: SkinAnalyzerWebhookPayload;
  knownServiceSlugs: string[];
}): SkinAssessmentRecord => {
  const knownServiceSlugs = new Set(input.knownServiceSlugs.map(normalizeSlugLike));
  const concerns = input.payload.assessment.concerns.map((concern) => ({
    key: normalizeSlugLike(concern.key),
    label: normalizeText(concern.label),
    severityScore: mapSkinAssessmentSeverityToScore(concern.severity),
  }));
  const dominantConcernKeys = concerns
    .slice()
    .sort((left, right) => right.severityScore - left.severityScore)
    .slice(0, 3)
    .map((concern) => concern.key);
  const mappedRecommendations: string[] = [];
  const unresolvedRecommendations: string[] = [];

  for (const serviceSlug of input.payload.assessment.recommendedServiceSlugs) {
    const normalized = normalizeSlugLike(serviceSlug);
    if (!normalized) {
      continue;
    }

    if (knownServiceSlugs.has(normalized)) {
      mappedRecommendations.push(normalized);
      continue;
    }

    unresolvedRecommendations.push(normalized);
  }

  const treatmentGoals = unique(
    input.payload.assessment.treatmentGoals.map(normalizeText).filter(Boolean),
  );
  const contraindications = unique(
    input.payload.assessment.contraindications.map(normalizeText).filter(Boolean),
  );
  const recommendedServiceSlugs = unique(mappedRecommendations);
  const unresolvedRecommendedServiceSlugs = unique(unresolvedRecommendations);
  const summary =
    input.payload.assessment.summary?.trim() ||
    buildFallbackSummary({
      concerns,
      treatmentGoals,
      recommendedServiceSlugs,
      unresolvedRecommendedServiceSlugs,
    });

  return {
    id: `srec_${randomUUID()}`,
    rawIntakeId: input.intake.id,
    sourceApp: input.intake.sourceApp,
    eventId: input.intake.eventId,
    locationSlug: input.intake.locationSlug,
    externalAssessmentId: input.intake.externalAssessmentId,
    customerEmail: input.intake.customerEmail,
    customerName: input.intake.customerName,
    customerExternalId: input.intake.customerExternalId,
    analyzerVersion: input.payload.assessment.analyzerVersion?.trim() || undefined,
    capturedAt:
      input.payload.assessment.completedAt ??
      input.payload.occurredAt ??
      input.intake.receivedAt,
    receivedAt: input.intake.receivedAt,
    summary,
    skinType: input.payload.assessment.skinType?.trim() || undefined,
    fitzpatrickType: input.payload.assessment.fitzpatrickType?.trim() || undefined,
    confidenceScore: input.payload.assessment.confidenceScore,
    concerns,
    dominantConcernKeys,
    treatmentGoals,
    contraindications,
    recommendedServiceSlugs,
    unresolvedRecommendedServiceSlugs,
    images: input.payload.assessment.images.map((image) => ({
      kind: image.kind,
      assetUrl: image.assetUrl,
      checksum: image.checksum?.trim() || undefined,
      capturedAt: image.capturedAt,
    })),
    imageCount: input.payload.assessment.images.length,
    signals: input.payload.assessment.signals,
  };
};

export const filterSkinAssessmentRecords = (input: {
  assessments: SkinAssessmentRecord[];
  locationSlug: string;
  customerEmail?: string;
}): SkinAssessmentRecord[] => {
  const customerEmail = input.customerEmail ? normalizeEmail(input.customerEmail) : undefined;

  return input.assessments
    .filter(
      (assessment) =>
        assessment.locationSlug === input.locationSlug &&
        (!customerEmail || assessment.customerEmail === customerEmail),
    )
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
};
