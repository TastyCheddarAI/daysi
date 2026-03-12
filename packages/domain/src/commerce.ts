import { randomUUID } from "node:crypto";

import type { BookingCustomer, BookingRecord } from "./bookings";
import type { CatalogProduct, EducationOffer } from "./catalog";
import type { LearningEntitlementProvisioningEffect } from "./learning";
import type {
  MembershipPlan,
  MembershipServiceAllowanceApplication,
  MembershipSubscription,
} from "./memberships";
import type {
  ServicePackageOffer,
  ServicePackageRedemptionApplication,
} from "./packages";

export type RevenueStream =
  | "services"
  | "memberships"
  | "packages"
  | "retail"
  | "education";
export type PaymentStatus =
  | "not_required"
  | "requires_payment_method"
  | "succeeded"
  | "failed"
  | "refunded";
export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "payment_failed"
  | "refunded";

export type QuoteItemInput =
  | {
      kind: "booking";
      booking: BookingRecord;
    }
  | {
      kind: "membershipPlan";
      plan: MembershipPlan;
    }
  | {
      kind: "product";
      product: CatalogProduct;
      quantity: number;
    }
  | {
      kind: "servicePackage";
      servicePackage: ServicePackageOffer;
      quantity: number;
    }
  | {
      kind: "educationOffer";
      offer: EducationOffer;
      quantity: number;
    };

export interface CouponDefinition {
  id: string;
  code: string;
  name: string;
  locationSlug: string;
  status: "active" | "inactive";
  stackable: boolean;
  discountType: "percent" | "fixed_amount";
  percentOff?: number;
  amountOff?: {
    currency: string;
    amountCents: number;
  };
  appliesToKinds: Array<
    "booking" | "membershipPlan" | "product" | "servicePackage" | "educationOffer"
  >;
  appliesToRevenueStreams: RevenueStream[];
  eligibleReferenceIds?: string[];
}

export interface AppliedCoupon {
  code: string;
  name: string;
  discountAmount: {
    currency: string;
    amountCents: number;
  };
  appliedLineItemIds: string[];
}

export interface AppliedServiceAllowance {
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  quantity: number;
  discountAmount: {
    currency: string;
    amountCents: number;
  };
}

export interface AppliedPackageRedemption {
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  quantity: number;
  discountAmount: {
    currency: string;
    amountCents: number;
  };
}

export interface QuoteLineItem {
  id: string;
  kind:
    | "booking"
    | "membershipPlan"
    | "product"
    | "servicePackage"
    | "educationOffer";
  referenceId: string;
  description: string;
  quantity: number;
  unitAmount: {
    currency: string;
    amountCents: number;
  };
  subtotalAmount: {
    currency: string;
    amountCents: number;
  };
  discountAmount: {
    currency: string;
    amountCents: number;
  };
  appliedAccountCreditAmount: {
    currency: string;
    amountCents: number;
  };
  appliedServiceAllowance?: AppliedServiceAllowance;
  appliedPackageRedemption?: AppliedPackageRedemption;
  finalAmount: {
    currency: string;
    amountCents: number;
  };
  appliedCouponCodes: string[];
  revenueStream: RevenueStream;
}

export interface QuoteRevenueBreakdownItem {
  revenueStream: RevenueStream;
  amount: {
    currency: string;
    amountCents: number;
  };
}

export interface CheckoutQuote {
  id: string;
  locationSlug: string;
  currency: string;
  lineItems: QuoteLineItem[];
  appliedCoupons: AppliedCoupon[];
  appliedAccountCreditAmount: {
    currency: string;
    amountCents: number;
  };
  subtotalAmount: {
    currency: string;
    amountCents: number;
  };
  discountAmount: {
    currency: string;
    amountCents: number;
  };
  totalAmount: {
    currency: string;
    amountCents: number;
  };
  revenueBreakdown: QuoteRevenueBreakdownItem[];
}

export interface OrderProvisioningEffect {
  kind: "activate-membership-subscription";
  subscriptionId: string;
}

export interface MembershipUsageProvisioningEffect {
  kind: "consume-membership-service-allowance";
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
}

