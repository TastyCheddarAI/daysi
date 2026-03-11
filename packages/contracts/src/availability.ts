import { z } from "zod";

import {
  dateOnlySchema,
  isoTimestampSchema,
  locationSlugSchema,
  successEnvelope,
} from "./common";
import { catalogPriceSummarySchema, pricingModeSchema } from "./catalog";

export const availabilitySearchRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  treatmentPlanId: z.string().min(1).optional(),
  serviceSlug: z.string().min(1),
  fromDate: dateOnlySchema,
  toDate: dateOnlySchema,
  preferredProviderSlug: z.string().min(1).optional(),
  pricingMode: pricingModeSchema.default("retail"),
});

export const availabilitySlotSchema = z.object({
  slotId: z.string().min(1),
  locationSlug: locationSlugSchema,
  serviceSlug: z.string().min(1),
  serviceVariantSlug: z.string().min(1),
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  machineSlug: z.string().min(1),
  machineName: z.string().min(1),
  roomSlug: z.string().min(1).optional(),
  roomName: z.string().min(1).optional(),
  startAt: isoTimestampSchema,
  endAt: isoTimestampSchema,
  price: catalogPriceSummarySchema,
});

export const availabilitySearchResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    serviceSlug: z.string().min(1),
    pricingMode: pricingModeSchema,
    slots: z.array(availabilitySlotSchema),
  }),
);
