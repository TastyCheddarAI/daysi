import { z } from "zod";

import { bookingCustomerSchema } from "./bookings";
import { locationSlugSchema, moneySchema, successEnvelope } from "./common";

export const revenueStreamSchema = z.enum([
  "services",
  "memberships",
  "packages",
  "retail",
  "education",
]);

export const couponCodeSchema = z.string().trim().min(1).max(64);

export const appliedCouponSchema = z.object({
  code: couponCodeSchema,
  name: z.string().min(1),
  discountAmount: moneySchema,
  appliedLineItemIds: z.array(z.string().min(1)).min(1),
});

export const appliedServiceAllowanceSchema = z.object({
  subscriptionId: z.string().min(1),
  planSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  quantity: z.number().int().positive(),
  discountAmount: moneySchema,
});

export const appliedPackageRedemptionSchema = z.object({
  packagePurchaseId: z.string().min(1),
  packageSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  quantity: z.number().int().positive(),
  discountAmount: moneySchema,
});

export const quoteItemRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("booking"),
    bookingId: z.string().min(1),
    managementToken: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal("membershipPlan"),
    planSlug: z.string().min(1),
  }),
  z.object({
    kind: z.literal("product"),
    productSlug: z.string().min(1),
    quantity: z.number().int().positive().default(1),
  }),
  z.object({
    kind: z.literal("servicePackage"),
    packageSlug: z.string().min(1),
    quantity: z.number().int().positive().default(1),
  }),
  z.object({
    kind: z.literal("educationOffer"),
    offerSlug: z.string().min(1),
    quantity: z.number().int().positive().default(1),
  }),
]);

export const quoteLineItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "booking",
    "membershipPlan",
    "product",
    "servicePackage",
    "educationOffer",
  ]),
  referenceId: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitAmount: moneySchema,
  subtotalAmount: moneySchema,
  discountAmount: moneySchema,
  appliedAccountCreditAmount: moneySchema,
  appliedServiceAllowance: appliedServiceAllowanceSchema.optional(),
  appliedPackageRedemption: appliedPackageRedemptionSchema.optional(),
  finalAmount: moneySchema,
  appliedCouponCodes: z.array(couponCodeSchema),
  revenueStream: revenueStreamSchema,
});

export const quoteRevenueBreakdownItemSchema = z.object({
  revenueStream: revenueStreamSchema,
  amount: moneySchema,
});

export const checkoutQuoteSchema = z.object({
  id: z.string().min(1),
  locationSlug: locationSlugSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  lineItems: z.array(quoteLineItemSchema).min(1),
  appliedCoupons: z.array(appliedCouponSchema),
  appliedAccountCreditAmount: moneySchema,
  subtotalAmount: moneySchema,
  discountAmount: moneySchema,
  totalAmount: moneySchema,
  revenueBreakdown: z.array(quoteRevenueBreakdownItemSchema),
});

export const checkoutQuoteRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  items: z.array(quoteItemRequestSchema).min(1),
  couponCodes: z.array(couponCodeSchema).default([]),
  applyAccountCredit: z.boolean().default(false),
});

export const checkoutQuoteResponseSchema = successEnvelope(
  z.object({
    quote: checkoutQuoteSchema,
  }),
);

export const paymentSessionSchema = z.object({
  provider: z.literal("stripe"),
  paymentIntentId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  status: z.enum([
    "not_required",
    "requires_payment_method",
    "succeeded",
    "failed",
    "refunded",
  ]),
});

export const orderStatusSchema = z.enum([
  "awaiting_payment",
  "paid",
  "payment_failed",
  "refunded",
]);

export const paymentStatusSchema = z.enum([
  "not_required",
  "requires_payment_method",
  "succeeded",
  "failed",
  "refunded",
]);

export const orderSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  locationSlug: locationSlugSchema,
  customer: bookingCustomerSchema,
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  lineItems: z.array(quoteLineItemSchema).min(1),
  appliedCoupons: z.array(appliedCouponSchema),
  appliedAccountCreditAmount: moneySchema,
  subtotalAmount: moneySchema,
  discountAmount: moneySchema,
  totalAmount: moneySchema,
  revenueBreakdown: z.array(quoteRevenueBreakdownItemSchema),
  paymentIntentId: z.string().min(1).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  paidAt: z.string().datetime({ offset: true }).optional(),
  refundedAt: z.string().datetime({ offset: true }).optional(),
});

export const checkoutConfirmRequestSchema = z.object({
  locationSlug: locationSlugSchema,
  items: z.array(quoteItemRequestSchema).min(1),
  couponCodes: z.array(couponCodeSchema).default([]),
  applyAccountCredit: z.boolean().default(false),
  customer: bookingCustomerSchema,
  paymentMethod: z.literal("stripe"),
});

export const checkoutConfirmResponseSchema = successEnvelope(
  z.object({
    order: orderSchema,
    paymentSession: paymentSessionSchema,
    managementToken: z.string().min(1),
  }),
);

export const orderResponseSchema = successEnvelope(
  z.object({
    order: orderSchema,
  }),
);

export const ordersResponseSchema = successEnvelope(
  z.object({
    orders: z.array(orderSchema),
  }),
);

export const refundOrderRequestSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

export const stripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "charge.refunded",
  ]),
  data: z.object({
    object: z.object({
      id: z.string().min(1),
      payment_intent: z.string().min(1).optional(),
      metadata: z.record(z.string()).default({}),
    }),
  }),
});

export const stripeWebhookResponseSchema = successEnvelope(
  z.object({
    received: z.literal(true),
    eventId: z.string().min(1),
  }),
);