export interface ServicePackagePurchaseProvisioningEffect {
  kind: "activate-service-package-purchase";
  packagePurchaseId: string;
}

export interface ServicePackageUsageProvisioningEffect {
  kind: "consume-service-package-credit";
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
}

export type CommerceOrderProvisioningEffect =
  | OrderProvisioningEffect
  | MembershipUsageProvisioningEffect
  | ServicePackagePurchaseProvisioningEffect
  | ServicePackageUsageProvisioningEffect
  | LearningEntitlementProvisioningEffect;

export interface OrderRecord {
  id: string;
  code: string;
  locationSlug: string;
  customer: BookingCustomer;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  lineItems: QuoteLineItem[];
  appliedCoupons: AppliedCoupon[];
  appliedAccountCreditAmount: {
    currency: string;
    amountCents: number;
  };
  subtotalAmount: {
    currency: string;
    amountCents: number;
  };
  discountAmount: {
    currency: string;
    amountCents: number;
  };
  totalAmount: {
    currency: string;
    amountCents: number;
  };
  revenueBreakdown: QuoteRevenueBreakdownItem[];
  paymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  refundedAt?: string;
  actorUserId?: string;
  provisioning: CommerceOrderProvisioningEffect[];
}

export interface PaymentSession {
  provider: "stripe";
  paymentIntentId?: string;
  clientSecret?: string;
  status: PaymentStatus;
}

export interface AccountCreditApplication {
  applyAccountCredit?: boolean;
  accountCreditBalanceCents?: number;
}

export interface ServiceAllowanceApplicationInput {
  serviceAllowanceApplications?: MembershipServiceAllowanceApplication[];
}

