import {
  createCustomerEventRecord,
  type CustomerEventRecord,
} from "../../../packages/domain/src";

import type { AppRepositories } from "./persistence/app-repositories";

export const recordCustomerEvent = async (input: {
  repositories: AppRepositories;
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  actorUserId?: string;
  source: CustomerEventRecord["source"];
  eventType: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<void> => {
  if (!input.customerEmail) {
    return;
  }

  await input.repositories.engagement.customerEvents.save(
    createCustomerEventRecord({
      locationSlug: input.locationSlug,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      actorUserId: input.actorUserId,
      source: input.source,
      eventType: input.eventType,
      payload: input.payload,
      occurredAt: input.occurredAt,
    }),
  );
};
