import { z } from "zod";

import { couponCodeSchema } from "./commerce";
import { isoTimestampSchema, locationSlugSchema, moneySchema, successEnvelope } from "./common";

export const membershipBillingIntervalSchema = z.enum(["month"]);
export const membershipSubscriptionStatusSchema = z.enum([
  "pending_payment",
  "active",
  "cancelled",
]);

export const membershipEntitlementSchema = z.object({
  includedServiceSlugs: z.array(z.string().min(1)),
  educationOfferSlugs: z.array(z.string().min(1)),
  monthlyServiceCredits: z.array(
    z.object({
      serviceSlug: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  memberDiscountPercent: z.number().min(0).max(100),
});

export const membershipPlanSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  locationSlug: locationSlugSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  billingInterval: membershipBillingIntervalSchema,
  price: moneySchema,
  educationOnly: z.boolean(),
  entitlements: membershipEntitlementSchema,
});

export const membershipSubscriptionSchema = z.object({
  id: z.string().min(1),
  planSlug: z.string().min(1),
  locationSlug: locationSlugSchema,
  status: membershipSubscriptionStatusSchema,
  actorUserId: z.string().min(1).optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  sourceOrderId: z.string().min(1).optional(),
  createdAt: isoTimestampSchema,
  activatedAt: isoTimestampSchema.optional(),
  cancelledAt: isoTimestampSchema.optional(),
});

export const membershipPlansResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    plans: z.array(membershipPlanSchema),
  }),
);

export const membershipSubscriptionCreateRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  planSlug: z.string().min(1),
  couponCodes: z.array(couponCodeSchema).default([]),
  applyAccountCredit: z.boolean().default(false),
  customer: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
    phone: z.string().trim().min(7).optional(),
  }),
});

export const membershipSubscriptionCreateResponseSchema = successEnvelope(
  z.object({
    subscription: membershipSubscriptionSchema,
    orderId: z.string().min(1),
    paymentIntentId: z.string().min(1).optional(),
  }),
);

export const membershipSubscriptionResponseSchema = successEnvelope(
  z.object({
    subscription: membershipSubscriptionSchema,
  }),
);

export const membershipSubscriptionsResponseSchema = successEnvelope(
  z.object({
    subscriptions: z.array(membershipSubscriptionSchema),
  }),
);
