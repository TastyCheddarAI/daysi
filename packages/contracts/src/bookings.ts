import { z } from "zod";

import { availabilitySlotSchema } from "./availability";
import {
  dateOnlySchema,
  isoTimestampSchema,
  locationSlugSchema,
  successEnvelope,
} from "./common";
import { pricingModeSchema } from "./catalog";

export const bookingStatusSchema = z.enum([
  "confirmed",
  "cancelled",
]);

export const bookingCustomerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().min(7).optional(),
});

export const bookingChargeSummarySchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  retailAmountCents: z.number().int().nonnegative(),
  memberAmountCents: z.number().int().nonnegative().optional(),
  finalAmountCents: z.number().int().nonnegative(),
  membershipRequired: z.boolean(),
  appliedPricingMode: pricingModeSchema,
});

export const bookingStatusEventSchema = z.object({
  status: bookingStatusSchema,
  recordedAt: isoTimestampSchema,
  note: z.string().min(1).optional(),
});

export const bookingRecordSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  locationSlug: locationSlugSchema,
  sourceAssessmentId: z.string().min(1).optional(),
  sourceTreatmentPlanId: z.string().min(1).optional(),
  serviceSlug: z.string().min(1),
  serviceVariantSlug: z.string().min(1),
  serviceName: z.string().min(1),
  customer: bookingCustomerSchema,
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  machineSlug: z.string().min(1),
  machineName: z.string().min(1),
  roomSlug: z.string().min(1).optional(),
  roomName: z.string().min(1).optional(),
  status: bookingStatusSchema,
  startAt: isoTimestampSchema,
  endAt: isoTimestampSchema,
  charge: bookingChargeSummarySchema,
  notes: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  cancelledAt: isoTimestampSchema.optional(),
  cancelledReason: z.string().min(1).optional(),
  statusHistory: z.array(bookingStatusEventSchema),
});

export const createBookingRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  assessmentId: z.string().min(1).optional(),
  treatmentPlanId: z.string().min(1).optional(),
  serviceSlug: z.string().min(1),
  serviceVariantSlug: z.string().min(1),
  slotId: z.string().min(1),
  pricingMode: pricingModeSchema.default("retail"),
  customer: bookingCustomerSchema,
  notes: z.string().trim().min(1).optional(),
});

export const createBookingResponseSchema = successEnvelope(
  z.object({
    booking: bookingRecordSchema,
    managementToken: z.string().min(1),
  }),
);

export const bookingResponseSchema = successEnvelope(
  z.object({
    booking: bookingRecordSchema,
  }),
);

export const rescheduleBookingRequestSchema = z.object({
  slotId: z.string().min(1),
  pricingMode: pricingModeSchema.default("retail"),
  managementToken: z.string().min(1),
});

export const cancelBookingRequestSchema = z.object({
  managementToken: z.string().min(1),
  reason: z.string().trim().min(1).optional(),
});

export const rebookingOptionsQuerySchema = z.object({
  fromDate: dateOnlySchema.optional(),
  toDate: dateOnlySchema.optional(),
  pricingMode: pricingModeSchema.optional(),
});

export const rebookingOptionsResponseSchema = successEnvelope(
  z.object({
    booking: bookingRecordSchema,
    fromDate: dateOnlySchema,
    toDate: dateOnlySchema,
    pricingMode: pricingModeSchema,
    slots: z.array(availabilitySlotSchema),
  }),
);
