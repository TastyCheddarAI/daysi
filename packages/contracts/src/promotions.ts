import { z } from "zod";

import { revenueStreamSchema } from "./commerce";
import { locationSlugSchema, moneySchema, successEnvelope } from "./common";

export const couponStatusSchema = z.enum(["active", "inactive"]);
export const couponDiscountTypeSchema = z.enum(["percent", "fixed_amount"]);
export const couponEligibleKindSchema = z.enum([
  "booking",
  "membershipPlan",
  "product",
  "servicePackage",
  "educationOffer",
]);

const adminCouponBaseSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1),
  locationSlug: locationSlugSchema,
  status: couponStatusSchema,
  stackable: z.boolean(),
  discountType: couponDiscountTypeSchema,
  percentOff: z.number().min(0).max(100).optional(),
  amountOff: moneySchema.optional(),
  appliesToKinds: z.array(couponEligibleKindSchema).min(1),
  appliesToRevenueStreams: z.array(revenueStreamSchema).min(1),
  eligibleReferenceIds: z.array(z.string().min(1)).optional(),
});

export const adminCouponSchema = adminCouponBaseSchema.superRefine((value, context) => {
    if (value.discountType === "percent" && value.percentOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percentOff is required for percent coupons.",
        path: ["percentOff"],
      });
    }

    if (value.discountType === "fixed_amount" && value.amountOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountOff is required for fixed amount coupons.",
        path: ["amountOff"],
      });
    }
  });

export const adminCouponsResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    coupons: z.array(adminCouponSchema),
  }),
);

export const adminCouponResponseSchema = successEnvelope(
  z.object({
    coupon: adminCouponSchema,
  }),
);

export const adminCouponCreateRequestSchema = adminCouponBaseSchema
  .omit({
    id: true,
  })
  .extend({
    code: z.string().trim().min(1).max(64),
  })
  .superRefine((value, context) => {
    if (value.discountType === "percent" && value.percentOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percentOff is required for percent coupons.",
        path: ["percentOff"],
      });
    }

    if (value.discountType === "fixed_amount" && value.amountOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountOff is required for fixed amount coupons.",
        path: ["amountOff"],
      });
    }
  });

export const adminCouponUpdateRequestSchema = z
  .object({
    locationSlug: locationSlugSchema,
    name: z.string().trim().min(1).optional(),
    status: couponStatusSchema.optional(),
    stackable: z.boolean().optional(),
    discountType: couponDiscountTypeSchema.optional(),
    percentOff: z.number().min(0).max(100).optional(),
    amountOff: moneySchema.optional(),
    appliesToKinds: z.array(couponEligibleKindSchema).min(1).optional(),
    appliesToRevenueStreams: z.array(revenueStreamSchema).min(1).optional(),
    eligibleReferenceIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.status !== undefined ||
      value.stackable !== undefined ||
      value.discountType !== undefined ||
      value.percentOff !== undefined ||
      value.amountOff !== undefined ||
      value.appliesToKinds !== undefined ||
      value.appliesToRevenueStreams !== undefined ||
      value.eligibleReferenceIds !== undefined,
    {
      message: "At least one coupon field must be updated.",
    },
  )
  .superRefine((value, context) => {
    if (value.discountType === "percent" && value.percentOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "percentOff is required when discountType is percent.",
        path: ["percentOff"],
      });
    }

    if (value.discountType === "fixed_amount" && value.amountOff === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountOff is required when discountType is fixed_amount.",
        path: ["amountOff"],
      });
    }
  });