export interface PackageRedemptionApplicationInput {
  packageRedemptionApplications?: ServicePackageRedemptionApplication[];
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const normalizeCouponCode = (value: string): string =>
  value.trim().toUpperCase();

export const listCouponsForLocation = (
  coupons: CouponDefinition[],
  locationSlug: string,
): CouponDefinition[] =>
  coupons.filter((coupon) => coupon.locationSlug === locationSlug);

export const getCouponByCode = (
  coupons: CouponDefinition[],
  locationSlug: string,
  couponCode: string,
): CouponDefinition | undefined =>
  coupons.find(
    (coupon) =>
      coupon.locationSlug === locationSlug &&
      normalizeCouponCode(coupon.code) === normalizeCouponCode(couponCode),
  );

const buildLineItem = (item: QuoteItemInput): QuoteLineItem => {
  if (item.kind === "booking") {
    return {
      id: `qli_${randomUUID()}`,
      kind: "booking",
      referenceId: item.booking.id,
      description: `${item.booking.serviceName} booking`,
      quantity: 1,
      unitAmount: {
        currency: item.booking.charge.currency,
        amountCents: item.booking.charge.finalAmountCents,
      },
      subtotalAmount: {
        currency: item.booking.charge.currency,
        amountCents: item.booking.charge.finalAmountCents,
      },
      discountAmount: {
        currency: item.booking.charge.currency,
        amountCents: 0,
      },
      appliedAccountCreditAmount: {
        currency: item.booking.charge.currency,
        amountCents: 0,
      },
      finalAmount: {
        currency: item.booking.charge.currency,
        amountCents: item.booking.charge.finalAmountCents,
      },
      appliedCouponCodes: [],
      revenueStream: "services",
    };
  }

  if (item.kind === "membershipPlan") {
    return {
      id: `qli_${randomUUID()}`,
      kind: "membershipPlan",
      referenceId: item.plan.slug,
      description: item.plan.name,
      quantity: 1,
      unitAmount: item.plan.price,
      subtotalAmount: item.plan.price,
      discountAmount: {
        currency: item.plan.price.currency,
        amountCents: 0,
      },
      appliedAccountCreditAmount: {
        currency: item.plan.price.currency,
        amountCents: 0,
      },
      finalAmount: item.plan.price,
      appliedCouponCodes: [],
      revenueStream: "memberships",
    };
  }

  if (item.kind === "product") {
    const subtotal = item.product.price.amountCents * item.quantity;
    return {
      id: `qli_${randomUUID()}`,
      kind: "product",
      referenceId: item.product.slug,
      description: item.product.name,
      quantity: item.quantity,
      unitAmount: item.product.price,
      subtotalAmount: {
        currency: item.product.price.currency,
        amountCents: subtotal,
      },
      discountAmount: {
        currency: item.product.price.currency,
        amountCents: 0,
      },
      appliedAccountCreditAmount: {
        currency: item.product.price.currency,
        amountCents: 0,
      },
      finalAmount: {
        currency: item.product.price.currency,
        amountCents: subtotal,
      },
      appliedCouponCodes: [],
      revenueStream: "retail",
    };
  }

  if (item.kind === "servicePackage") {
    const subtotal = item.servicePackage.price.amountCents * item.quantity;
    return {
      id: `qli_${randomUUID()}`,
      kind: "servicePackage",
      referenceId: item.servicePackage.slug,
      description: item.servicePackage.name,
      quantity: item.quantity,
      unitAmount: item.servicePackage.price,
      subtotalAmount: {
        currency: item.servicePackage.price.currency,
        amountCents: subtotal,
      },
      discountAmount: {
        currency: item.servicePackage.price.currency,
        amountCents: 0,
      },
      appliedAccountCreditAmount: {
        currency: item.servicePackage.price.currency,
        amountCents: 0,
      },
      finalAmount: {
        currency: item.servicePackage.price.currency,
        amountCents: subtotal,
      },
      appliedCouponCodes: [],
      revenueStream: "packages",
    };
  }

  const subtotal = item.offer.price.amountCents * item.quantity;
  return {
    id: `qli_${randomUUID()}`,
    kind: "educationOffer",
    referenceId: item.offer.slug,
    description: item.offer.title,
    quantity: item.quantity,
    unitAmount: {
      currency: item.offer.price.currency,
      amountCents: item.offer.price.amountCents,
    },
    subtotalAmount: {
      currency: item.offer.price.currency,
      amountCents: subtotal,
    },
    discountAmount: {
      currency: item.offer.price.currency,
      amountCents: 0,
    },
    appliedAccountCreditAmount: {
      currency: item.offer.price.currency,
      amountCents: 0,
    },
    finalAmount: {
      currency: item.offer.price.currency,
      amountCents: subtotal,
    },
    appliedCouponCodes: [],
    revenueStream: "education",
  };
};

const resolveRequestedCoupons = (input: {
  locationSlug: string;
  couponCodes?: string[];
  availableCoupons?: CouponDefinition[];
}): CouponDefinition[] => {
  const requestedCodes = [...new Set((input.couponCodes ?? []).map(normalizeCouponCode))];
  if (requestedCodes.length === 0) {
    return [];
  }

  const coupons = requestedCodes.map((code) => {
    const coupon = input.availableCoupons?.find(
      (entry) =>
        entry.locationSlug === input.locationSlug &&
        normalizeCouponCode(entry.code) === code &&
        entry.status === "active",
    );

    if (!coupon) {
      throw new Error(`Coupon ${code} is not active for this location.`);
    }

    return coupon;
  });

  if (coupons.length > 1 && coupons.some((coupon) => !coupon.stackable)) {
    throw new Error("One or more selected coupons cannot be stacked.");
  }

  return coupons;
};

const applyServiceAllowancesToLineItems = (input: {
  baseItems: QuoteItemInput[];
  lineItems: QuoteLineItem[];
  serviceAllowanceApplications?: MembershipServiceAllowanceApplication[];
}): QuoteLineItem[] => {
  const applicationsByBookingId = new Map(
    (input.serviceAllowanceApplications ?? []).map((application) => [
      application.bookingId,
      application,
    ]),
  );

  return input.lineItems.map((lineItem, index) => {
    const sourceItem = input.baseItems[index];
    if (!sourceItem || sourceItem.kind !== "booking") {
      return lineItem;
    }

    const application = applicationsByBookingId.get(sourceItem.booking.id);
    if (!application || lineItem.finalAmount.amountCents <= 0) {
      return lineItem;
    }

    const appliedDiscount = Math.min(
      lineItem.finalAmount.amountCents,
      application.discountAmountCents,
    );

    return {
      ...lineItem,
      appliedServiceAllowance: {
        subscriptionId: application.subscriptionId,
        planSlug: application.planSlug,
        serviceSlug: application.serviceSlug,
        quantity: application.quantity,
        discountAmount: {
          currency: lineItem.finalAmount.currency,
          amountCents: appliedDiscount,
        },
      },
      discountAmount: {
        currency: lineItem.discountAmount.currency,
        amountCents: lineItem.discountAmount.amountCents + appliedDiscount,
      },
      finalAmount: {
        currency: lineItem.finalAmount.currency,
        amountCents: lineItem.finalAmount.amountCents - appliedDiscount,
      },
    };
  });
};

const applyPackageRedemptionsToLineItems = (input: {
  baseItems: QuoteItemInput[];
  lineItems: QuoteLineItem[];
  packageRedemptionApplications?: ServicePackageRedemptionApplication[];
}): QuoteLineItem[] => {
  const applicationsByBookingId = new Map(
    (input.packageRedemptionApplications ?? []).map((application) => [
      application.bookingId,
      application,
    ]),
  );

  return input.lineItems.map((lineItem, index) => {
    const sourceItem = input.baseItems[index];
    if (!sourceItem || sourceItem.kind !== "booking") {
      return lineItem;
    }

    const application = applicationsByBookingId.get(sourceItem.booking.id);
    if (!application || lineItem.finalAmount.amountCents <= 0) {
      return lineItem;
    }

    const appliedDiscount = Math.min(
      lineItem.finalAmount.amountCents,
      application.discountAmountCents,
    );

    return {
      ...lineItem,
      appliedPackageRedemption: {
        packagePurchaseId: application.packagePurchaseId,
        packageSlug: application.packageSlug,
        serviceSlug: application.serviceSlug,
        quantity: application.quantity,
        discountAmount: {
          currency: lineItem.finalAmount.currency,
          amountCents: appliedDiscount,
        },
      },
      discountAmount: {
        currency: lineItem.discountAmount.currency,
        amountCents: lineItem.discountAmount.amountCents + appliedDiscount,
      },
      finalAmount: {
        currency: lineItem.finalAmount.currency,
        amountCents: lineItem.finalAmount.amountCents - appliedDiscount,
      },
    };
  });
};

const isCouponApplicableToLine = (
  coupon: CouponDefinition,
  lineItem: QuoteLineItem,
): boolean => {
  if (!coupon.appliesToKinds.includes(lineItem.kind)) {
    return false;
  }

  if (!coupon.appliesToRevenueStreams.includes(lineItem.revenueStream)) {
    return false;
  }

  if (
    coupon.eligibleReferenceIds &&
    coupon.eligibleReferenceIds.length > 0 &&
    !coupon.eligibleReferenceIds.includes(lineItem.referenceId)
  ) {
    return false;
  }

  return lineItem.finalAmount.amountCents > 0;
};

const allocateFixedDiscount = (
  amountCents: number,
  eligibleLineItems: QuoteLineItem[],
): Map<string, number> => {
  const totalEligibleAmount = sum(
    eligibleLineItems.map((lineItem) => lineItem.finalAmount.amountCents),
  );
  const cappedAmount = Math.min(amountCents, totalEligibleAmount);
  const allocations = new Map<string, number>();

  if (cappedAmount <= 0 || totalEligibleAmount <= 0) {
    return allocations;
  }

  let allocatedAmount = 0;
  const rankedEligibleItems = eligibleLineItems.map((lineItem, index) => {
    const numerator = cappedAmount * lineItem.finalAmount.amountCents;
    const baseAmount = Math.floor(numerator / totalEligibleAmount);
    allocatedAmount += baseAmount;

    return {
      lineItem,
      baseAmount,
      remainder: numerator % totalEligibleAmount,
      index,
    };
  });

  for (const entry of rankedEligibleItems) {
    allocations.set(entry.lineItem.id, entry.baseAmount);
  }

  let remainingAmount = cappedAmount - allocatedAmount;
  const remainderOrder = [...rankedEligibleItems].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.index - right.index;
  });

  let cursor = 0;
  while (remainingAmount > 0 && cursor < remainderOrder.length) {
    const target = remainderOrder[cursor];
    allocations.set(target.lineItem.id, (allocations.get(target.lineItem.id) ?? 0) + 1);
    remainingAmount -= 1;
    cursor += 1;

    if (cursor >= remainderOrder.length && remainingAmount > 0) {
      cursor = 0;
    }
  }

  return allocations;
};

