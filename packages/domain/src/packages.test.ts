import { describe, expect, it } from "vitest";

import type { BookingRecord } from "./bookings";
import {
  buildRemainingServicePackageBalances,
  buildServicePackageRedemptionApplications,
  type ServicePackageOffer,
  type ServicePackagePurchase,
  type ServicePackageUsageRecord,
} from "./packages";

const offer: ServicePackageOffer = {
  id: "spkg_1",
  slug: "laser-hair-removal-series-3",
  locationSlug: "daysi-flagship",
  name: "Laser Hair Removal Series of 3",
  shortDescription: "Three prepaid laser treatments.",
  status: "published",
  price: {
    currency: "CAD",
    amountCents: 79900,
  },
  serviceCredits: [
    {
      serviceSlug: "laser-hair-removal",
      quantity: 3,
    },
  ],
  featureTags: ["prepaid"],
};

const purchase: ServicePackagePurchase = {
  id: "spkgp_1",
  packageSlug: offer.slug,
  locationSlug: "daysi-flagship",
  status: "active",
  actorUserId: "usr_1",
  customerEmail: "package@example.com",
  customerName: "Package Customer",
  sourceOrderId: "ord_1",
  createdAt: "2026-03-08T10:00:00.000Z",
  activatedAt: "2026-03-08T10:05:00.000Z",
};

const booking: BookingRecord = {
  id: "bkg_pkg_1",
  code: "BK-PKG-1",
  locationSlug: "daysi-flagship",
  serviceSlug: "laser-hair-removal",
  serviceVariantSlug: "laser-hair-removal-full-body-60",
  serviceName: "Laser Hair Removal",
  customer: {
    firstName: "Package",
    lastName: "Customer",
    email: "package@example.com",
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
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-03-08T10:00:00.000Z",
  statusHistory: [{ status: "confirmed", recordedAt: "2026-03-08T10:00:00.000Z" }],
};

describe("service packages", () => {
  it("calculates remaining package balances and redemption applications", () => {
    const usageRecords: ServicePackageUsageRecord[] = [
      {
        id: "spkgu_1",
        packagePurchaseId: purchase.id,
        packageSlug: offer.slug,
        serviceSlug: "laser-hair-removal",
        bookingId: "bkg_prev_1",
        quantity: 1,
        sourceOrderId: "ord_prev_1",
        status: "consumed",
        createdAt: "2026-03-08T12:00:00.000Z",
      },
    ];

    const balances = buildRemainingServicePackageBalances({
      offers: [offer],
      purchases: [purchase],
      usageRecords,
    });

    expect(balances).toHaveLength(1);
    expect(balances[0]?.totalQuantity).toBe(3);
    expect(balances[0]?.usedQuantity).toBe(1);
    expect(balances[0]?.remainingQuantity).toBe(2);

    const applications = buildServicePackageRedemptionApplications({
      offers: [offer],
      purchases: [purchase],
      usageRecords,
      bookings: [booking],
    });

    expect(applications).toHaveLength(1);
    expect(applications[0]?.packagePurchaseId).toBe(purchase.id);
    expect(applications[0]?.serviceSlug).toBe("laser-hair-removal");
    expect(applications[0]?.discountAmountCents).toBe(29900);
  });
});
