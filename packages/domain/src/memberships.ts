import { randomUUID } from "node:crypto";

import type { BookingRecord } from "./bookings";
import type { BookingCustomer } from "./bookings";

export interface MembershipEntitlement {
  includedServiceSlugs: string[];
  educationOfferSlugs: string[];
  monthlyServiceCredits: Array<{
    serviceSlug: string;
    quantity: number;
  }>;
  memberDiscountPercent: number;
}

export interface MembershipPlan {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  description: string;
  billingInterval: "month";
  price: {
    currency: string;
    amountCents: number;
  };
  educationOnly: boolean;
  entitlements: MembershipEntitlement;
}

export type MembershipSubscriptionStatus =
  | "pending_payment"
  | "active"
  | "cancelled";

export interface MembershipSubscription {
  id: string;
  planSlug: string;
  locationSlug: string;
  status: MembershipSubscriptionStatus;
  actorUserId?: string;
  customerEmail: string;
  customerName: string;
  sourceOrderId?: string;
  createdAt: string;
  activatedAt?: string;
  cancelledAt?: string;
}

export interface MembershipUsageRecord {
  id: string;
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  bookingId?: string;
  quantity: number;
  sourceOrderId?: string;
  status: "consumed" | "reversed";
  createdAt: string;
  reversedAt?: string;
}

export interface MembershipServiceAllowance {
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
}

export interface MembershipServiceAllowanceApplication {
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
  discountAmountCents: number;
}

export const listMembershipPlansForLocation = (
  plans: MembershipPlan[],
  locationSlug: string,
): MembershipPlan[] =>
  plans.filter((plan) => plan.locationSlug === locationSlug);

export const getMembershipPlanBySlug = (
  plans: MembershipPlan[],
  locationSlug: string,
  planSlug: string,
): MembershipPlan | undefined =>
  plans.find((plan) => plan.locationSlug === locationSlug && plan.slug === planSlug);

export const createPendingMembershipSubscription = (input: {
  plan: MembershipPlan;
  customer: BookingCustomer;
  actorUserId?: string;
  sourceOrderId?: string;
  now?: string;
}): MembershipSubscription => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `msub_${randomUUID()}`,
    planSlug: input.plan.slug,
    locationSlug: input.plan.locationSlug,
    status: input.plan.price.amountCents === 0 ? "active" : "pending_payment",
    actorUserId: input.actorUserId,
    customerEmail: input.customer.email,
    customerName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
    sourceOrderId: input.sourceOrderId,
    createdAt: now,
    activatedAt: input.plan.price.amountCents === 0 ? now : undefined,
  };
};

export const activateMembershipSubscription = (
  subscription: MembershipSubscription,
  now = new Date().toISOString(),
): MembershipSubscription => ({
  ...subscription,
  status: "active",
  activatedAt: subscription.activatedAt ?? now,
});

export const cancelMembershipSubscription = (
  subscription: MembershipSubscription,
  now = new Date().toISOString(),
): MembershipSubscription => ({
  ...subscription,
  status: "cancelled",
  cancelledAt: now,
});

export const createMembershipUsageRecord = (input: {
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  bookingId?: string;
  quantity: number;
  sourceOrderId?: string;
  now?: string;
}): MembershipUsageRecord => ({
  id: `muse_${randomUUID()}`,
  subscriptionId: input.subscriptionId,
  planSlug: input.planSlug,
  serviceSlug: input.serviceSlug,
  bookingId: input.bookingId,
  quantity: input.quantity,
  sourceOrderId: input.sourceOrderId,
  status: "consumed",
  createdAt: input.now ?? new Date().toISOString(),
});

export const reverseMembershipUsageRecord = (
  usage: MembershipUsageRecord,
  now = new Date().toISOString(),
): MembershipUsageRecord => ({
  ...usage,
  status: "reversed",
  reversedAt: now,
});

export const buildRemainingServiceAllowances = (input: {
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  usageRecords: MembershipUsageRecord[];
}): MembershipServiceAllowance[] => {
  const planBySlug = new Map(input.plans.map((plan) => [plan.slug, plan]));
  const usageBySubscriptionService = new Map<string, number>();

  for (const usage of input.usageRecords) {
    if (usage.status !== "consumed") {
      continue;
    }

    const key = `${usage.subscriptionId}::${usage.serviceSlug}`;
    usageBySubscriptionService.set(
      key,
      (usageBySubscriptionService.get(key) ?? 0) + usage.quantity,
    );
  }

  return input.subscriptions
    .filter((subscription) => subscription.status === "active")
    .flatMap((subscription) => {
      const plan = planBySlug.get(subscription.planSlug);
      if (!plan) {
        return [];
      }

      return plan.entitlements.monthlyServiceCredits.map((credit) => {
        const key = `${subscription.id}::${credit.serviceSlug}`;
        const usedQuantity = usageBySubscriptionService.get(key) ?? 0;
        const remainingQuantity = Math.max(0, credit.quantity - usedQuantity);

        return {
          subscriptionId: subscription.id,
          planSlug: plan.slug,
          serviceSlug: credit.serviceSlug,
          totalQuantity: credit.quantity,
          usedQuantity,
          remainingQuantity,
        };
      });
    });
};

export const buildMembershipServiceAllowanceApplications = (input: {
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  usageRecords: MembershipUsageRecord[];
  bookings: BookingRecord[];
}): MembershipServiceAllowanceApplication[] => {
  const remainingAllowances = buildRemainingServiceAllowances({
    plans: input.plans,
    subscriptions: input.subscriptions,
    usageRecords: input.usageRecords,
  }).map((allowance) => ({ ...allowance }));
  const applications: MembershipServiceAllowanceApplication[] = [];

  for (const booking of input.bookings) {
    const allowance = remainingAllowances.find(
      (entry) =>
        entry.serviceSlug === booking.serviceSlug && entry.remainingQuantity >= 1,
    );

    if (!allowance) {
      continue;
    }

    applications.push({
      subscriptionId: allowance.subscriptionId,
      planSlug: allowance.planSlug,
      serviceSlug: allowance.serviceSlug,
      bookingId: booking.id,
      quantity: 1,
      discountAmountCents: booking.charge.finalAmountCents,
    });
    allowance.remainingQuantity -= 1;
    allowance.usedQuantity += 1;
  }

  return applications;
};

export const buildMembershipUsageProvisioningEffects = (
  applications: MembershipServiceAllowanceApplication[],
): Array<{
  kind: "consume-membership-service-allowance";
  subscriptionId: string;
  planSlug: string;
  serviceSlug: string;
  bookingId: string;
  quantity: number;
}> =>
  applications.map((application) => ({
    kind: "consume-membership-service-allowance",
    subscriptionId: application.subscriptionId,
    planSlug: application.planSlug,
    serviceSlug: application.serviceSlug,
    bookingId: application.bookingId,
    quantity: application.quantity,
  }));