const applyCouponsToLineItems = (input: {
  locationSlug: string;
  baseLineItems: QuoteLineItem[];
  couponCodes?: string[];
  availableCoupons?: CouponDefinition[];
}): { lineItems: QuoteLineItem[]; appliedCoupons: AppliedCoupon[] } => {
  const requestedCoupons = resolveRequestedCoupons(input);
  if (requestedCoupons.length === 0) {
    return {
      lineItems: input.baseLineItems,
      appliedCoupons: [],
    };
  }

  const currency = input.baseLineItems[0]?.finalAmount.currency ?? "CAD";
  let lineItems = input.baseLineItems.map((lineItem) => ({
    ...lineItem,
    discountAmount: { ...lineItem.discountAmount },
    finalAmount: { ...lineItem.finalAmount },
    appliedCouponCodes: [...lineItem.appliedCouponCodes],
  }));
  const appliedCoupons: AppliedCoupon[] = [];

  for (const coupon of requestedCoupons) {
    const eligibleLineItems = lineItems.filter((lineItem) =>
      isCouponApplicableToLine(coupon, lineItem),
    );

    if (eligibleLineItems.length === 0) {
      throw new Error(`Coupon ${coupon.code} is not applicable to this cart.`);
    }

    let discountByLineItemId = new Map<string, number>();

    if (coupon.discountType === "percent") {
      const percentOff = coupon.percentOff ?? 0;
      discountByLineItemId = new Map(
        eligibleLineItems.map((lineItem) => [
          lineItem.id,
          Math.floor((lineItem.finalAmount.amountCents * percentOff) / 100),
        ]),
      );
    } else {
      if (!coupon.amountOff) {
        throw new Error(`Coupon ${coupon.code} is missing a fixed discount amount.`);
      }

      if (coupon.amountOff.currency !== currency) {
        throw new Error(`Coupon ${coupon.code} currency does not match this cart.`);
      }

      discountByLineItemId = allocateFixedDiscount(
        coupon.amountOff.amountCents,
        eligibleLineItems,
      );
    }

    const totalCouponDiscount = sum([...discountByLineItemId.values()]);
    if (totalCouponDiscount <= 0) {
      throw new Error(`Coupon ${coupon.code} does not produce a usable discount.`);
    }

    const appliedLineItemIds: string[] = [];
    lineItems = lineItems.map((lineItem) => {
      const lineDiscount = discountByLineItemId.get(lineItem.id) ?? 0;
      if (lineDiscount <= 0) {
        return lineItem;
      }

      appliedLineItemIds.push(lineItem.id);
      return {
        ...lineItem,
        discountAmount: {
          currency: lineItem.discountAmount.currency,
          amountCents: lineItem.discountAmount.amountCents + lineDiscount,
        },
        finalAmount: {
          currency: lineItem.finalAmount.currency,
          amountCents: lineItem.finalAmount.amountCents - lineDiscount,
        },
        appliedCouponCodes: [...lineItem.appliedCouponCodes, normalizeCouponCode(coupon.code)],
      };
    });

    appliedCoupons.push({
      code: normalizeCouponCode(coupon.code),
      name: coupon.name,
      discountAmount: {
        currency,
        amountCents: totalCouponDiscount,
      },
      appliedLineItemIds,
    });
  }

  return {
    lineItems,
    appliedCoupons,
  };
};

