import { z } from "zod";

import { isoTimestampSchema, locationSlugSchema, successEnvelope } from "./common";

export const customerNoteSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  body: z.string().min(1),
  createdByUserId: z.string().min(1).optional(),
  createdByEmail: z.string().email().optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const customerTagSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  label: z.string().min(1),
  createdByUserId: z.string().min(1).optional(),
  createdByEmail: z.string().email().optional(),
  createdAt: isoTimestampSchema,
});

export const customerEventRecordSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  actorUserId: z.string().min(1).optional(),
  source: z.enum([
    "booking",
    "commerce",
    "learning",
    "referral",
    "ai",
    "skinAnalysis",
    "manual",
  ]),
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: isoTimestampSchema,
});

export const customerSkinAssessmentSnapshotSchema = z.object({
  assessmentId: z.string().min(1),
  capturedAt: isoTimestampSchema,
  summary: z.string().min(1),
  dominantConcernKeys: z.array(z.string().min(1)),
  recommendedServiceSlugs: z.array(z.string().min(1)),
  unresolvedRecommendedServiceSlugs: z.array(z.string().min(1)),
  imageCount: z.number().int().nonnegative(),
});

export const customerSegmentSchema = z.object({
  key: z.enum([
    "active_member",
    "education_customer",
    "referred_customer",
    "repeat_booker",
    "credit_balance_holder",
  ]),
  label: z.string().min(1),
  reason: z.string().min(1),
});

export const customerContextResponseSchema = successEnvelope(
  z.object({
    context: z.object({
      customerEmail: z.string().email(),
      customerName: z.string().min(1).optional(),
      locationSlug: locationSlugSchema,
      notes: z.array(customerNoteSchema),
      tags: z.array(customerTagSchema),
      segments: z.array(customerSegmentSchema),
      latestSkinAssessments: z.array(customerSkinAssessmentSnapshotSchema),
      recentEvents: z.array(customerEventRecordSchema),
      summary: z.object({
        bookingCount: z.number().int().nonnegative(),
        paidOrderCount: z.number().int().nonnegative(),
        activeSubscriptionCount: z.number().int().nonnegative(),
        activeEntitlementCount: z.number().int().nonnegative(),
        activeCreditAmountCents: z.number().int().nonnegative(),
        skinAssessmentCount: z.number().int().nonnegative(),
        latestSkinAssessmentAt: isoTimestampSchema.optional(),
        lastSeenAt: isoTimestampSchema.optional(),
      }),
    }),
  }),
);

export const customerDirectoryEntrySchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).optional(),
  locationSlug: locationSlugSchema,
  tags: z.array(customerTagSchema.pick({ id: true, label: true, createdAt: true })),
  segments: z.array(customerSegmentSchema),
  summary: z.object({
    bookingCount: z.number().int().nonnegative(),
    paidOrderCount: z.number().int().nonnegative(),
    activeSubscriptionCount: z.number().int().nonnegative(),
    activeEntitlementCount: z.number().int().nonnegative(),
    activeCreditAmountCents: z.number().int().nonnegative(),
    totalPaidRevenueAmountCents: z.number().int().nonnegative(),
    skinAssessmentCount: z.number().int().nonnegative(),
    latestSkinAssessmentAt: isoTimestampSchema.optional(),
    lastSeenAt: isoTimestampSchema.optional(),
  }),
});

export const customerDirectoryResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    search: z.string(),
    page: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    totalCount: z.number().int().nonnegative(),
    stats: z.object({
      totalCustomers: z.number().int().nonnegative(),
      activeMembershipCustomerCount: z.number().int().nonnegative(),
      educationCustomerCount: z.number().int().nonnegative(),
      repeatBookerCount: z.number().int().nonnegative(),
      totalBookingCount: z.number().int().nonnegative(),
      totalPaidOrderCount: z.number().int().nonnegative(),
      totalPaidRevenueAmountCents: z.number().int().nonnegative(),
      totalActiveCreditAmountCents: z.number().int().nonnegative(),
      totalSkinAssessmentCount: z.number().int().nonnegative(),
    }),
    customers: z.array(customerDirectoryEntrySchema),
  }),
);

export const adminCustomerNoteCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  customerName: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1),
});

export const adminCustomerNoteUpdateRequestSchema = z.object({
  body: z.string().trim().min(1),
});

export const adminCustomerNoteResponseSchema = successEnvelope(
  z.object({
    note: customerNoteSchema,
  }),
);

export const adminCustomerTagCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  customerEmail: z.string().email(),
  label: z.string().trim().min(1),
});

export const adminCustomerTagResponseSchema = successEnvelope(
  z.object({
    tag: customerTagSchema,
  }),
);

export const adminCustomerUpdateRequestSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const adminCustomerResponseSchema = successEnvelope(
  z.object({
    customer: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      phone: z.string().optional(),
      updatedAt: z.string(),
    }),
  }),
);
