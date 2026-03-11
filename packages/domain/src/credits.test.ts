import { describe, expect, it } from "vitest";

import type { CreditEntry } from "./credits";
import type { MembershipPlan, MembershipSubscription } from "./memberships";
import { buildCreditBalanceView, calculateAccountCreditBalance } from "./credits";

const entries: CreditEntry[] = [
  {
    id: "cred_1",
    locationSlug: "daysi-flagship",
    type: "grant",
    amount: { currency: "CAD", amountCents: 10000 },
    customerEmail: "credits@example.com",
    actorUserId: "usr_credits_1",
    createdAt: "2026-03-07T10:00:00.000Z",
  },
  {
    id: "cred_2",
    locationSlug: "daysi-flagship",
    type: "redeem",
    amount: { currency: "CAD", amountCents: 2500 },
    customerEmail: "credits@example.com",
    actorUserId: "usr_credits_1",
    sourceOrderId: "ord_1",
    createdAt: "2026-03-07T10:10:00.000Z",
  },
];

const plan: MembershipPlan = {
  id: "mplan_glow",
  slug: "glow-membership",
  locationSlug: "daysi-flagship",
  name: "Glow Membership",
  description: "Monthly glow plan",
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
  id: "msub_1",
  planSlug: "glow-membership",
  locationSlug: "daysi-flagship",
  status: "active",
  actorUserId: "usr_credits_1",
  customerEmail: "credits@example.com",
  customerName: "Credits Example",
  createdAt: "2026-03-07T10:00:00.000Z",
  activatedAt: "2026-03-07T10:05:00.000Z",
};

describe("credits domain", () => {
  it("calculates available account credit", () => {
    expect(calculateAccountCreditBalance(entries).amountCents).toBe(7500);
  });

  it("builds a combined credit balance and service allowance view", () => {
    const view = buildCreditBalanceView({
      entries,
      plans: [plan],
      subscriptions: [subscription],
      usageRecords: [],
      actorUserId: "usr_credits_1",
      actorEmail: "credits@example.com",
    });

    expect(view.availableAmount.amountCents).toBe(7500);
    expect(view.serviceAllowances).toHaveLength(1);
    expect(view.serviceAllowances[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(view.serviceAllowances[0]?.remainingQuantity).toBe(1);
  });
});