const applyAccountCreditToLineItems = (input: {
  lineItems: QuoteLineItem[];
  accountCreditBalanceCents?: number;
  applyAccountCredit?: boolean;
}): {
  lineItems: QuoteLineItem[];
  appliedAccountCreditAmount: {
    currency: string;
    amountCents: number;
  };
} => {
  const currency = input.lineItems[0]?.finalAmount.currency ?? "CAD";
  const availableCreditCents =
    input.applyAccountCredit && (input.accountCreditBalanceCents ?? 0) > 0
      ? input.accountCreditBalanceCents ?? 0
      : 0;

  if (availableCreditCents <= 0) {
    return {
      lineItems: input.lineItems,
      appliedAccountCreditAmount: {
        currency,
        amountCents: 0,
      },
    };
  }

  const eligibleLineItems = input.lineItems.filter(
    (lineItem) => lineItem.finalAmount.amountCents > 0,
  );
  const creditAllocation = allocateFixedDiscount(availableCreditCents, eligibleLineItems);
  const appliedAmount = sum([...creditAllocation.values()]);

  return {
    lineItems: input.lineItems.map((lineItem) => {
      const appliedCredit = creditAllocation.get(lineItem.id) ?? 0;
      if (appliedCredit <= 0) {
        return lineItem;
      }

      return {
        ...lineItem,
        appliedAccountCreditAmount: {
          currency: lineItem.appliedAccountCreditAmount.currency,
          amountCents:
            lineItem.appliedAccountCreditAmount.amountCents + appliedCredit,
        },
        discountAmount: {
          currency: lineItem.discountAmount.currency,
          amountCents: lineItem.discountAmount.amountCents + appliedCredit,
        },
        finalAmount: {
          currency: lineItem.finalAmount.currency,
          amountCents: lineItem.finalAmount.amountCents - appliedCredit,
        },
      };
    }),
    appliedAccountCreditAmount: {
      currency,
      amountCents: appliedAmount,
    },
  };
};

