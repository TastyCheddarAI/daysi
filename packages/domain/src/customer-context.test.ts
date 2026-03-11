import { describe, expect, it } from "vitest";

import type { BookingRecord } from "./bookings";
import type { OrderRecord } from "./commerce";
import type { CreditEntry } from "./credits";
import type { LearningEntitlement } from "./learning";
import type { MembershipSubscription } from "./memberships";
import type { SkinAssessmentRecord } from "./skin-assessments";
import {
  buildCustomerContextView,
  createCustomerEventRecord,
  createCustomerNote,
  createCustomerTag,
} from "./customer-context";

const booking: BookingRecord = {
  id: "bkg_ctx_1",
  code: "BK-CTX-1",
  locationSlug: "daysi-flagship",
  serviceSlug: "laser-hair-removal",
  serviceVariantSlug: "laser-hair-removal-full-body-60",
  serviceName: "Laser Hair Removal",
  customer: {
    firstName: "Context",
    lastName: "Customer",
    email: "context@example.com",
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
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-03-08T10:00:00.000Z",
  statusHistory: [{ status: "confirmed", recordedAt: "2026-03-08T10:00:00.000Z" }],
};

const order: OrderRecord = {
  id: "ord_ctx_1",
  code: "ORD-CTX-1",
  locationSlug: "daysi-flagship",
  customer: {
    firstName: "Context",
    lastName: "Customer",
    email: "context@example.com",
  },
  actorUserId: "usr_ctx_1",
  status: "paid",
  paymentStatus: "succeeded",
  currency: "CAD",
  lineItems: [],
  appliedCoupons: [],
  appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
  subtotalAmount: { currency: "CAD", amountCents: 0 },
  discountAmount: { currency: "CAD", amountCents: 0 },
  totalAmount: { currency: "CAD", amountCents: 0 },
  revenueBreakdown: [],
  createdAt: "2026-03-08T10:05:00.000Z",
  updatedAt: "2026-03-08T10:05:00.000Z",
  paidAt: "2026-03-08T10:05:00.000Z",
  provisioning: [],
};

const assessment: SkinAssessmentRecord = {
  id: "srec_ctx_1",
  rawIntakeId: "sai_ctx_1",
  sourceApp: "skin-analyzer",
  eventId: "evt_skin_ctx_1",
  locationSlug: "daysi-flagship",
  externalAssessmentId: "assessment_ctx_1",
  customerEmail: "context@example.com",
  customerName: "Context Customer",
  capturedAt: "2026-03-08T10:07:00.000Z",
  receivedAt: "2026-03-08T10:07:05.000Z",
  summary: "Pigmentation and tone concerns with a strong photofacial fit.",
  confidenceScore: 84,
  concerns: [
    {
      key: "pigmentation",
      label: "Pigmentation",
      severityScore: 88,
    },
  ],
  dominantConcernKeys: ["pigmentation"],
  treatmentGoals: ["tone correction"],
  contraindications: [],
  recommendedServiceSlugs: ["skin-rejuvenation"],
  unresolvedRecommendedServiceSlugs: ["external-service"],
  images: [],
  imageCount: 0,
  signals: {},
};

describe("customer context domain", () => {
  it("derives notes, tags, segments, and event summaries for a customer", () => {
    const context = buildCustomerContextView({
      locationSlug: "daysi-flagship",
      customerEmail: "context@example.com",
      notes: [
        createCustomerNote({
          locationSlug: "daysi-flagship",
          customerEmail: "context@example.com",
          customerName: "Context Customer",
          body: "Prefers morning appointments.",
          createdByUserId: "usr_admin",
        }),
      ],
      tags: [
        createCustomerTag({
          locationSlug: "daysi-flagship",
          customerEmail: "context@example.com",
          label: "vip-followup",
          createdByUserId: "usr_admin",
        }),
      ],
      events: [
        createCustomerEventRecord({
          locationSlug: "daysi-flagship",
          customerEmail: "context@example.com",
          source: "referral",
          eventType: "referral.code_applied",
          occurredAt: "2026-03-08T10:06:00.000Z",
        }),
      ],
      bookings: [booking, { ...booking, id: "bkg_ctx_2", code: "BK-CTX-2" }],
      orders: [order],
      subscriptions: [
        {
          id: "msub_ctx_1",
          planSlug: "glow-membership",
          locationSlug: "daysi-flagship",
          status: "active",
          actorUserId: "usr_ctx_1",
          customerEmail: "context@example.com",
          customerName: "Context Customer",
          sourceOrderId: "ord_ctx_1",
          createdAt: "2026-03-08T10:01:00.000Z",
          activatedAt: "2026-03-08T10:02:00.000Z",
        } satisfies MembershipSubscription,
      ],
      entitlements: [
        {
          id: "lent_ctx_1",
          locationSlug: "daysi-flagship",
          educationOfferSlug: "signature-laser-method",
          educationOfferTitle: "Daysi Signature Laser Method",
          moduleSlugs: ["laser-foundations"],
          customerEmail: "context@example.com",
          customerName: "Context Customer",
          actorUserId: "usr_ctx_1",
          source: "purchase",
          status: "active",
          grantedAt: "2026-03-08T10:03:00.000Z",
        } satisfies LearningEntitlement,
      ],
      creditEntries: [
        {
          id: "cred_ctx_1",
          locationSlug: "daysi-flagship",
          type: "grant",
          amount: {
            currency: "CAD",
            amountCents: 1500,
          },
          customerEmail: "context@example.com",
          actorUserId: "usr_ctx_1",
          createdAt: "2026-03-08T10:04:00.000Z",
        } satisfies CreditEntry,
      ],
      skinAssessments: [assessment],
    });

    expect(context.notes[0]?.body).toBe("Prefers morning appointments.");
    expect(context.tags[0]?.label).toBe("vip-followup");
    expect(context.latestSkinAssessments[0]?.assessmentId).toBe("srec_ctx_1");
    expect(context.segments.map((segment) => segment.key)).toEqual(
      expect.arrayContaining([
        "active_member",
        "education_customer",
        "referred_customer",
        "repeat_booker",
        "credit_balance_holder",
      ]),
    );
    expect(context.summary.bookingCount).toBe(2);
    expect(context.summary.activeCreditAmountCents).toBe(1500);
    expect(context.summary.skinAssessmentCount).toBe(1);
  });
});
