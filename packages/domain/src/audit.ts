import { randomUUID } from "node:crypto";

export interface AdminActionLogEntry {
  id: string;
  locationSlug?: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export const createAdminActionLogEntry = (input: {
  locationSlug?: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  now?: string;
}): AdminActionLogEntry => ({
  id: `alog_${randomUUID()}`,
  locationSlug: input.locationSlug,
  actorUserId: input.actorUserId,
  actorEmail: input.actorEmail?.toLowerCase(),
  action: input.action,
  entityType: input.entityType,
  entityId: input.entityId,
  summary: input.summary,
  metadata: input.metadata ?? {},
  occurredAt: input.now ?? new Date().toISOString(),
});