export const buildCheckoutQuote = (input: {
  locationSlug: string;
  items: QuoteItemInput[];
  couponCodes?: string[];
  availableCoupons?: CouponDefinition[];
  serviceAllowanceApplications?: MembershipServiceAllowanceApplication[];
  packageRedemptionApplications?: ServicePackageRedemptionApplication[];
  applyAccountCredit?: boolean;
  accountCreditBalanceCents?: number;
}): CheckoutQuote => {
  if (input.items.length === 0) {
    throw new Error("Checkout quote requires at least one item.");
  }

  const baseLineItems = input.items.map(buildLineItem);
  const allowanceAdjustedLineItems = applyServiceAllowancesToLineItems({
    baseItems: input.items,
    lineItems: baseLineItems,
    serviceAllowanceApplications: input.serviceAllowanceApplications,
  });
  const packageAdjustedLineItems = applyPackageRedemptionsToLineItems({
    baseItems: input.items,
    lineItems: allowanceAdjustedLineItems,
    packageRedemptionApplications: input.packageRedemptionApplications,
  });
  const { lineItems, appliedCoupons } = applyCouponsToLineItems({
    locationSlug: input.locationSlug,
    baseLineItems: packageAdjustedLineItems,
    couponCodes: input.couponCodes,
    availableCoupons: input.availableCoupons,
  });
  const {
    lineItems: lineItemsWithCredit,
    appliedAccountCreditAmount,
  } = applyAccountCreditToLineItems({
    lineItems,
    applyAccountCredit: input.applyAccountCredit,
    accountCreditBalanceCents: input.accountCreditBalanceCents,
  });
  const currency = lineItemsWithCredit[0]?.finalAmount.currency ?? "CAD";
  const subtotalCents = sum(
    lineItemsWithCredit.map((line) => line.subtotalAmount.amountCents),
  );
  const totalCents = sum(
    lineItemsWithCredit.map((line) => line.finalAmount.amountCents),
  );
  const revenueBreakdownMap = new Map<RevenueStream, number>();

  for (const lineItem of lineItemsWithCredit) {
    revenueBreakdownMap.set(
      lineItem.revenueStream,
      (revenueBreakdownMap.get(lineItem.revenueStream) ?? 0) + lineItem.finalAmount.amountCents,
    );
  }

  return {
    id: `quote_${randomUUID()}`,
    locationSlug: input.locationSlug,
    currency,
    lineItems: lineItemsWithCredit,
    appliedCoupons,
    appliedAccountCreditAmount,
    subtotalAmount: {
      currency,
      amountCents: subtotalCents,
    },
    discountAmount: {
      currency,
      amountCents: subtotalCents - totalCents,
    },
    totalAmount: {
      currency,
      amountCents: totalCents,
    },
    revenueBreakdown: [...revenueBreakdownMap.entries()].map(([revenueStream, amountCents]) => ({
      revenueStream,
      amount: {
        currency,
        amountCents,
      },
    })),
  };
};

