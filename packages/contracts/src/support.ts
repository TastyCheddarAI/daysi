import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const supportCaseStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
]);

export const supportCasePrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const supportCaseEventTypeSchema = z.enum([
  "note",
  "internal_note",
  "status_changed",
  "assignment_changed",
]);
export const supportCaseEventVisibilitySchema = z.enum(["internal", "tenant"]);

export const supportCaseSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  subject: z.string().min(1),
  category: z.string().min(1),
  priority: supportCasePrioritySchema,
  status: supportCaseStatusSchema,
  openedByUserId: z.string().min(1).optional(),
  openedByEmail: z.string().email().optional(),
  assignedToUserId: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  resolvedAt: isoTimestampSchema.optional(),
});

export const supportCaseEventSchema = z.object({
  id: z.string().min(1),
  supportCaseId: z.string().min(1),
  locationSlug: locationSlugSchema,
  type: supportCaseEventTypeSchema,
  visibility: supportCaseEventVisibilitySchema,
  body: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  createdByUserId: z.string().min(1).optional(),
  createdByDisplayName: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
});

export const supportCaseListResponseSchema = successEnvelope(
  z.object({
    supportCases: z.array(supportCaseSchema),
  }),
);

export const supportCaseResponseSchema = successEnvelope(
  z.object({
    supportCase: supportCaseSchema,
    events: z.array(supportCaseEventSchema),
  }),
);

export const supportCaseCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  subject: z.string().trim().min(1),
  category: z.string().trim().min(1),
  priority: supportCasePrioritySchema.optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  initialMessage: z.string().trim().min(1).optional(),
  initialVisibility: supportCaseEventVisibilitySchema.optional(),
});

export const supportCaseUpdateRequestSchema = z
  .object({
    status: supportCaseStatusSchema.optional(),
    priority: supportCasePrioritySchema.optional(),
    assignedToUserId: z.string().trim().min(1).nullable().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    note: z
      .object({
        body: z.string().trim().min(1),
        visibility: supportCaseEventVisibilitySchema,
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one support case field must be provided.",
  });

export const supportCaseEventCreateRequestSchema = z.object({
  body: z.string().trim().min(1),
  visibility: supportCaseEventVisibilitySchema,
});
