import { randomUUID } from "node:crypto";

import {
  buildRemainingServiceAllowances,
  type MembershipPlan,
  type MembershipSubscription,
  type MembershipUsageRecord,
} from "./memberships";

export interface CreditEntry {
  id: string;
  locationSlug: string;
  type: "grant" | "redeem" | "restore";
  amount: {
    currency: string;
    amountCents: number;
  };
  customerEmail: string;
  actorUserId?: string;
  sourceOrderId?: string;
  note?: string;
  grantedByUserId?: string;
  createdAt: string;
}

export interface ServiceAllowance {
  planSlug: string;
  serviceSlug: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
}

export interface CreditBalanceView {
  currency: string;
  availableAmount: {
    currency: string;
    amountCents: number;
  };
  entries: CreditEntry[];
  serviceAllowances: ServiceAllowance[];
}

export const createCreditEntry = (input: {
  locationSlug: string;
  type: "grant" | "redeem" | "restore";
  amount: {
    currency: string;
    amountCents: number;
  };
  customerEmail: string;
  actorUserId?: string;
  sourceOrderId?: string;
  note?: string;
  grantedByUserId?: string;
  now?: string;
}): CreditEntry => ({
  id: `cred_${randomUUID()}`,
  locationSlug: input.locationSlug,
  type: input.type,
  amount: input.amount,
  customerEmail: input.customerEmail,
  actorUserId: input.actorUserId,
  sourceOrderId: input.sourceOrderId,
  note: input.note,
  grantedByUserId: input.grantedByUserId,
  createdAt: input.now ?? new Date().toISOString(),
});

export const listCreditEntriesForActor = (
  entries: CreditEntry[],
  input: { actorUserId?: string; actorEmail?: string },
): CreditEntry[] =>
  entries.filter(
    (entry) =>
      (input.actorUserId && entry.actorUserId === input.actorUserId) ||
      (input.actorEmail && entry.customerEmail === input.actorEmail),
  );

export const calculateAccountCreditBalance = (
  entries: CreditEntry[],
  currency = "CAD",
): {
  currency: string;
  amountCents: number;
} => ({
  currency,
  amountCents: entries.reduce((total, entry) => {
    if (entry.type === "redeem") {
      return total - entry.amount.amountCents;
    }

    return total + entry.amount.amountCents;
  }, 0),
});

export const buildServiceAllowanceView = (input: {
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  usageRecords: MembershipUsageRecord[];
}): ServiceAllowance[] => {
  const allowanceMap = new Map<string, ServiceAllowance>();

  for (const allowance of buildRemainingServiceAllowances({
    plans: input.plans,
    subscriptions: input.subscriptions,
    usageRecords: input.usageRecords,
  })) {
    const key = `${allowance.planSlug}::${allowance.serviceSlug}`;
    const existing = allowanceMap.get(key);
    if (existing) {
      allowanceMap.set(key, {
        ...existing,
        totalQuantity: existing.totalQuantity + allowance.totalQuantity,
        usedQuantity: existing.usedQuantity + allowance.usedQuantity,
        remainingQuantity: existing.remainingQuantity + allowance.remainingQuantity,
      });
      continue;
    }

    allowanceMap.set(key, {
      planSlug: allowance.planSlug,
      serviceSlug: allowance.serviceSlug,
      totalQuantity: allowance.totalQuantity,
      usedQuantity: allowance.usedQuantity,
      remainingQuantity: allowance.remainingQuantity,
    });
  }

  return [...allowanceMap.values()];
};

export const buildCreditBalanceView = (input: {
  entries: CreditEntry[];
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  usageRecords: MembershipUsageRecord[];
  actorUserId?: string;
  actorEmail?: string;
}): CreditBalanceView => {
  const actorEntries = listCreditEntriesForActor(input.entries, {
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const actorSubscriptions = input.subscriptions.filter(
    (subscription) =>
      (input.actorUserId && subscription.actorUserId === input.actorUserId) ||
      (input.actorEmail && subscription.customerEmail === input.actorEmail),
  );
  const currency = actorEntries[0]?.amount.currency ?? "CAD";
  const availableAmount = calculateAccountCreditBalance(actorEntries, currency);

  return {
    currency,
    availableAmount,
    entries: actorEntries,
    serviceAllowances: buildServiceAllowanceView({
      plans: input.plans,
      subscriptions: actorSubscriptions,
      usageRecords: input.usageRecords,
    }),
  };
};
