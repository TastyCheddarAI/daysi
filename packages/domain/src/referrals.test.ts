import { describe, expect, it } from "vitest";

import type { OrderRecord } from "./commerce";
import {
  createReferralCode,
  createReferralProgram,
  createReferralRelationship,
  qualifyReferralOrder,
} from "./referrals";

const paidOrder: OrderRecord = {
  id: "ord_referral_1",
  code: "ORD-REF-1",
  locationSlug: "daysi-flagship",
  customer: {
    firstName: "Casey",
    lastName: "Referral",
    email: "casey@example.com",
  },
  actorUserId: "usr_casey",
  status: "paid",
  paymentStatus: "succeeded",
  currency: "CAD",
  lineItems: [
    {
      id: "qli_1",
      kind: "booking",
      referenceId: "bkg_casey_1",
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
  appliedAccountCreditAmount: {
    currency: "CAD",
    amountCents: 0,
  },
  subtotalAmount: {
    currency: "CAD",
    amountCents: 29900,
  },
  discountAmount: {
    currency: "CAD",
    amountCents: 0,
  },
  totalAmount: {
    currency: "CAD",
    amountCents: 29900,
  },
  revenueBreakdown: [
    {
      revenueStream: "services",
      amount: {
        currency: "CAD",
        amountCents: 29900,
      },
    },
  ],
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-03-08T10:00:00.000Z",
  paidAt: "2026-03-08T10:01:00.000Z",
  provisioning: [],
};

describe("referrals domain", () => {
  it("blocks self-referral", () => {
    const program = createReferralProgram({
      locationSlug: "daysi-flagship",
      name: "Flagship Referrals",
      advocateReward: {
        kind: "account_credit",
        amount: {
          currency: "CAD",
          amountCents: 2000,
        },
      },
    });
    const referralCode = createReferralCode({
      programId: program.id,
      locationSlug: "daysi-flagship",
      ownerUserId: "usr_ava",
      ownerEmail: "ava@example.com",
      code: "AVA12345",
    });

    expect(() =>
      createReferralRelationship({
        program,
        referralCode,
        actor: {
          userId: "usr_ava",
          email: "ava@example.com",
        },
        existingRelationships: [],
      }),
    ).toThrow("Self-referral is not allowed.");
  });

  it("qualifies first paid orders and creates first and second-level rewards", () => {
    const program = createReferralProgram({
      locationSlug: "daysi-flagship",
      name: "Flagship Referrals",
      referredReward: {
        kind: "account_credit",
        amount: {
          currency: "CAD",
          amountCents: 1000,
        },
      },
      advocateReward: {
        kind: "account_credit",
        amount: {
          currency: "CAD",
          amountCents: 2000,
        },
      },
      secondLevelReward: {
        kind: "account_credit",
        amount: {
          currency: "CAD",
          amountCents: 500,
        },
      },
    });
    const avaCode = createReferralCode({
      programId: program.id,
      locationSlug: "daysi-flagship",
      ownerUserId: "usr_ava",
      ownerEmail: "ava@example.com",
      code: "AVA12345",
    });
    const blairCode = createReferralCode({
      programId: program.id,
      locationSlug: "daysi-flagship",
      ownerUserId: "usr_blair",
      ownerEmail: "blair@example.com",
      code: "BLAIR123",
    });
    const relationshipAvaToBlair = createReferralRelationship({
      program,
      referralCode: avaCode,
      actor: {
        userId: "usr_blair",
        email: "blair@example.com",
      },
      existingRelationships: [],
      now: "2026-03-08T09:00:00.000Z",
    });
    const relationshipBlairToCasey = createReferralRelationship({
      program,
      referralCode: blairCode,
      actor: {
        userId: "usr_casey",
        email: "casey@example.com",
      },
      existingRelationships: [relationshipAvaToBlair],
      now: "2026-03-08T09:05:00.000Z",
    });

    const qualification = qualifyReferralOrder({
      order: paidOrder,
      relationships: [relationshipAvaToBlair, relationshipBlairToCasey],
      programs: [program],
      rewardEvents: [],
      now: "2026-03-08T10:01:00.000Z",
    });

    expect(qualification.updatedRelationships[0]).toMatchObject({
      id: relationshipBlairToCasey.id,
      status: "qualified",
      firstQualifiedOrderId: paidOrder.id,
    });
    expect(qualification.rewardEvents).toHaveLength(2);
    expect(qualification.rewardEvents[0]).toMatchObject({
      recipient: "referrer",
      recipientEmail: "blair@example.com",
      reward: {
        amount: {
          amountCents: 2000,
        },
      },
      sourceOrderId: paidOrder.id,
    });
    expect(qualification.rewardEvents[1]).toMatchObject({
      recipient: "referrer_level_2",
      recipientEmail: "ava@example.com",
      reward: {
        amount: {
          amountCents: 500,
        },
      },
      sourceOrderId: paidOrder.id,
    });
  });
});
