import { describe, expect, it } from "vitest";

import type { MachineResource, RoomResource } from "./availability";
import type { OperationalMetricEventRecord } from "./analytics";
import type { BookingRecord } from "./bookings";
import type { CatalogService } from "./catalog";
import type { OrderRecord } from "./commerce";
import type {
  MembershipPlan,
  MembershipSubscription,
  MembershipUsageRecord,
} from "./memberships";
import type { SkinAssessmentRecord } from "./skin-assessments";
import type { TenantLocation, TenantOrganization } from "./tenanting";
import type { TreatmentPlanRecord } from "./treatment-plans";
import {
  buildMembershipPerformanceReport,
  buildMultiLocationBenchmarkReport,
  buildOperationsPerformanceReport,
  buildRevenueSummaryReport,
  buildSkinAssessmentPerformanceReport,
  buildTreatmentPlanPerformanceReport,
} from "./reporting";

const baseOrder: OrderRecord = {
  id: "ord_1",
  code: "ORD-1",
  locationSlug: "daysi-flagship",
  customer: {
    firstName: "Taylor",
    lastName: "Stone",
    email: "taylor@example.com",
  },
  status: "paid",
  paymentStatus: "succeeded",
  currency: "CAD",
  lineItems: [
    {
      id: "qli_service",
      kind: "booking",
      referenceId: "bkg_1",
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
  paidAt: "2026-03-07T10:01:00.000Z",
  provisioning: [],
};

const baseService: CatalogService = {
  id: "svc_lhr",
  slug: "laser-hair-removal",
  variantSlug: "laser-hair-removal-full-body-60",
  categorySlug: "laser",
  locationSlug: "daysi-flagship",
  name: "Laser Hair Removal",
  shortDescription: "Flagship service",
  description: "Flagship service",
  durationMinutes: 60,
  bookable: true,
  price: {
    currency: "CAD",
    retailAmountCents: 29900,
    memberAmountCents: 24900,
    membershipRequired: false,
  },
  bookingPolicy: {
    cancellationWindowHours: 24,
    bufferMinutes: 15,
    requiresDeposit: false,
  },
  machineCapabilities: ["laser-hair-removal"],
  featureTags: [],
};

const baseMachine: MachineResource = {
  slug: "gentlemax-pro-a",
  name: "GentleMax Pro A",
  locationSlug: "daysi-flagship",
  capabilitySlugs: ["laser-hair-removal"],
  availability: [{ daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 17 * 60 }],
  blockedWindows: [],
};

const baseRoom: RoomResource = {
  slug: "treatment-suite-a",
  name: "Treatment Suite A",
  locationSlug: "daysi-flagship",
  capabilitySlugs: ["treatment-room"],
  availability: [{ daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 17 * 60 }],
  blockedWindows: [],
};

const baseBooking: BookingRecord = {
  id: "bkg_1",
  code: "BK-1",
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
  startAt: "2026-03-10T10:00:00.000Z",
  endAt: "2026-03-10T11:00:00.000Z",
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

describe("reporting domain", () => {
  it("separates education revenue from service revenue", () => {
    const report = buildRevenueSummaryReport({
      locationSlug: "daysi-flagship",
      orders: [
        baseOrder,
        {
          ...baseOrder,
          id: "ord_2",
          code: "ORD-2",
          lineItems: [
            {
              id: "qli_education",
              kind: "educationOffer",
              referenceId: "signature-laser-method",
              description: "Daysi Signature Laser Method",
              quantity: 1,
              unitAmount: { currency: "CAD", amountCents: 49900 },
              subtotalAmount: { currency: "CAD", amountCents: 49900 },
              discountAmount: { currency: "CAD", amountCents: 5000 },
              appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
              finalAmount: { currency: "CAD", amountCents: 44900 },
              appliedCouponCodes: ["WELCOME10"],
              revenueStream: "education",
            },
          ],
          appliedCoupons: [
            {
              code: "WELCOME10",
              name: "Welcome 10",
              discountAmount: { currency: "CAD", amountCents: 5000 },
              appliedLineItemIds: ["qli_education"],
            },
          ],
          appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
          subtotalAmount: { currency: "CAD", amountCents: 49900 },
          discountAmount: { currency: "CAD", amountCents: 5000 },
          totalAmount: { currency: "CAD", amountCents: 44900 },
          revenueBreakdown: [
            {
              revenueStream: "education",
              amount: { currency: "CAD", amountCents: 44900 },
            },
          ],
        },
      ],
    });

    expect(report.streams).toHaveLength(2);
    expect(report.streams.find((stream) => stream.revenueStream === "services")?.netAmount.amountCents).toBe(29900);
    expect(report.streams.find((stream) => stream.revenueStream === "education")?.discountAmount.amountCents).toBe(5000);
    expect(report.totals.netAmount.amountCents).toBe(74800);
  });

  it("builds membership performance across plan mix, revenue, and allowance usage", () => {
    const plans: MembershipPlan[] = [
      {
        id: "mplan_glow",
        slug: "glow-membership",
        locationSlug: "daysi-flagship",
        name: "Glow Membership",
        description: "Core recurring service membership",
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
      },
      {
        id: "mplan_education",
        slug: "education-membership",
        locationSlug: "daysi-flagship",
        name: "Education Membership",
        description: "Education access",
        billingInterval: "month",
        price: {
          currency: "CAD",
          amountCents: 19900,
        },
        educationOnly: true,
        entitlements: {
          includedServiceSlugs: [],
          educationOfferSlugs: ["signature-laser-method"],
          monthlyServiceCredits: [],
          memberDiscountPercent: 0,
        },
      },
    ];
    const subscriptions: MembershipSubscription[] = [
      {
        id: "msub_glow_1",
        planSlug: "glow-membership",
        locationSlug: "daysi-flagship",
        status: "active",
        actorUserId: "usr_glow_1",
        customerEmail: "glow@example.com",
        customerName: "Glow Member",
        sourceOrderId: "ord_glow_plan",
        createdAt: "2026-03-07T10:00:00.000Z",
        activatedAt: "2026-03-07T10:05:00.000Z",
      },
      {
        id: "msub_edu_1",
        planSlug: "education-membership",
        locationSlug: "daysi-flagship",
        status: "cancelled",
        actorUserId: "usr_edu_1",
        customerEmail: "edu@example.com",
        customerName: "Education Member",
        sourceOrderId: "ord_edu_plan",
        createdAt: "2026-03-07T11:00:00.000Z",
        activatedAt: "2026-03-07T11:05:00.000Z",
        cancelledAt: "2026-03-08T11:00:00.000Z",
      },
    ];
    const usageRecords: MembershipUsageRecord[] = [
      {
        id: "muse_1",
        subscriptionId: "msub_glow_1",
        planSlug: "glow-membership",
        serviceSlug: "skin-rejuvenation",
        bookingId: "bkg_1",
        quantity: 1,
        sourceOrderId: "ord_usage_1",
        status: "consumed",
        createdAt: "2026-03-08T10:10:00.000Z",
      },
    ];
    const membershipOrders: OrderRecord[] = [
      {
        ...baseOrder,
        id: "ord_glow_plan",
        code: "ORD-GLOW-1",
        lineItems: [
          {
            id: "qli_glow_plan",
            kind: "membershipPlan",
            referenceId: "glow-membership",
            description: "Glow Membership",
            quantity: 1,
            unitAmount: { currency: "CAD", amountCents: 12900 },
            subtotalAmount: { currency: "CAD", amountCents: 12900 },
            discountAmount: { currency: "CAD", amountCents: 0 },
            appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
            finalAmount: { currency: "CAD", amountCents: 12900 },
            appliedCouponCodes: [],
            revenueStream: "memberships",
          },
        ],
        subtotalAmount: { currency: "CAD", amountCents: 12900 },
        totalAmount: { currency: "CAD", amountCents: 12900 },
        revenueBreakdown: [
          {
            revenueStream: "memberships",
            amount: { currency: "CAD", amountCents: 12900 },
          },
        ],
      },
      {
        ...baseOrder,
        id: "ord_edu_plan",
        code: "ORD-EDU-1",
        status: "refunded",
        lineItems: [
          {
            id: "qli_edu_plan",
            kind: "membershipPlan",
            referenceId: "education-membership",
            description: "Education Membership",
            quantity: 1,
            unitAmount: { currency: "CAD", amountCents: 19900 },
            subtotalAmount: { currency: "CAD", amountCents: 19900 },
            discountAmount: { currency: "CAD", amountCents: 0 },
            appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
            finalAmount: { currency: "CAD", amountCents: 19900 },
            appliedCouponCodes: [],
            revenueStream: "memberships",
          },
        ],
        subtotalAmount: { currency: "CAD", amountCents: 19900 },
        totalAmount: { currency: "CAD", amountCents: 19900 },
        refundedAt: "2026-03-08T11:00:00.000Z",
        revenueBreakdown: [
          {
            revenueStream: "memberships",
            amount: { currency: "CAD", amountCents: 19900 },
          },
        ],
      },
    ];

    const report = buildMembershipPerformanceReport({
      locationSlug: "daysi-flagship",
      orders: membershipOrders,
      plans,
      subscriptions,
      usageRecords,
    });

    expect(report.totals.totalSubscriptions).toBe(2);
    expect(report.totals.activeSubscriptionCount).toBe(1);
    expect(report.totals.cancelledSubscriptionCount).toBe(1);
    expect(report.totals.activeRecurringAmount.amountCents).toBe(12900);
    expect(report.totals.netMembershipRevenueAmount.amountCents).toBe(12900);
    expect(report.totals.refundedMembershipRevenueAmount.amountCents).toBe(19900);
    expect(report.totals.serviceAllowanceTotalQuantity).toBe(1);
    expect(report.totals.serviceAllowanceUsedQuantity).toBe(1);
    expect(report.plans.find((plan) => plan.planSlug === "glow-membership")?.serviceAllowanceRemainingQuantity).toBe(0);
  });

  it("builds operations performance across service conversion and machine utilization", () => {
    const metricEvents: OperationalMetricEventRecord[] = [
      {
        id: "omet_search_1",
        eventType: "availability_search",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        occurredAt: "2026-03-08T09:00:00.000Z",
        metadata: {},
      },
      {
        id: "omet_search_2",
        eventType: "availability_search",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        occurredAt: "2026-03-08T09:30:00.000Z",
        metadata: {},
      },
      {
        id: "omet_waitlist_1",
        eventType: "waitlist_created",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        referenceId: "wl_1",
        occurredAt: "2026-03-08T09:45:00.000Z",
        metadata: {},
      },
      {
        id: "omet_booking_1",
        eventType: "booking_created",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        machineSlug: "gentlemax-pro-a",
        providerSlug: "ava-chen",
        referenceId: "bkg_1",
        occurredAt: "2026-03-08T10:00:00.000Z",
        metadata: {},
      },
      {
        id: "omet_paid_1",
        eventType: "booking_paid",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        machineSlug: "gentlemax-pro-a",
        providerSlug: "ava-chen",
        referenceId: "bkg_1",
        sourceOrderId: "ord_1",
        occurredAt: "2026-03-08T10:05:00.000Z",
        metadata: {
          amountCents: 29900,
        },
      },
    ];

    const report = buildOperationsPerformanceReport({
      locationSlug: "daysi-flagship",
      fromDate: "2026-03-08",
      toDate: "2026-03-10",
      services: [baseService],
      machines: [baseMachine],
      rooms: [],
      bookings: [baseBooking],
      orders: [baseOrder],
      metricEvents,
    });

    expect(report.conversion.searchCount).toBe(2);
    expect(report.conversion.waitlistCount).toBe(1);
    expect(report.conversion.bookingCreatedCount).toBe(1);
    expect(report.conversion.paidBookingCount).toBe(1);
    expect(report.conversion.paidServiceRevenueAmount.amountCents).toBe(29900);
    expect(report.conversion.searchToBookingRate).toBe(50);
    expect(report.services[0]?.serviceSlug).toBe("laser-hair-removal");
    expect(report.services[0]?.searchCount).toBe(2);
    expect(report.services[0]?.paidBookingCount).toBe(1);
    expect(report.machines[0]?.machineSlug).toBe("gentlemax-pro-a");
    expect(report.machines[0]?.bookingCount).toBe(1);
    expect(report.machines[0]?.bookedMinutes).toBe(60);
    expect(report.machines[0]?.paidServiceRevenueAmount.amountCents).toBe(29900);
    expect(report.rooms).toHaveLength(0);
  });

  it("builds room performance for room-backed bookings", () => {
    const roomBackedService: CatalogService = {
      ...baseService,
      slug: "skin-rejuvenation",
      variantSlug: "skin-rejuvenation-photofacial-45",
      name: "Skin Rejuvenation",
      durationMinutes: 45,
      price: {
        currency: "CAD",
        retailAmountCents: 23900,
        memberAmountCents: 19900,
        membershipRequired: false,
      },
      machineCapabilities: ["skin-rejuvenation"],
      roomCapabilities: ["treatment-room"],
    };
    const roomBackedMachine: MachineResource = {
      ...baseMachine,
      slug: "lasemd-ultra-a",
      name: "LaseMD Ultra A",
      capabilitySlugs: ["skin-rejuvenation"],
    };
    const roomBackedBooking: BookingRecord = {
      ...baseBooking,
      id: "bkg_room_1",
      serviceSlug: "skin-rejuvenation",
      serviceVariantSlug: "skin-rejuvenation-photofacial-45",
      serviceName: "Skin Rejuvenation",
      machineSlug: "lasemd-ultra-a",
      machineName: "LaseMD Ultra A",
      roomSlug: "treatment-suite-a",
      roomName: "Treatment Suite A",
      startAt: "2026-03-10T13:00:00.000Z",
      endAt: "2026-03-10T13:45:00.000Z",
      charge: {
        currency: "CAD",
        retailAmountCents: 23900,
        memberAmountCents: 19900,
        finalAmountCents: 23900,
        membershipRequired: false,
        appliedPricingMode: "retail",
      },
    };
    const roomBackedOrder: OrderRecord = {
      ...baseOrder,
      id: "ord_room_1",
      code: "ORD-ROOM-1",
      lineItems: [
        {
          id: "qli_room_service",
          kind: "booking",
          referenceId: "bkg_room_1",
          description: "Skin Rejuvenation booking",
          quantity: 1,
          unitAmount: { currency: "CAD", amountCents: 23900 },
          subtotalAmount: { currency: "CAD", amountCents: 23900 },
          discountAmount: { currency: "CAD", amountCents: 0 },
          appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
          finalAmount: { currency: "CAD", amountCents: 23900 },
          appliedCouponCodes: [],
          revenueStream: "services",
        },
      ],
      subtotalAmount: { currency: "CAD", amountCents: 23900 },
      totalAmount: { currency: "CAD", amountCents: 23900 },
      revenueBreakdown: [
        {
          revenueStream: "services",
          amount: { currency: "CAD", amountCents: 23900 },
        },
      ],
    };
    const metricEvents: OperationalMetricEventRecord[] = [
      {
        id: "omet_room_booking_1",
        eventType: "booking_created",
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        machineSlug: "lasemd-ultra-a",
        providerSlug: "ava-chen",
        referenceId: "bkg_room_1",
        occurredAt: "2026-03-10T13:00:00.000Z",
        metadata: {
          roomSlug: "treatment-suite-a",
        },
      },
      {
        id: "omet_room_paid_1",
        eventType: "booking_paid",
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        machineSlug: "lasemd-ultra-a",
        providerSlug: "ava-chen",
        referenceId: "bkg_room_1",
        sourceOrderId: "ord_room_1",
        occurredAt: "2026-03-10T13:05:00.000Z",
        metadata: {
          amountCents: 23900,
          roomSlug: "treatment-suite-a",
        },
      },
    ];

    const report = buildOperationsPerformanceReport({
      locationSlug: "daysi-flagship",
      fromDate: "2026-03-08",
      toDate: "2026-03-10",
      services: [roomBackedService],
      machines: [roomBackedMachine],
      rooms: [baseRoom],
      bookings: [roomBackedBooking],
      orders: [roomBackedOrder],
      metricEvents,
    });

    expect(report.rooms[0]?.roomSlug).toBe("treatment-suite-a");
    expect(report.rooms[0]?.bookingCount).toBe(1);
    expect(report.rooms[0]?.bookedMinutes).toBe(45);
    expect(report.rooms[0]?.paidServiceRevenueAmount.amountCents).toBe(23900);
  });

  it("builds treatment-plan performance as a created cohort funnel", () => {
    const skinService: CatalogService = {
      ...baseService,
      slug: "skin-rejuvenation",
      variantSlug: "skin-rejuvenation-photofacial-45",
      categorySlug: "skin",
      name: "Skin Rejuvenation",
      durationMinutes: 45,
      price: {
        currency: "CAD",
        retailAmountCents: 23900,
        memberAmountCents: 19900,
        membershipRequired: false,
      },
      machineCapabilities: ["skin-rejuvenation"],
      featureTags: ["photofacial"],
    };
    const treatmentPlans: TreatmentPlanRecord[] = [
      {
        id: "tplan_1",
        locationSlug: "daysi-flagship",
        customerEmail: "plan1@example.com",
        sourceAssessmentId: "srec_tp_1",
        sourceAiRunId: "airun_tp_1",
        status: "accepted",
        summary: "Accepted corrective plan",
        dominantConcernKeys: ["pigmentation"],
        recommendedServiceSlugs: ["skin-rejuvenation"],
        unresolvedRecommendedServiceSlugs: [],
        lines: [
          {
            serviceSlug: "skin-rejuvenation",
            serviceName: "Skin Rejuvenation",
            rationale: "Best corrective fit",
            retailAmountCents: 23900,
            memberAmountCents: 19900,
            durationMinutes: 45,
            priority: 1,
          },
        ],
        nextActions: ["Book a photofacial"],
        createdAt: "2026-03-08T09:00:00.000Z",
        updatedAt: "2026-03-08T09:30:00.000Z",
        sharedAt: "2026-03-08T09:10:00.000Z",
        acceptedAt: "2026-03-08T09:20:00.000Z",
      },
      {
        id: "tplan_2",
        locationSlug: "daysi-flagship",
        customerEmail: "plan2@example.com",
        sourceAssessmentId: "srec_tp_2",
        sourceAiRunId: "airun_tp_2",
        status: "shared",
        summary: "Shared hair-removal plan",
        dominantConcernKeys: ["hair"],
        recommendedServiceSlugs: ["laser-hair-removal"],
        unresolvedRecommendedServiceSlugs: [],
        lines: [
          {
            serviceSlug: "laser-hair-removal",
            serviceName: "Laser Hair Removal",
            rationale: "High-intent hair reduction path",
            retailAmountCents: 29900,
            memberAmountCents: 24900,
            durationMinutes: 60,
            priority: 1,
          },
        ],
        nextActions: ["Review pricing"],
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:05:00.000Z",
        sharedAt: "2026-03-08T10:05:00.000Z",
      },
      {
        id: "tplan_3",
        locationSlug: "daysi-flagship",
        customerEmail: "plan3@example.com",
        sourceAssessmentId: "srec_tp_3",
        sourceAiRunId: "airun_tp_3",
        status: "draft",
        summary: "Draft corrective plan",
        dominantConcernKeys: ["texture"],
        recommendedServiceSlugs: ["skin-rejuvenation"],
        unresolvedRecommendedServiceSlugs: [],
        lines: [
          {
            serviceSlug: "skin-rejuvenation",
            serviceName: "Skin Rejuvenation",
            rationale: "Tone and texture follow-up",
            retailAmountCents: 23900,
            memberAmountCents: 19900,
            durationMinutes: 45,
            priority: 1,
          },
        ],
        nextActions: ["Share plan"],
        createdAt: "2026-03-08T11:00:00.000Z",
        updatedAt: "2026-03-08T11:00:00.000Z",
      },
    ];
    const bookings: BookingRecord[] = [
      {
        ...baseBooking,
        id: "bkg_tp_1",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        serviceName: "Skin Rejuvenation",
        sourceAssessmentId: "srec_tp_1",
        sourceTreatmentPlanId: "tplan_1",
        createdAt: "2026-03-08T09:40:00.000Z",
        machineSlug: "gentlemax-pro-a",
        machineName: "GentleMax Pro A",
      },
    ];
    const orders: OrderRecord[] = [
      {
        ...baseOrder,
        id: "ord_tp_1",
        code: "ORD-TP-1",
        paidAt: "2026-03-08T09:50:00.000Z",
        lineItems: [
          {
            id: "qli_tp_booking_1",
            kind: "booking",
            referenceId: "bkg_tp_1",
            description: "Skin Rejuvenation booking",
            quantity: 1,
            unitAmount: { currency: "CAD", amountCents: 23900 },
            subtotalAmount: { currency: "CAD", amountCents: 23900 },
            discountAmount: { currency: "CAD", amountCents: 0 },
            appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
            finalAmount: { currency: "CAD", amountCents: 23900 },
            appliedCouponCodes: [],
            revenueStream: "services",
          },
        ],
        subtotalAmount: { currency: "CAD", amountCents: 23900 },
        totalAmount: { currency: "CAD", amountCents: 23900 },
        revenueBreakdown: [
          {
            revenueStream: "services",
            amount: { currency: "CAD", amountCents: 23900 },
          },
        ],
      },
    ];

    const report = buildTreatmentPlanPerformanceReport({
      locationSlug: "daysi-flagship",
      fromDate: "2026-03-08",
      toDate: "2026-03-08",
      services: [baseService, skinService],
      treatmentPlans,
      bookings,
      orders,
    });

    expect(report.funnel.createdCount).toBe(3);
    expect(report.funnel.sharedCount).toBe(2);
    expect(report.funnel.acceptedCount).toBe(1);
    expect(report.funnel.bookedCount).toBe(1);
    expect(report.funnel.paidCount).toBe(1);
    expect(report.funnel.paidRevenueAmount.amountCents).toBe(23900);
    expect(report.funnel.createdToPaidRate).toBe(33.33);
    expect(report.services[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(report.services[0]?.createdCount).toBe(2);
    expect(report.services[0]?.sharedCount).toBe(1);
    expect(report.services[0]?.acceptedCount).toBe(1);
    expect(report.services[0]?.bookedCount).toBe(1);
    expect(report.services[0]?.paidCount).toBe(1);
    expect(report.services[0]?.paidRevenueAmount.amountCents).toBe(23900);
    expect(
      report.services.find((line) => line.serviceSlug === "laser-hair-removal")?.sharedCount,
    ).toBe(1);
    expect(
      report.services.find((line) => line.serviceSlug === "laser-hair-removal")?.paidCount,
    ).toBe(0);
  });

  it("builds cross-location benchmark rollups with ranks and peer averages", () => {
    const organizations: TenantOrganization[] = [
      {
        id: "org_daysi",
        slug: "daysi",
        name: "Daysi Corporate",
        operatingMode: "corporate",
      },
    ];
    const locations: TenantLocation[] = [
      {
        id: "loc_flagship",
        slug: "daysi-flagship",
        name: "Daysi Flagship",
        organizationId: "org_daysi",
        enabledModules: ["memberships", "skinAnalysis"],
      },
      {
        id: "loc_west",
        slug: "daysi-west",
        name: "Daysi West",
        organizationId: "org_daysi",
        enabledModules: ["memberships", "skinAnalysis"],
      },
    ];
    const westService: CatalogService = {
      ...baseService,
      id: "svc_west",
      slug: "laser-resurfacing",
      variantSlug: "laser-resurfacing-60",
      locationSlug: "daysi-west",
      name: "Laser Resurfacing",
      price: {
        currency: "CAD",
        retailAmountCents: 34900,
        memberAmountCents: 30900,
        membershipRequired: false,
      },
      machineCapabilities: ["laser-resurfacing"],
    };
    const westMachine: MachineResource = {
      ...baseMachine,
      slug: "co2-west-a",
      name: "CO2 West A",
      locationSlug: "daysi-west",
      capabilitySlugs: ["laser-resurfacing"],
    };
    const bookings: BookingRecord[] = [
      {
        ...baseBooking,
        id: "bkg_flagship_benchmark",
        createdAt: "2026-03-08T10:00:00.000Z",
      },
      {
        ...baseBooking,
        id: "bkg_west_benchmark",
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        serviceVariantSlug: "laser-resurfacing-60",
        serviceName: "Laser Resurfacing",
        providerSlug: "noor-ali",
        providerName: "Noor Ali",
        machineSlug: "co2-west-a",
        machineName: "CO2 West A",
        charge: {
          currency: "CAD",
          retailAmountCents: 34900,
          memberAmountCents: 30900,
          finalAmountCents: 34900,
          membershipRequired: false,
          appliedPricingMode: "retail",
        },
        startAt: "2026-03-10T12:00:00.000Z",
        endAt: "2026-03-10T13:00:00.000Z",
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:00:00.000Z",
      },
    ];
    const orders: OrderRecord[] = [
      {
        ...baseOrder,
        paidAt: "2026-03-08T10:05:00.000Z",
      },
      {
        ...baseOrder,
        id: "ord_west_benchmark",
        code: "ORD-WEST-BENCH",
        locationSlug: "daysi-west",
        paidAt: "2026-03-08T12:05:00.000Z",
        lineItems: [
          {
            id: "qli_west_benchmark",
            kind: "booking",
            referenceId: "bkg_west_benchmark",
            description: "Laser Resurfacing booking",
            quantity: 1,
            unitAmount: { currency: "CAD", amountCents: 34900 },
            subtotalAmount: { currency: "CAD", amountCents: 34900 },
            discountAmount: { currency: "CAD", amountCents: 0 },
            appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
            finalAmount: { currency: "CAD", amountCents: 34900 },
            appliedCouponCodes: [],
            revenueStream: "services",
          },
        ],
        subtotalAmount: { currency: "CAD", amountCents: 34900 },
        totalAmount: { currency: "CAD", amountCents: 34900 },
        revenueBreakdown: [
          {
            revenueStream: "services",
            amount: { currency: "CAD", amountCents: 34900 },
          },
        ],
      },
    ];
    const metricEvents: OperationalMetricEventRecord[] = [
      {
        id: "omet_flagship_search",
        eventType: "availability_search",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        occurredAt: "2026-03-08T09:00:00.000Z",
        metadata: {},
      },
      {
        id: "omet_flagship_paid",
        eventType: "booking_paid",
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        machineSlug: "gentlemax-pro-a",
        providerSlug: "ava-chen",
        referenceId: "bkg_1",
        sourceOrderId: "ord_1",
        occurredAt: "2026-03-08T10:05:00.000Z",
        metadata: {
          amountCents: 29900,
        },
      },
      {
        id: "omet_west_search_1",
        eventType: "availability_search",
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        occurredAt: "2026-03-08T11:00:00.000Z",
        metadata: {},
      },
      {
        id: "omet_west_search_2",
        eventType: "availability_search",
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        occurredAt: "2026-03-08T11:30:00.000Z",
        metadata: {},
      },
      {
        id: "omet_west_paid",
        eventType: "booking_paid",
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        machineSlug: "co2-west-a",
        providerSlug: "noor-ali",
        referenceId: "bkg_west_benchmark",
        sourceOrderId: "ord_west_benchmark",
        occurredAt: "2026-03-08T12:05:00.000Z",
        metadata: {
          amountCents: 34900,
        },
      },
    ];
    const membershipPlans: MembershipPlan[] = [
      {
        id: "mplan_west",
        slug: "west-glow-membership",
        locationSlug: "daysi-west",
        name: "West Glow Membership",
        description: "West recurring plan",
        billingInterval: "month",
        price: {
          currency: "CAD",
          amountCents: 15900,
        },
        educationOnly: false,
        entitlements: {
          includedServiceSlugs: [],
          educationOfferSlugs: [],
          monthlyServiceCredits: [],
          memberDiscountPercent: 10,
        },
      },
    ];
    const membershipSubscriptions: MembershipSubscription[] = [
      {
        id: "msub_west",
        planSlug: "west-glow-membership",
        locationSlug: "daysi-west",
        status: "active",
        actorUserId: "usr_west_member",
        customerEmail: "west.member@example.com",
        customerName: "West Member",
        sourceOrderId: "ord_west_membership",
        createdAt: "2026-03-08T08:00:00.000Z",
        activatedAt: "2026-03-08T08:05:00.000Z",
      },
    ];
    const treatmentPlans: TreatmentPlanRecord[] = [
      {
        id: "tplan_west",
        locationSlug: "daysi-west",
        customerEmail: "west.plan@example.com",
        sourceAssessmentId: "srec_west",
        sourceAiRunId: "airun_west",
        status: "accepted",
        summary: "West plan",
        dominantConcernKeys: ["texture"],
        recommendedServiceSlugs: ["laser-resurfacing"],
        unresolvedRecommendedServiceSlugs: [],
        lines: [
          {
            serviceSlug: "laser-resurfacing",
            serviceName: "Laser Resurfacing",
            rationale: "Best west fit",
            retailAmountCents: 34900,
            memberAmountCents: 30900,
            durationMinutes: 60,
            priority: 1,
          },
        ],
        nextActions: ["Book resurfacing"],
        createdAt: "2026-03-08T09:00:00.000Z",
        updatedAt: "2026-03-08T09:30:00.000Z",
        sharedAt: "2026-03-08T09:10:00.000Z",
        acceptedAt: "2026-03-08T09:20:00.000Z",
      },
    ];
    const skinAssessments: SkinAssessmentRecord[] = [
      {
        id: "srec_west",
        rawIntakeId: "sai_west",
        sourceApp: "skin-analyzer",
        eventId: "evt_west",
        locationSlug: "daysi-west",
        externalAssessmentId: "assessment_west",
        customerEmail: "west.plan@example.com",
        capturedAt: "2026-03-08T08:45:00.000Z",
        receivedAt: "2026-03-08T08:46:00.000Z",
        summary: "West corrective path",
        confidenceScore: 90,
        concerns: [
          {
            key: "texture",
            label: "Texture",
            severityScore: 82,
          },
        ],
        dominantConcernKeys: ["texture"],
        treatmentGoals: ["resurfacing"],
        contraindications: [],
        recommendedServiceSlugs: ["laser-resurfacing"],
        unresolvedRecommendedServiceSlugs: [],
        images: [],
        imageCount: 0,
        signals: {},
      },
    ];

    const report = buildMultiLocationBenchmarkReport({
      fromDate: "2026-03-08",
      toDate: "2026-03-08",
      locations,
      organizations,
      organization: organizations[0],
      services: [baseService, westService],
      machines: [baseMachine, westMachine],
      rooms: [],
      orders,
      bookings,
      metricEvents,
      membershipPlans,
      membershipSubscriptions,
      membershipUsageRecords: [],
      treatmentPlans,
      skinAssessments,
    });

    expect(report.organization?.id).toBe("org_daysi");
    expect(report.totals.locationCount).toBe(2);
    expect(report.totals.netRevenueAmount.amountCents).toBe(64800);
    expect(report.peerAverages.averageNetRevenueAmount.amountCents).toBe(32400);
    expect(report.locations[0]?.locationSlug).toBe("daysi-west");
    expect(report.locations[0]?.revenueRank).toBe(1);
    expect(report.locations[0]?.activeRecurringRank).toBe(1);
    expect(report.locations[0]?.activeMembershipCount).toBe(1);
    expect(report.locations[0]?.peerDelta.peerLocationCount).toBe(1);
    expect(report.locations[0]?.peerDelta.netRevenueAmount.amountCents).toBe(5000);
    expect(report.locations[0]?.peerDelta.activeRecurringAmount.amountCents).toBe(15900);
    expect(report.locations[0]?.treatmentPlanPaidCount).toBe(0);
    expect(report.locations[1]?.locationSlug).toBe("daysi-flagship");
    expect(report.locations[1]?.revenueRank).toBe(2);
    expect(report.locations[1]?.peerDelta.netRevenueAmount.amountCents).toBe(-5000);
  });

  it("builds skin assessment performance across concern and recommendation trends", () => {
    const skinService: CatalogService = {
      ...baseService,
      slug: "skin-rejuvenation",
      variantSlug: "skin-rejuvenation-photofacial-45",
      categorySlug: "skin",
      name: "Skin Rejuvenation",
      durationMinutes: 45,
      price: {
        currency: "CAD",
        retailAmountCents: 23900,
        memberAmountCents: 19900,
        membershipRequired: false,
      },
      machineCapabilities: ["skin-rejuvenation"],
      featureTags: ["photofacial"],
    };
    const assessments: SkinAssessmentRecord[] = [
      {
        id: "srec_rpt_1",
        rawIntakeId: "sai_rpt_1",
        sourceApp: "skin-analyzer",
        eventId: "evt_rpt_1",
        locationSlug: "daysi-flagship",
        externalAssessmentId: "assessment_rpt_1",
        customerEmail: "skin1@example.com",
        capturedAt: "2026-03-09T09:00:00.000Z",
        receivedAt: "2026-03-09T09:00:05.000Z",
        summary: "Pigmentation concern with a clear photofacial fit.",
        confidenceScore: 88,
        concerns: [
          {
            key: "pigmentation",
            label: "Pigmentation",
            severityScore: 90,
          },
        ],
        dominantConcernKeys: ["pigmentation"],
        treatmentGoals: ["tone correction"],
        contraindications: [],
        recommendedServiceSlugs: ["skin-rejuvenation"],
        unresolvedRecommendedServiceSlugs: ["external-service"],
        images: [],
        imageCount: 1,
        signals: {},
      },
      {
        id: "srec_rpt_2",
        rawIntakeId: "sai_rpt_2",
        sourceApp: "skin-analyzer",
        eventId: "evt_rpt_2",
        locationSlug: "daysi-flagship",
        externalAssessmentId: "assessment_rpt_2",
        customerEmail: "skin2@example.com",
        capturedAt: "2026-03-10T09:00:00.000Z",
        receivedAt: "2026-03-10T09:00:05.000Z",
        summary: "Texture and pigmentation concerns detected.",
        confidenceScore: 72,
        concerns: [
          {
            key: "pigmentation",
            label: "Pigmentation",
            severityScore: 72,
          },
          {
            key: "texture",
            label: "Texture",
            severityScore: 64,
          },
        ],
        dominantConcernKeys: ["pigmentation", "texture"],
        treatmentGoals: ["brightening"],
        contraindications: [],
        recommendedServiceSlugs: ["skin-rejuvenation"],
        unresolvedRecommendedServiceSlugs: [],
        images: [],
        imageCount: 0,
        signals: {},
      },
    ];

    const report = buildSkinAssessmentPerformanceReport({
      locationSlug: "daysi-flagship",
      fromDate: "2026-03-08",
      toDate: "2026-03-11",
      services: [skinService],
      assessments,
      bookings: [
        {
          ...baseBooking,
          id: "bkg_skin_attr_1",
          serviceSlug: "skin-rejuvenation",
          serviceVariantSlug: "skin-rejuvenation-photofacial-45",
          serviceName: "Skin Rejuvenation",
          sourceAssessmentId: "srec_rpt_1",
          createdAt: "2026-03-09T10:00:00.000Z",
          machineSlug: "gentlemax-pro-a",
          machineName: "GentleMax Pro A",
        },
      ],
      orders: [
        {
          ...baseOrder,
          id: "ord_skin_attr_1",
          code: "ORD-SKIN-ATTR-1",
          paidAt: "2026-03-09T10:05:00.000Z",
          lineItems: [
            {
              id: "qli_skin_attr_1",
              kind: "booking",
              referenceId: "bkg_skin_attr_1",
              description: "Skin Rejuvenation booking",
              quantity: 1,
              unitAmount: { currency: "CAD", amountCents: 23900 },
              subtotalAmount: { currency: "CAD", amountCents: 23900 },
              discountAmount: { currency: "CAD", amountCents: 0 },
              appliedAccountCreditAmount: { currency: "CAD", amountCents: 0 },
              finalAmount: { currency: "CAD", amountCents: 23900 },
              appliedCouponCodes: [],
              revenueStream: "services",
            },
          ],
          subtotalAmount: { currency: "CAD", amountCents: 23900 },
          totalAmount: { currency: "CAD", amountCents: 23900 },
          revenueBreakdown: [
            {
              revenueStream: "services",
              amount: { currency: "CAD", amountCents: 23900 },
            },
          ],
        },
      ],
    });

    expect(report.assessmentCount).toBe(2);
    expect(report.uniqueCustomerCount).toBe(2);
    expect(report.withImagesCount).toBe(1);
    expect(report.averageConfidenceScore).toBe(80);
    expect(report.attributedBookingCount).toBe(1);
    expect(report.attributedPaidBookingCount).toBe(1);
    expect(report.attributedPaidRevenueAmount.amountCents).toBe(23900);
    expect(report.assessmentToBookingRate).toBe(50);
    expect(report.concerns[0]?.concernKey).toBe("pigmentation");
    expect(report.concerns[0]?.highSeverityCount).toBe(1);
    expect(report.recommendedServices[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(report.recommendedServices[0]?.recommendationCount).toBe(2);
    expect(report.unresolvedRecommendations[0]?.serviceSlug).toBe("external-service");
  });
});
