import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const importSourceSystemSchema = z.enum([
  "csv",
  "manual",
  "supabase",
  "square",
  "zenoti",
  "boulevard",
  "pabau",
  "vagaro",
  "other",
]);

export const importEntityTypeSchema = z.enum([
  "customers",
  "services",
  "memberships",
  "bookings",
  "balances",
  "providers",
  "products",
  "machines",
]);

export const importJobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export const importRowStatusSchema = z.enum(["queued", "processed", "failed", "skipped"]);
export const importMappingProfileStatusSchema = z.enum(["draft", "active", "archived"]);
export const reconciliationIssueSeveritySchema = z.enum(["warning", "error"]);
export const reconciliationIssueStatusSchema = z.enum(["open", "resolved", "ignored"]);

export const importJobRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  externalId: z.string().min(1).optional(),
  rawPayload: z.record(z.string(), z.unknown()),
  normalizedPayload: z.record(z.string(), z.unknown()).optional(),
  status: importRowStatusSchema,
  errorMessage: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const importJobCountsSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  processedRows: z.number().int().nonnegative(),
  failedRows: z.number().int().nonnegative(),
  skippedRows: z.number().int().nonnegative(),
  queuedRows: z.number().int().nonnegative(),
});

export const importJobSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  sourceSystem: importSourceSystemSchema,
  entityType: importEntityTypeSchema,
  status: importJobStatusSchema,
  fileName: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()),
  counts: importJobCountsSchema,
  rows: z.array(importJobRowSchema),
  initiatedByUserId: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema.optional(),
  errorMessage: z.string().min(1).optional(),
});

export const importMappingFieldRuleSchema = z.object({
  sourceField: z.string().min(1),
  targetField: z.string().min(1),
  transform: z.string().min(1).optional(),
});

export const importMappingProfileSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  sourceSystem: importSourceSystemSchema,
  entityType: importEntityTypeSchema,
  name: z.string().min(1),
  status: importMappingProfileStatusSchema,
  fieldMappings: z.array(importMappingFieldRuleSchema).min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  updatedByUserId: z.string().min(1).optional(),
});

export const reconciliationIssueSchema = z.object({
  id: z.string().min(1),
  importJobId: z.string().min(1),
  locationSlug: locationSlugSchema,
  rowNumber: z.number().int().positive(),
  externalId: z.string().min(1).optional(),
  issueCode: z.string().min(1),
  severity: reconciliationIssueSeveritySchema,
  status: reconciliationIssueStatusSchema,
  summary: z.string().min(1),
  detail: z.string().min(1).optional(),
  rawPayload: z.record(z.string(), z.unknown()),
  normalizedPayload: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  resolvedAt: isoTimestampSchema.optional(),
});

export const importJobListResponseSchema = successEnvelope(
  z.object({
    importJobs: z.array(importJobSchema),
  }),
);

export const importJobResponseSchema = successEnvelope(
  z.object({
    importJob: importJobSchema,
  }),
);

export const importMappingProfileListResponseSchema = successEnvelope(
  z.object({
    mappingProfiles: z.array(importMappingProfileSchema),
  }),
);

export const importMappingProfileResponseSchema = successEnvelope(
  z.object({
    mappingProfile: importMappingProfileSchema,
  }),
);

export const importJobReconciliationResponseSchema = successEnvelope(
  z.object({
    importJob: importJobSchema,
    issues: z.array(reconciliationIssueSchema),
  }),
);

export const importJobRowCreateInputSchema = z.object({
  rowNumber: z.number().int().positive(),
  externalId: z.string().trim().min(1).optional(),
  rawPayload: z.record(z.string(), z.unknown()),
});

export const importJobCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  sourceSystem: importSourceSystemSchema,
  entityType: importEntityTypeSchema,
  fileName: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  rows: z.array(importJobRowCreateInputSchema).optional(),
});

export const importJobRowUpdateSchema = z.object({
  rowNumber: z.number().int().positive(),
  status: importRowStatusSchema,
  normalizedPayload: z.record(z.string(), z.unknown()).optional(),
  errorMessage: z.string().trim().min(1).optional(),
});

export const importJobUpdateRequestSchema = z
  .object({
    status: importJobStatusSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    rowUpdates: z.array(importJobRowUpdateSchema).optional(),
    errorMessage: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one import job field must be provided.",
  });

export const importJobRetryRequestSchema = z.object({
  rowNumbers: z.array(z.number().int().positive()).optional(),
});

export const importMappingProfileCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  sourceSystem: importSourceSystemSchema,
  entityType: importEntityTypeSchema,
  name: z.string().trim().min(1),
  status: importMappingProfileStatusSchema.optional(),
  fieldMappings: z.array(importMappingFieldRuleSchema).min(1),
});

export const importMappingProfileUpdateRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    status: importMappingProfileStatusSchema.optional(),
    fieldMappings: z.array(importMappingFieldRuleSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one mapping profile field must be provided.",
  });

export const reconciliationIssueUpdateRequestSchema = z.object({
  status: reconciliationIssueStatusSchema,
});
