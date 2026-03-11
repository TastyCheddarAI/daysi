import type { OrderRecord } from "../../../packages/domain/src";
import {
  createOperationalMetricEvent,
  type BookingRecord,
  type OperationalMetricEventRecord,
} from "../../../packages/domain/src";

import type { AppRepositories } from "./persistence/app-repositories";

export const recordOperationalMetricEvent = async (input: {
  repositories: AppRepositories;
  eventType: OperationalMetricEventRecord["eventType"];
  locationSlug: string;
  serviceSlug?: string;
  machineSlug?: string;
  providerSlug?: string;
  actorUserId?: string;
  customerEmail?: string;
  referenceId?: string;
  sourceOrderId?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  await input.repositories.analytics.saveEvent(
    createOperationalMetricEvent({
      eventType: input.eventType,
      locationSlug: input.locationSlug,
      serviceSlug: input.serviceSlug,
      machineSlug: input.machineSlug,
      providerSlug: input.providerSlug,
      actorUserId: input.actorUserId,
      customerEmail: input.customerEmail,
      referenceId: input.referenceId,
      sourceOrderId: input.sourceOrderId,
      occurredAt: input.occurredAt,
      metadata: input.metadata,
    }),
  );
};

export const recordPaidBookingMetricEvents = (input: {
  repositories: AppRepositories;
  order: OrderRecord;
  bookings: BookingRecord[];
  occurredAt?: string;
}): Promise<void> => {
  const bookingById = new Map(input.bookings.map((booking) => [booking.id, booking]));

  return (async () => {
    for (const lineItem of input.order.lineItems) {
    if (lineItem.kind !== "booking" || lineItem.revenueStream !== "services") {
      continue;
    }

    const booking = bookingById.get(lineItem.referenceId);
    if (!booking) {
      continue;
    }

    if (
      await input.repositories.analytics.hasEvent({
        eventType: "booking_paid",
        sourceOrderId: input.order.id,
        referenceId: booking.id,
      })
    ) {
      continue;
    }

    await recordOperationalMetricEvent({
      repositories: input.repositories,
      eventType: "booking_paid",
      locationSlug: booking.locationSlug,
      serviceSlug: booking.serviceSlug,
      machineSlug: booking.machineSlug,
      providerSlug: booking.providerSlug,
      actorUserId: input.order.actorUserId,
      customerEmail: input.order.customer.email,
      referenceId: booking.id,
      sourceOrderId: input.order.id,
      occurredAt: input.occurredAt,
      metadata: {
        orderId: input.order.id,
        amountCents: lineItem.finalAmount.amountCents,
        roomSlug: booking.roomSlug,
        roomName: booking.roomName,
        sourceAssessmentId: booking.sourceAssessmentId,
      },
    });
    }
  })();
};
