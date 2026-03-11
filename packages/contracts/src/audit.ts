import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const adminActionLogEntrySchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema.optional(),
  actorUserId: z.string().min(1).optional(),
  actorEmail: z.string().email().optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1).optional(),
  summary: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  occurredAt: isoTimestampSchema,
});

export const adminActionLogListResponseSchema = successEnvelope(
  z.object({
    entries: z.array(adminActionLogEntrySchema),
  }),
);