const buildOrderCode = (): string => `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;

export const createOrderFromQuote = (input: {
  quote: CheckoutQuote;
  customer: BookingCustomer;
  actorUserId?: string;
  provisioning?: CommerceOrderProvisioningEffect[];
  now?: string;
  /**
   * Real Stripe payment intent data to embed in the order.
   * When provided (production mode), the order reflects the actual Stripe intent.
   * When absent (bootstrap/test mode), a placeholder is generated — replace before going live.
   */
  stripePaymentIntent?: { paymentIntentId: string; clientSecret: string };
}): { order: OrderRecord; paymentSession: PaymentSession; managementToken: string } => {
  const now = input.now ?? new Date().toISOString();
  const requiresPayment = input.quote.totalAmount.amountCents > 0;

  let paymentIntentId: string | undefined;
  let clientSecret: string | undefined;

  if (requiresPayment) {
    if (input.stripePaymentIntent) {
      paymentIntentId = input.stripePaymentIntent.paymentIntentId;
      clientSecret = input.stripePaymentIntent.clientSecret;
    } else {
      // Bootstrap placeholder — only acceptable in development/test mode
      paymentIntentId = `pi_${randomUUID().replaceAll("-", "")}`;
      clientSecret = `${paymentIntentId}_secret_bootstrap`;
    }
  }

  return {
    order: {
      id: `ord_${randomUUID()}`,
      code: buildOrderCode(),
      locationSlug: input.quote.locationSlug,
      customer: input.customer,
      status: requiresPayment ? "awaiting_payment" : "paid",
      paymentStatus: requiresPayment ? "requires_payment_method" : "not_required",
      currency: input.quote.currency,
      lineItems: input.quote.lineItems,
      appliedCoupons: input.quote.appliedCoupons,
      appliedAccountCreditAmount: input.quote.appliedAccountCreditAmount,
      subtotalAmount: input.quote.subtotalAmount,
      discountAmount: input.quote.discountAmount,
      totalAmount: input.quote.totalAmount,
      revenueBreakdown: input.quote.revenueBreakdown,
      paymentIntentId,
      createdAt: now,
      updatedAt: now,
      paidAt: requiresPayment ? undefined : now,
      actorUserId: input.actorUserId,
      provisioning: input.provisioning ?? [],
    },
    paymentSession: requiresPayment
      ? {
          provider: "stripe",
          paymentIntentId,
          clientSecret,
          status: "requires_payment_method",
        }
      : {
          provider: "stripe",
          status: "not_required",
        },
    managementToken: `omgmt_${randomUUID()}`,
  };
};

export const markOrderPaid = (
  order: OrderRecord,
  now = new Date().toISOString(),
): OrderRecord => ({
  ...order,
  status: "paid",
  paymentStatus: "succeeded",
  updatedAt: now,
  paidAt: order.paidAt ?? now,
});

export const markOrderPaymentFailed = (
  order: OrderRecord,
  now = new Date().toISOString(),
): OrderRecord => ({
  ...order,
  status: "payment_failed",
  paymentStatus: "failed",
  updatedAt: now,
});

export const markOrderRefunded = (
  order: OrderRecord,
  now = new Date().toISOString(),
): OrderRecord => ({
  ...order,
  status: "refunded",
  paymentStatus: "refunded",
  updatedAt: now,
  refundedAt: now,
});

export const buildMembershipProvisioningEffects = (
  subscriptions: MembershipSubscription[],
): CommerceOrderProvisioningEffect[] =>
  subscriptions.map((subscription) => ({
    kind: "activate-membership-subscription",
    subscriptionId: subscription.id,
  }));
