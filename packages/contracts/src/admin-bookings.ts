import { z } from "zod";

import {
  bookingRecordSchema,
  bookingResponseSchema,
  bookingStatusSchema,
} from "./bookings";
import { pricingModeSchema } from "./catalog";
import { dateOnlySchema, locationSlugSchema, successEnvelope } from "./common";

export const adminBookingListQuerySchema = z.object({
  locationSlug: locationSlugSchema.optional(),
  fromDate: dateOnlySchema.optional(),
  toDate: dateOnlySchema.optional(),
  status: bookingStatusSchema.optional(),
  providerSlug: z.string().trim().min(1).optional(),
  customerEmail: z.string().email().optional(),
});

export const adminBookingsResponseSchema = successEnvelope(
  z.object({
    bookings: z.array(bookingRecordSchema),
  }),
);

export const adminBookingCancelRequestSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

export const adminBookingRescheduleRequestSchema = z.object({
  slotId: z.string().min(1),
  pricingMode: pricingModeSchema.default("retail"),
});

export const adminBookingMutationResponseSchema = bookingResponseSchema;
