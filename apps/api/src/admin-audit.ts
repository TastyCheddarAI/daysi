import { createAdminActionLogEntry, type AppActor } from "../../../packages/domain/src";

import type { AppRepositories } from "./persistence/app-repositories";
import { saveAdminActionLogEntry } from "./bootstrap-store";

export const recordAdminAction = async (input: {
  actor: AppActor | null;
  locationSlug?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  repositories?: AppRepositories;
}): Promise<void> => {
  const entry = createAdminActionLogEntry({
    locationSlug: input.locationSlug,
    actorUserId: input.actor?.userId,
    actorEmail: input.actor?.email,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata,
  });

  if (input.repositories) {
    await input.repositories.operations.audit.save(entry);
    return;
  }

  saveAdminActionLogEntry(entry);
};
