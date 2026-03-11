import { randomUUID } from "node:crypto";

import type { AvailabilitySlot, BookingPricingMode } from "./availability";
import type { CatalogPriceSummary, CatalogService } from "./catalog";

export type BookingStatus = "confirmed" | "cancelled";

export interface BookingCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface BookingChargeSummary {
  currency: string;
  retailAmountCents: number;
  memberAmountCents?: number;
  finalAmountCents: number;
  membershipRequired: boolean;
  appliedPricingMode: BookingPricingMode;
}

export interface BookingStatusEvent {
  status: BookingStatus;
  recordedAt: string;
  note?: string;
}

export interface BookingRecord {
  id: string;
  code: string;
  locationSlug: string;
  sourceAssessmentId?: string;
  sourceTreatmentPlanId?: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  serviceName: string;
  customer: BookingCustomer;
  providerSlug: string;
  providerName: string;
  machineSlug: string;
  machineName: string;
  roomSlug?: string;
  roomName?: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  charge: BookingChargeSummary;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledReason?: string;
  statusHistory: BookingStatusEvent[];
  actorUserId?: string;
}

export interface BookingDraftResult {
  booking: BookingRecord;
  managementToken: string;
}

export interface RebookingSearchWindow {
  fromDate: string;
  toDate: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RANGE_LIMIT_DAYS = 14;

const buildBookingCode = (): string =>
  `BK-${randomUUID().slice(0, 8).toUpperCase()}`;

const toDateOnly = (value: string): string => value.slice(0, 10);

const addDays = (dateOnly: string, days: number): string => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  return new Date(date.getTime() + days * DAY_IN_MS).toISOString().slice(0, 10);
};

const resolveCharge = (
  price: CatalogPriceSummary,
  requestedPricingMode: BookingPricingMode,
): BookingChargeSummary => {
  if (price.membershipRequired && requestedPricingMode !== "membership") {
    throw new Error("This service requires an active membership booking path.");
  }

  const canApplyMembershipPrice =
    requestedPricingMode === "membership" && typeof price.memberAmountCents === "number";
  const appliedPricingMode: BookingPricingMode = canApplyMembershipPrice
    ? "membership"
    : "retail";

  return {
    currency: price.currency,
    retailAmountCents: price.retailAmountCents,
    memberAmountCents: price.memberAmountCents,
    finalAmountCents: canApplyMembershipPrice
      ? price.memberAmountCents ?? price.retailAmountCents
      : price.retailAmountCents,
    membershipRequired: price.membershipRequired,
    appliedPricingMode,
  };
};

export const createBookingRecord = (input: {
  service: CatalogService;
  slot: AvailabilitySlot;
  customer: BookingCustomer;
  sourceAssessmentId?: string;
  sourceTreatmentPlanId?: string;
  requestedPricingMode: BookingPricingMode;
  actorUserId?: string;
  notes?: string;
  now?: string;
}): BookingDraftResult => {
  const now = input.now ?? new Date().toISOString();
  const bookingId = `bkg_${randomUUID()}`;

  return {
    booking: {
      id: bookingId,
      code: buildBookingCode(),
      locationSlug: input.slot.locationSlug,
      sourceAssessmentId: input.sourceAssessmentId,
      sourceTreatmentPlanId: input.sourceTreatmentPlanId,
      serviceSlug: input.service.slug,
      serviceVariantSlug: input.service.variantSlug,
      serviceName: input.service.name,
      customer: input.customer,
      providerSlug: input.slot.providerSlug,
      providerName: input.slot.providerName,
      machineSlug: input.slot.machineSlug,
      machineName: input.slot.machineName,
      roomSlug: input.slot.roomSlug,
      roomName: input.slot.roomName,
      status: "confirmed",
      startAt: input.slot.startAt,
      endAt: input.slot.endAt,
      charge: resolveCharge(input.service.price, input.requestedPricingMode),
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: "confirmed", recordedAt: now }],
      actorUserId: input.actorUserId,
    },
    managementToken: `mgmt_${randomUUID()}`,
  };
};

export const resolveRebookingSearchWindow = (input: {
  booking: BookingRecord;
  fromDate?: string;
  toDate?: string;
}): RebookingSearchWindow => {
  const resolvedFromDate = input.fromDate ?? toDateOnly(input.booking.startAt);
  const resolvedToDate = input.toDate ?? addDays(resolvedFromDate, RANGE_LIMIT_DAYS - 1);

  if (resolvedFromDate > resolvedToDate) {
    throw new Error("Rebooking search range is invalid.");
  }

  const fromDate = new Date(`${resolvedFromDate}T00:00:00.000Z`);
  const toDate = new Date(`${resolvedToDate}T00:00:00.000Z`);
  const spanDays = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_IN_MS) + 1;

  if (spanDays < 1 || spanDays > RANGE_LIMIT_DAYS) {
    throw new Error("Rebooking search range must be between 1 and 14 days.");
  }

  return {
    fromDate: resolvedFromDate,
    toDate: resolvedToDate,
  };
};

export const rescheduleBookingRecord = (input: {
  booking: BookingRecord;
  service: CatalogService;
  slot: AvailabilitySlot;
  requestedPricingMode: BookingPricingMode;
  now?: string;
}): BookingRecord => {
  if (input.booking.status !== "confirmed") {
    throw new Error("Only confirmed bookings can be rescheduled.");
  }

  const now = input.now ?? new Date().toISOString();

  return {
    ...input.booking,
    startAt: input.slot.startAt,
    endAt: input.slot.endAt,
    providerSlug: input.slot.providerSlug,
    providerName: input.slot.providerName,
    machineSlug: input.slot.machineSlug,
    machineName: input.slot.machineName,
    roomSlug: input.slot.roomSlug,
    roomName: input.slot.roomName,
    charge: resolveCharge(input.service.price, input.requestedPricingMode),
    updatedAt: now,
    statusHistory: [
      ...input.booking.statusHistory,
      {
        status: "confirmed",
        recordedAt: now,
        note: "Booking rescheduled.",
      },
    ],
  };
};

export const cancelBookingRecord = (input: {
  booking: BookingRecord;
  reason?: string;
  now?: string;
}): BookingRecord => {
  if (input.booking.status === "cancelled") {
    return input.booking;
  }

  const now = input.now ?? new Date().toISOString();

  return {
    ...input.booking,
    status: "cancelled",
    updatedAt: now,
    cancelledAt: now,
    cancelledReason: input.reason,
    statusHistory: [
      ...input.booking.statusHistory,
      {
        status: "cancelled",
        recordedAt: now,
        note: input.reason,
      },
    ],
  };
};
