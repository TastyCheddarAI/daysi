import { z } from "zod";

import { availabilitySlotSchema } from "./availability";
import { bookingCustomerSchema } from "./bookings";
import {
  dateOnlySchema,
  isoTimestampSchema,
  locationSlugSchema,
  successEnvelope,
} from "./common";
import { pricingModeSchema } from "./catalog";

export const waitlistStatusSchema = z.enum([
  "active",
  "notified",
  "booked",
  "cancelled",
]);

export const waitlistDateWindowSchema = z.object({
  fromDate: dateOnlySchema,
  toDate: dateOnlySchema,
});

export const waitlistStatusEventSchema = z.object({
  status: waitlistStatusSchema,
  recordedAt: isoTimestampSchema,
  note: z.string().min(1).optional(),
});

export const waitlistRecordSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  serviceSlug: z.string().min(1),
  serviceVariantSlug: z.string().min(1),
  serviceName: z.string().min(1),
  customer: bookingCustomerSchema,
  preferredProviderSlug: z.string().min(1).optional(),
  preferredPricingMode: pricingModeSchema,
  requestedWindow: waitlistDateWindowSchema,
  status: waitlistStatusSchema,
  notes: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  fulfilledByBookingId: z.string().min(1).optional(),
  statusHistory: z.array(waitlistStatusEventSchema),
});

export const createWaitlistRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  serviceSlug: z.string().min(1),
  serviceVariantSlug: z.string().min(1),
  customer: bookingCustomerSchema,
  preferredProviderSlug: z.string().min(1).optional(),
  pricingMode: pricingModeSchema.default("retail"),
  requestedWindow: waitlistDateWindowSchema,
  notes: z.string().trim().min(1).optional(),
});

export const createWaitlistResponseSchema = successEnvelope(
  z.object({
    waitlistEntry: waitlistRecordSchema,
    managementToken: z.string().min(1),
  }),
);

export const waitlistResponseSchema = successEnvelope(
  z.object({
    waitlistEntry: waitlistRecordSchema,
  }),
);

export const waitlistListResponseSchema = successEnvelope(
  z.object({
    entries: z.array(waitlistRecordSchema),
  }),
);

export const adminWaitlistListResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    entries: z.array(waitlistRecordSchema),
  }),
);

export const cancelWaitlistRequestSchema = z.object({
  managementToken: z.string().min(1),
  reason: z.string().trim().min(1).optional(),
});

export const updateWaitlistStatusRequestSchema = z.object({
  status: waitlistStatusSchema,
  note: z.string().trim().min(1).optional(),
  fulfilledByBookingId: z.string().trim().min(1).optional(),
});

export const waitlistMatchesResponseSchema = successEnvelope(
  z.object({
    waitlistEntry: waitlistRecordSchema,
    pricingMode: pricingModeSchema,
    slots: z.array(availabilitySlotSchema),
  }),
);
