import { randomUUID } from "node:crypto";

import type { BookingRecord, BookingCustomer } from "./bookings";

export interface ServicePackageOffer {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  status: "draft" | "published";
  price: {
    currency: string;
    amountCents: number;
  };
  serviceCredits: Array<{
    serviceSlug: string;
    quantity: number;
  }>;
  featureTags: string[];
}

export type ServicePackagePurchaseStatus =
  | "pending_payment"
  | "active"
  | "revoked";

export interface ServicePackagePurchase {
  id: string;
  packageSlug: string;
  locationSlug: string;
  status: ServicePackagePurchaseStatus;
  actorUserId?: string;
  customerEmail: string;
  customerName: string;
  sourceOrderId?: string;
  createdAt: string;
  activatedAt?: string;
  revokedAt?: string;
}

export interface ServicePackageUsageRecord {
  id: string;
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  bookingId?: string;
  quantity: number;
  sourceOrderId?: string;
  status: "consumed" | "reversed";
  createdAt: string;
  reversedAt?: string;
}

export interface ServicePackageBalance {
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
}

export interface ServicePackageRedemptionApplication {
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
  discountAmountCents: number;
}

export const listServicePackagesForLocation = (
  offers: ServicePackageOffer[],
  locationSlug: string,
): ServicePackageOffer[] =>
  offers.filter(
    (offer) => offer.locationSlug === locationSlug && offer.status === "published",
  );

export const listAdminServicePackagesForLocation = (
  offers: ServicePackageOffer[],
  locationSlug: string,
): ServicePackageOffer[] =>
  offers.filter((offer) => offer.locationSlug === locationSlug);

export const getServicePackageBySlug = (
  offers: ServicePackageOffer[],
  locationSlug: string,
  packageSlug: string,
  options: { includeDraft?: boolean } = {},
): ServicePackageOffer | undefined =>
  offers.find(
    (offer) =>
      offer.locationSlug === locationSlug &&
      offer.slug === packageSlug &&
      (options.includeDraft || offer.status === "published"),
  );

export const createPendingServicePackagePurchase = (input: {
  offer: ServicePackageOffer;
  customer: BookingCustomer;
  actorUserId?: string;
  sourceOrderId?: string;
  now?: string;
}): ServicePackagePurchase => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `spkgp_${randomUUID()}`,
    packageSlug: input.offer.slug,
    locationSlug: input.offer.locationSlug,
    status: input.offer.price.amountCents === 0 ? "active" : "pending_payment",
    actorUserId: input.actorUserId,
    customerEmail: input.customer.email,
    customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
    sourceOrderId: input.sourceOrderId,
    createdAt: now,
    activatedAt: input.offer.price.amountCents === 0 ? now : undefined,
  };
};

export const activateServicePackagePurchase = (
  purchase: ServicePackagePurchase,
  now = new Date().toISOString(),
): ServicePackagePurchase => ({
  ...purchase,
  status: "active",
  activatedAt: purchase.activatedAt ?? now,
});

export const revokeServicePackagePurchase = (
  purchase: ServicePackagePurchase,
  now = new Date().toISOString(),
): ServicePackagePurchase => ({
  ...purchase,
  status: "revoked",
  revokedAt: now,
});

export const createServicePackageUsageRecord = (input: {
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  bookingId?: string;
  quantity: number;
  sourceOrderId?: string;
  now?: string;
}): ServicePackageUsageRecord => ({
  id: `spkgu_${randomUUID()}`,
  packagePurchaseId: input.packagePurchaseId,
  packageSlug: input.packageSlug,
  serviceSlug: input.serviceSlug,
  bookingId: input.bookingId,
  quantity: input.quantity,
  sourceOrderId: input.sourceOrderId,
  status: "consumed",
  createdAt: input.now ?? new Date().toISOString(),
});

export const reverseServicePackageUsageRecord = (
  usage: ServicePackageUsageRecord,
  now = new Date().toISOString(),
): ServicePackageUsageRecord => ({
  ...usage,
  status: "reversed",
  reversedAt: now,
});

export const buildRemainingServicePackageBalances = (input: {
  offers: ServicePackageOffer[];
  purchases: ServicePackagePurchase[];
  usageRecords: ServicePackageUsageRecord[];
}): ServicePackageBalance[] => {
  const offerBySlug = new Map(input.offers.map((offer) => [offer.slug, offer]));
  const usageByPurchaseService = new Map<string, number>();

  for (const usage of input.usageRecords) {
    if (usage.status !== "consumed") {
      continue;
    }

    const key = `${usage.packagePurchaseId}::${usage.serviceSlug}`;
    usageByPurchaseService.set(
      key,
      (usageByPurchaseService.get(key) ?? 0) + usage.quantity,
    );
  }

  return input.purchases
    .filter((purchase) => purchase.status === "active")
    .flatMap((purchase) => {
      const offer = offerBySlug.get(purchase.packageSlug);
      if (!offer) {
        return [];
      }

      return offer.serviceCredits.map((credit) => {
        const key = `${purchase.id}::${credit.serviceSlug}`;
        const usedQuantity = usageByPurchaseService.get(key) ?? 0;
        const remainingQuantity = Math.max(0, credit.quantity - usedQuantity);

        return {
          packagePurchaseId: purchase.id,
          packageSlug: purchase.packageSlug,
          serviceSlug: credit.serviceSlug,
          totalQuantity: credit.quantity,
          usedQuantity,
          remainingQuantity,
        };
      });
    });
};

export const buildServicePackageRedemptionApplications = (input: {
  offers: ServicePackageOffer[];
  purchases: ServicePackagePurchase[];
  usageRecords: ServicePackageUsageRecord[];
  bookings: BookingRecord[];
}): ServicePackageRedemptionApplication[] => {
  const balances = buildRemainingServicePackageBalances({
    offers: input.offers,
    purchases: input.purchases,
    usageRecords: input.usageRecords,
  })
    .map((balance) => ({ ...balance }))
    .sort((left, right) => left.packagePurchaseId.localeCompare(right.packagePurchaseId));
  const applications: ServicePackageRedemptionApplication[] = [];

  for (const booking of input.bookings) {
    const balance = balances.find(
      (entry) =>
        entry.serviceSlug === booking.serviceSlug && entry.remainingQuantity >= 1,
    );

    if (!balance) {
      continue;
    }

    applications.push({
      packagePurchaseId: balance.packagePurchaseId,
      packageSlug: balance.packageSlug,
      serviceSlug: balance.serviceSlug,
      bookingId: booking.id,
      quantity: 1,
      discountAmountCents: booking.charge.finalAmountCents,
    });
    balance.remainingQuantity -= 1;
    balance.usedQuantity += 1;
  }

  return applications;
};

export const buildServicePackageProvisioningEffects = (
  purchases: ServicePackagePurchase[],
): Array<{
  kind: "activate-service-package-purchase";
  packagePurchaseId: string;
}> =>
  purchases.map((purchase) => ({
    kind: "activate-service-package-purchase",
    packagePurchaseId: purchase.id,
  }));

export const buildServicePackageUsageProvisioningEffects = (
  applications: ServicePackageRedemptionApplication[],
): Array<{
  kind: "consume-service-package-credit";
  packagePurchaseId: string;
  packageSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
}> =>
  applications.map((application) => ({
    kind: "consume-service-package-credit",
    packagePurchaseId: application.packagePurchaseId,
    packageSlug: application.packageSlug,
    serviceSlug: application.serviceSlug,
    bookingId: application.bookingId,
    quantity: application.quantity,
  }));
