import { describe, expect, it } from "vitest";

import type { BookingRecord } from "./bookings";
import type { MembershipPlan, MembershipSubscription } from "./memberships";
import {
  buildMembershipServiceAllowanceApplications,
  buildRemainingServiceAllowances,
  createMembershipUsageRecord,
} from "./memberships";

const plan: MembershipPlan = {
  id: "mplan_glow",
  slug: "glow-membership",
  locationSlug: "daysi-flagship",
  name: "Glow Membership",
  description: "Monthly retail-benefit membership with one covered skin rejuvenation service.",
  billingInterval: "month",
  price: {
    currency: "CAD",
    amountCents: 12900,
  },
  educationOnly: false,
  entitlements: {
    includedServiceSlugs: [],
    educationOfferSlugs: [],
    monthlyServiceCredits: [
      {
        serviceSlug: "skin-rejuvenation",
        quantity: 1,
      },
    ],
    memberDiscountPercent: 15,
  },
};

const subscription: MembershipSubscription = {
  id: "msub_glow",
  planSlug: "glow-membership",
  locationSlug: "daysi-flagship",
  status: "active",
  actorUserId: "usr_allowance_1",
  customerEmail: "allowance@example.com",
  customerName: "Allowance Example",
  createdAt: "2026-03-07T10:00:00.000Z",
  activatedAt: "2026-03-07T10:05:00.000Z",
};

const booking: BookingRecord = {
  id: "bkg_skin_1",
  code: "BK-SKIN1",
  locationSlug: "daysi-flagship",
  serviceSlug: "skin-rejuvenation",
  serviceVariantSlug: "skin-rejuvenation-photofacial-45",
  serviceName: "Skin Rejuvenation",
  customer: {
    firstName: "Allowance",
    lastName: "Example",
    email: "allowance@example.com",
  },
  providerSlug: "ava-chen",
  providerName: "Ava Chen",
  machineSlug: "gentlemax-pro-a",
  machineName: "GentleMax Pro A",
  status: "confirmed",
  startAt: "2026-03-10T10:00:00.000Z",
  endAt: "2026-03-10T10:45:00.000Z",
  charge: {
    currency: "CAD",
    retailAmountCents: 23900,
    memberAmountCents: 19900,
    finalAmountCents: 19900,
    membershipRequired: false,
    appliedPricingMode: "membership",
  },
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:00:00.000Z",
  statusHistory: [{ status: "confirmed", recordedAt: "2026-03-07T10:00:00.000Z" }],
};

describe("memberships domain", () => {
  it("builds service allowance applications from active subscriptions", () => {
    const applications = buildMembershipServiceAllowanceApplications({
      plans: [plan],
      subscriptions: [subscription],
      usageRecords: [],
      bookings: [booking],
    });

    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      subscriptionId: "msub_glow",
      planSlug: "glow-membership",
      serviceSlug: "skin-rejuvenation",
      bookingId: "bkg_skin_1",
      quantity: 1,
      discountAmountCents: 19900,
    });
  });

  it("reduces remaining service allowances after recorded usage", () => {
    const remaining = buildRemainingServiceAllowances({
      plans: [plan],
      subscriptions: [subscription],
      usageRecords: [
        createMembershipUsageRecord({
          subscriptionId: "msub_glow",
          planSlug: "glow-membership",
          serviceSlug: "skin-rejuvenation",
          bookingId: "bkg_skin_1",
          quantity: 1,
          sourceOrderId: "ord_1",
          now: "2026-03-07T11:00:00.000Z",
        }),
      ],
    });

    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      subscriptionId: "msub_glow",
      serviceSlug: "skin-rejuvenation",
      totalQuantity: 1,
      usedQuantity: 1,
      remainingQuantity: 0,
    });
  });
});
