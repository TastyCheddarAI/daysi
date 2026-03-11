import { z } from "zod";

import { bookingRecordSchema } from "./bookings";
import { dateOnlySchema, isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const recurringScheduleWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});

export const providerScheduleExceptionKindSchema = z.enum([
  "time_off",
  "blackout",
  "manual_override",
]);

export const providerScheduleExceptionSchema = z.object({
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema,
  kind: providerScheduleExceptionKindSchema,
  note: z.string().min(1).optional(),
});

export const providerScheduleSchema = z.object({
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  locationSlug: locationSlugSchema,
  template: z.array(recurringScheduleWindowSchema),
  exceptions: z.array(providerScheduleExceptionSchema),
});

export const providerScheduleResponseSchema = successEnvelope(
  z.object({
    schedule: providerScheduleSchema,
  }),
);

export const providerScheduleTemplateUpdateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  template: z.array(recurringScheduleWindowSchema).min(1),
});

export const providerScheduleExceptionCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema,
  kind: providerScheduleExceptionKindSchema,
  note: z.string().trim().min(1).optional(),
});

export const providerBookingsResponseSchema = successEnvelope(
  z.object({
    bookings: z.array(bookingRecordSchema),
  }),
);

export const payoutLineItemSchema = z.object({
  orderId: z.string().min(1),
  bookingId: z.string().min(1),
  providerSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  revenueAmountCents: z.number().int().nonnegative(),
  commissionPercent: z.number().min(0).max(100),
  payoutAmountCents: z.number().int().nonnegative(),
});

export const providerPayoutSummarySchema = z.object({
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  totalRevenueAmountCents: z.number().int().nonnegative(),
  totalPayoutAmountCents: z.number().int().nonnegative(),
  lineItems: z.array(payoutLineItemSchema),
});

export const providerPayoutsResponseSchema = successEnvelope(
  z.object({
    payouts: z.array(providerPayoutSummarySchema),
  }),
);

export const providerPayoutRunStatusSchema = z.enum(["draft", "approved", "paid"]);

export const providerPayoutRunSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: providerPayoutRunStatusSchema,
  fromDate: dateOnlySchema,
  toDate: dateOnlySchema,
  providerPayouts: z.array(providerPayoutSummarySchema),
  coveredOrderIds: z.array(z.string().min(1)).min(1),
  createdAt: isoTimestampSchema,
  createdByUserId: z.string().min(1).optional(),
  approvedAt: isoTimestampSchema.optional(),
  paidAt: isoTimestampSchema.optional(),
});

export const providerPayoutRunsResponseSchema = successEnvelope(
  z.object({
    payoutRuns: z.array(providerPayoutRunSchema),
  }),
);

export const providerPayoutRunResponseSchema = successEnvelope(
  z.object({
    payoutRun: providerPayoutRunSchema,
  }),
);

export const providerPayoutRunCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  fromDate: dateOnlySchema,
  toDate: dateOnlySchema,
});

export const providerPayoutRunUpdateRequestSchema = z.object({
  status: z.enum(["approved", "paid"]),
});

export const adminProviderSummarySchema = z.object({
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  email: z.string().email(),
  locationSlug: locationSlugSchema,
  serviceSlugs: z.array(z.string().min(1)),
  commissionPercent: z.number().min(0).max(100),
});

export const adminProvidersResponseSchema = successEnvelope(
  z.object({
    providers: z.array(adminProviderSummarySchema),
  }),
);

export const machineScheduleSchema = z.object({
  machineSlug: z.string().min(1),
  machineName: z.string().min(1),
  locationSlug: locationSlugSchema,
  capabilities: z.array(z.string().min(1)),
  template: z.array(recurringScheduleWindowSchema),
  blockedWindows: z.array(
    z.object({
      startsAt: isoTimestampSchema,
      endsAt: isoTimestampSchema,
    }),
  ),
});

export const roomScheduleSchema = z.object({
  roomSlug: z.string().min(1),
  roomName: z.string().min(1),
  locationSlug: locationSlugSchema,
  capabilities: z.array(z.string().min(1)),
  template: z.array(recurringScheduleWindowSchema),
  blockedWindows: z.array(
    z.object({
      startsAt: isoTimestampSchema,
      endsAt: isoTimestampSchema,
    }),
  ),
});

export const adminMachinesResponseSchema = successEnvelope(
  z.object({
    machines: z.array(machineScheduleSchema),
  }),
);

export const machineScheduleUpdateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  template: z.array(recurringScheduleWindowSchema).min(1),
});

export const providerPerformanceRowSchema = z.object({
  providerSlug: z.string().min(1),
  providerName: z.string().min(1),
  bookingCount: z.number().int().nonnegative(),
  paidServiceRevenueCents: z.number().int().nonnegative(),
  payoutAmountCents: z.number().int().nonnegative(),
});

export const machineUtilizationRowSchema = z.object({
  machineSlug: z.string().min(1),
  machineName: z.string().min(1),
  bookedMinutes: z.number().int().nonnegative(),
  availableMinutes: z.number().int().nonnegative(),
  utilizationPercent: z.number().min(0).max(100),
});

export const locationPerformanceSchema = z.object({
  locationSlug: locationSlugSchema,
  bookingCount: z.number().int().nonnegative(),
  paidOrderCount: z.number().int().nonnegative(),
  paidRevenueCents: z.number().int().nonnegative(),
});

export const providerPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    providers: z.array(providerPerformanceRowSchema),
  }),
);

export const utilizationReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    fromDate: dateOnlySchema,
    toDate: dateOnlySchema,
    machines: z.array(machineUtilizationRowSchema),
    location: locationPerformanceSchema,
  }),
);
