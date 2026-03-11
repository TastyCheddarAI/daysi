import { randomUUID } from "node:crypto";

import type { BookingCustomer } from "./bookings";
import type { BookingPricingMode } from "./availability";
import type { CatalogService } from "./catalog";

export type WaitlistStatus = "active" | "notified" | "booked" | "cancelled";

export interface WaitlistDateWindow {
  fromDate: string;
  toDate: string;
}

export interface WaitlistStatusEvent {
  status: WaitlistStatus;
  recordedAt: string;
  note?: string;
}

export interface WaitlistEntryRecord {
  id: string;
  locationSlug: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  serviceName: string;
  customer: BookingCustomer;
  preferredProviderSlug?: string;
  preferredPricingMode: BookingPricingMode;
  requestedWindow: WaitlistDateWindow;
  status: WaitlistStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fulfilledByBookingId?: string;
  statusHistory: WaitlistStatusEvent[];
  actorUserId?: string;
}

export interface WaitlistDraftResult {
  waitlistEntry: WaitlistEntryRecord;
  managementToken: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RANGE_LIMIT_DAYS = 14;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const ensureValidWindow = (window: WaitlistDateWindow): void => {
  if (window.fromDate > window.toDate) {
    throw new Error("Waitlist request window is invalid.");
  }

  const fromDate = new Date(`${window.fromDate}T00:00:00.000Z`);
  const toDate = new Date(`${window.toDate}T00:00:00.000Z`);
  const spanDays = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_IN_MS) + 1;

  if (spanDays < 1 || spanDays > RANGE_LIMIT_DAYS) {
    throw new Error("Waitlist request window must be between 1 and 14 days.");
  }
};

const validStatusTransitions: Record<WaitlistStatus, WaitlistStatus[]> = {
  active: ["notified", "booked", "cancelled"],
  notified: ["active", "booked", "cancelled"],
  booked: [],
  cancelled: [],
};

export const createWaitlistEntry = (input: {
  service: CatalogService;
  customer: BookingCustomer;
  preferredProviderSlug?: string;
  preferredPricingMode: BookingPricingMode;
  requestedWindow: WaitlistDateWindow;
  actorUserId?: string;
  notes?: string;
  now?: string;
}): WaitlistDraftResult => {
  ensureValidWindow(input.requestedWindow);

  const now = input.now ?? new Date().toISOString();
  const waitlistEntryId = `wl_${randomUUID()}`;

  return {
    waitlistEntry: {
      id: waitlistEntryId,
      locationSlug: input.service.locationSlug,
      serviceSlug: input.service.slug,
      serviceVariantSlug: input.service.variantSlug,
      serviceName: input.service.name,
      customer: {
        ...input.customer,
        email: normalizeEmail(input.customer.email),
      },
      preferredProviderSlug: input.preferredProviderSlug,
      preferredPricingMode: input.preferredPricingMode,
      requestedWindow: input.requestedWindow,
      status: "active",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: "active", recordedAt: now }],
      actorUserId: input.actorUserId,
    },
    managementToken: `wmgmt_${randomUUID()}`,
  };
};

export const updateWaitlistStatus = (input: {
  entry: WaitlistEntryRecord;
  status: WaitlistStatus;
  note?: string;
  fulfilledByBookingId?: string;
  now?: string;
}): WaitlistEntryRecord => {
  if (input.entry.status === input.status) {
    return {
      ...input.entry,
      fulfilledByBookingId:
        input.status === "booked"
          ? input.fulfilledByBookingId ?? input.entry.fulfilledByBookingId
          : undefined,
    };
  }

  if (!validStatusTransitions[input.entry.status].includes(input.status)) {
    throw new Error(
      `Waitlist entries cannot move from ${input.entry.status} to ${input.status}.`,
    );
  }

  const now = input.now ?? new Date().toISOString();

  return {
    ...input.entry,
    status: input.status,
    updatedAt: now,
    fulfilledByBookingId:
      input.status === "booked"
        ? input.fulfilledByBookingId ?? input.entry.fulfilledByBookingId
        : undefined,
    statusHistory: [
      ...input.entry.statusHistory,
      {
        status: input.status,
        recordedAt: now,
        note: input.note,
      },
    ],
  };
};

export const cancelWaitlistEntry = (input: {
  entry: WaitlistEntryRecord;
  reason?: string;
  now?: string;
}): WaitlistEntryRecord =>
  updateWaitlistStatus({
    entry: input.entry,
    status: "cancelled",
    note: input.reason,
    now: input.now,
  });

export const filterWaitlistEntries = (input: {
  entries: WaitlistEntryRecord[];
  locationSlug?: string;
  serviceSlug?: string;
  status?: WaitlistStatus;
}): WaitlistEntryRecord[] =>
  input.entries
    .filter((entry) => (input.locationSlug ? entry.locationSlug === input.locationSlug : true))
    .filter((entry) => (input.serviceSlug ? entry.serviceSlug === input.serviceSlug : true))
    .filter((entry) => (input.status ? entry.status === input.status : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
