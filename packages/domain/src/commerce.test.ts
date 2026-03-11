import { describe, expect, it } from "vitest";

import type { BookingRecord } from "./bookings";
import type { CouponDefinition } from "./commerce";
import type { MembershipPlan } from "./memberships";
import { buildCheckoutQuote, createOrderFromQuote } from "./commerce";

const booking: BookingRecord = {
  id: "bkg_1",
  code: "BK-TEST1",
  locationSlug: "daysi-flagship",
  serviceSlug: "laser-hair-removal",
  serviceVariantSlug: "laser-hair-removal-full-body-60",
  serviceName: "Laser Hair Removal",
  customer: {
    firstName: "Taylor",
    lastName: "Stone",
    email: "taylor@example.com",
  },
  providerSlug: "ava-chen",
  providerName: "Ava Chen",
  machineSlug: "gentlemax-pro-a",
  machineName: "GentleMax Pro A",
  status: "confirmed",
  startAt: "2026-03-09T10:00:00.000Z",
  endAt: "2026-03-09T11:00:00.000Z",
  charge: {
    currency: "CAD",
    retailAmountCents: 29900,
    memberAmountCents: 24900,
    finalAmountCents: 24900,
    membershipRequired: false,
    appliedPricingMode: "membership",
  },
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:00:00.000Z",
  statusHistory: [{ status: "confirmed", recordedAt: "2026-03-07T10:00:00.000Z" }],
};

const membershipPlan: MembershipPlan = {
  id: "mplan_glow",
  slug: "glow-membership",
  locationSlug: "daysi-flagship",
  name: "Glow Membership",
  description: "Monthly membership",
  billingInterval: "month",
  price: {
    currency: "CAD",
    amountCents: 12900,
  },
  educationOnly: false,
  entitlements: {
    includedServiceSlugs: [],
    educationOfferSlugs: [],
    monthlyServiceCredits: [],
    memberDiscountPercent: 15,
  },
};

const welcomeCoupon: CouponDefinition = {
  id: "cpn_welcome10",
  code: "WELCOME10",
  name: "Welcome 10",
  locationSlug: "daysi-flagship",
  status: "active",
  stackable: false,
  discountType: "percent",
  percentOff: 10,
  appliesToKinds: ["booking", "product", "educationOffer"],
  appliesToRevenueStreams: ["services", "retail", "education"],
};

describe("commerce domain", () => {
  it("builds a mixed quote with correct revenue breakdown", () => {
    const quote = buildCheckoutQuote({
      locationSlug: "daysi-flagship",
      items: [
        { kind: "booking", booking },
        { kind: "membershipPlan", plan: membershipPlan },
      ],
    });

    expect(quote.totalAmount.amountCents).toBe(37800);
    expect(quote.revenueBreakdown).toHaveLength(2);
    expect(quote.appliedCoupons).toHaveLength(0);
    expect(quote.appliedAccountCreditAmount.amountCents).toBe(0);
  });

  it("creates a pending-payment order for paid quotes", () => {
    const quote = buildCheckoutQuote({
      locationSlug: "daysi-flagship",
      items: [{ kind: "membershipPlan", plan: membershipPlan }],
    });

    const confirmed = createOrderFromQuote({
      quote,
      customer: {
        firstName: "Taylor",
        lastName: "Stone",
        email: "taylor@example.com",
      },
    });

    expect(confirmed.order.status).toBe("awaiting_payment");
    expect(confirmed.paymentSession.paymentIntentId).toMatch(/^pi_/);
    expect(confirmed.managementToken).toMatch(/^omgmt_/);
  });

  it("applies coupons to eligible quote items", () => {
    const quote = buildCheckoutQuote({
      locationSlug: "daysi-flagship",
      items: [{ kind: "booking", booking }],
      couponCodes: ["welcome10"],
      availableCoupons: [welcomeCoupon],
    });

    expect(quote.discountAmount.amountCents).toBe(2490);
    expect(quote.totalAmount.amountCents).toBe(22410);
    expect(quote.appliedCoupons[0]?.code).toBe("WELCOME10");
    expect(quote.lineItems[0]?.appliedCouponCodes).toEqual(["WELCOME10"]);
  });

  it("applies account credit after coupons", () => {
    const quote = buildCheckoutQuote({
      locationSlug: "daysi-flagship",
      items: [{ kind: "booking", booking }],
      availableCoupons: [welcomeCoupon],
      couponCodes: ["WELCOME10"],
      applyAccountCredit: true,
      accountCreditBalanceCents: 5000,
    });

    expect(quote.appliedAccountCreditAmount.amountCents).toBe(5000);
    expect(quote.totalAmount.amountCents).toBe(17410);
    expect(quote.lineItems[0]?.appliedAccountCreditAmount.amountCents).toBe(5000);
  });

  it("applies membership service allowances before other discounts", () => {
    const quote = buildCheckoutQuote({
      locationSlug: "daysi-flagship",
      items: [{ kind: "booking", booking }],
      serviceAllowanceApplications: [
        {
          subscriptionId: "msub_glow",
          planSlug: "glow-membership",
          serviceSlug: "laser-hair-removal",
          bookingId: "bkg_1",
          quantity: 1,
          discountAmountCents: 24900,
        },
      ],
      applyAccountCredit: true,
      accountCreditBalanceCents: 5000,
    });

    expect(quote.totalAmount.amountCents).toBe(0);
    expect(quote.discountAmount.amountCents).toBe(24900);
    expect(quote.appliedCoupons).toHaveLength(0);
    expect(quote.appliedAccountCreditAmount.amountCents).toBe(0);
    expect(quote.lineItems[0]?.appliedServiceAllowance).toMatchObject({
      subscriptionId: "msub_glow",
      planSlug: "glow-membership",
      serviceSlug: "laser-hair-removal",
      quantity: 1,
      discountAmount: {
        currency: "CAD",
        amountCents: 24900,
      },
    });
  });
});
