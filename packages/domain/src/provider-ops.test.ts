import { describe, expect, it } from "vitest";

import type { BookingRecord } from "./bookings";
import type { OrderRecord } from "./commerce";
import type { ProviderCompPlan } from "./provider-ops";
import {
  approveProviderPayoutRun,
  calculateProviderPayouts,
  createProviderPayoutRun,
  markProviderPayoutRunPaid,
} from "./provider-ops";

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
    finalAmountCents: 29900,
    membershipRequired: false,
    appliedPricingMode: "retail",
  },
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:00:00.000Z",
  statusHistory: [{ status: "confirmed", recordedAt: "2026-03-07T10:00:00.000Z" }],
};

const order: OrderRecord = {
  id: "ord_1",
  code: "ORD-TEST1",
  locationSlug: "daysi-flagship",
  customer: booking.customer,
  status: "paid",
  paymentStatus: "succeeded",
  currency: "CAD",
  lineItems: [
    {
      id: "qli_1",
      kind: "booking",
      referenceId: booking.id,
      description: "Laser Hair Removal booking",
      quantity: 1,
      unitAmount: { currency: "CAD", amountCents: 29900 },
      subtotalAmount: { currency: "CAD", amountCents: 29900 },
      discountAmount: { currency: "CAD", amountCents: 0 },
      appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
      finalAmount: { currency: "CAD", amountCents: 29900 },
      appliedCouponCodes: [],
      revenueStream: "services",
    },
  ],
  appliedCoupons: [],
  appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
  subtotalAmount: { currency: "CAD", amountCents: 29900 },
  discountAmount: { currency: "CAD", amountCents: 0 },
  totalAmount: { currency: "CAD", amountCents: 29900 },
  revenueBreakdown: [
    {
      revenueStream: "services",
      amount: { currency: "CAD", amountCents: 29900 },
    },
  ],
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T10:00:00.000Z",
  paidAt: "2026-03-07T10:05:00.000Z",
  provisioning: [],
};

const compPlan: ProviderCompPlan = {
  providerSlug: "ava-chen",
  locationSlug: "daysi-flagship",
  commissionPercent: 38,
  appliesToRevenueStream: "services",
};

describe("provider operations", () => {
  it("prefers service-specific comp overrides over provider default plans", () => {
    const payouts = calculateProviderPayouts({
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          email: "ava.chen@daysi.ca",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [],
          blockedWindows: [],
        },
      ],
      bookings: [booking],
      orders: [order],
      compPlans: [
        compPlan,
        {
          ...compPlan,
          serviceSlug: "laser-hair-removal",
          commissionPercent: 45,
        },
      ],
    });

    expect(payouts).toHaveLength(1);
    expect(payouts[0]?.totalRevenueAmountCents).toBe(29900);
    expect(payouts[0]?.totalPayoutAmountCents).toBe(13455);
    expect(payouts[0]?.lineItems[0]?.serviceSlug).toBe("laser-hair-removal");
    expect(payouts[0]?.lineItems[0]?.commissionPercent).toBe(45);
  });

  it("creates and advances provider payout runs", () => {
    const payoutRun = createProviderPayoutRun({
      locationSlug: "daysi-flagship",
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      providers: [
        {
          slug: "ava-chen",
          name: "Ava Chen",
          email: "ava.chen@daysi.ca",
          locationSlug: "daysi-flagship",
          serviceSlugs: ["laser-hair-removal"],
          availability: [],
          blockedWindows: [],
        },
      ],
      bookings: [booking],
      orders: [order],
      compPlans: [compPlan],
      createdByUserId: "usr_admin_1",
      now: "2026-03-07T11:00:00.000Z",
    });

    expect(payoutRun.status).toBe("draft");
    expect(payoutRun.coveredOrderIds).toEqual(["ord_1"]);
    expect(payoutRun.providerPayouts[0]?.totalPayoutAmountCents).toBe(11362);

    const approved = approveProviderPayoutRun(
      payoutRun,
      "2026-03-07T12:00:00.000Z",
    );
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBe("2026-03-07T12:00:00.000Z");

    const paid = markProviderPayoutRunPaid(
      approved,
      "2026-03-07T13:00:00.000Z",
    );
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBe("2026-03-07T13:00:00.000Z");
  });
});
