import type { MachineResource, RoomResource } from "./availability";
import type { OperationalMetricEventRecord } from "./analytics";
import type { BookingRecord } from "./bookings";
import type { OrderRecord, RevenueStream } from "./commerce";
import type { CatalogService } from "./catalog";
import {
  buildRemainingServiceAllowances,
  type MembershipPlan,
  type MembershipSubscription,
  type MembershipUsageRecord,
} from "./memberships";
import type { ProviderPayoutRun } from "./provider-ops";
import type {
  ReferralProgram,
  ReferralRelationship,
  ReferralRewardEvent,
} from "./referrals";
import type { SkinAssessmentRecord } from "./skin-assessments";
import type {
  TenantLocation,
  TenantOrganization,
  OrganizationOperatingMode,
} from "./tenanting";
import type { TreatmentPlanRecord } from "./treatment-plans";

const revenueStreamOrder: RevenueStream[] = [
  "services",
  "memberships",
  "packages",
  "retail",
  "education",
];

export interface RevenueSummaryLine {
  revenueStream: RevenueStream;
  grossAmount: {
    currency: string;
    amountCents: number;
  };
  discountAmount: {
    currency: string;
    amountCents: number;
  };
  netAmount: {
    currency: string;
    amountCents: number;
  };
  refundedAmount: {
    currency: string;
    amountCents: number;
  };
  orderCount: number;
}

export interface RevenueSummaryReport {
  currency: string;
  streams: RevenueSummaryLine[];
  totals: {
    grossAmount: {
      currency: string;
      amountCents: number;
    };
    discountAmount: {
      currency: string;
      amountCents: number;
    };
    netAmount: {
      currency: string;
      amountCents: number;
    };
    refundedAmount: {
      currency: string;
      amountCents: number;
    };
    orderCount: number;
  };
}

export interface LocationFinanceDashboard {
  locationSlug: string;
  currency: string;
  streams: RevenueSummaryLine[];
  totals: RevenueSummaryReport["totals"];
  totalPayoutAmountCents: number;
  draftPayoutAmountCents: number;
  approvedPayoutAmountCents: number;
  paidPayoutAmountCents: number;
  payoutRunCount: number;
  latestPayoutRunStatus?: ProviderPayoutRun["status"];
}

export interface ReferralPerformanceReport {
  locationSlug: string;
  currency: string;
  programCount: number;
  activeProgramCount: number;
  relationshipCount: number;
  qualifiedRelationshipCount: number;
  rewardEventCount: number;
  totalRewardAmount: {
    currency: string;
    amountCents: number;
  };
  totalQualifiedRevenueAmount: {
    currency: string;
    amountCents: number;
  };
}

export interface MembershipPlanPerformanceLine {
  planSlug: string;
  planName: string;
  educationOnly: boolean;
  totalSubscriptions: number;
  activeSubscriptionCount: number;
  pendingSubscriptionCount: number;
  cancelledSubscriptionCount: number;
  activeRecurringAmount: {
    currency: string;
    amountCents: number;
  };
  grossMembershipRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  netMembershipRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  refundedMembershipRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  serviceAllowanceTotalQuantity: number;
  serviceAllowanceUsedQuantity: number;
  serviceAllowanceRemainingQuantity: number;
}

export interface MembershipPerformanceReport {
  locationSlug: string;
  currency: string;
  plans: MembershipPlanPerformanceLine[];
  totals: {
    totalSubscriptions: number;
    activeSubscriptionCount: number;
    pendingSubscriptionCount: number;
    cancelledSubscriptionCount: number;
    educationOnlyActiveSubscriptionCount: number;
    serviceMembershipActiveSubscriptionCount: number;
    activeRecurringAmount: {
      currency: string;
      amountCents: number;
    };
    grossMembershipRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    netMembershipRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    refundedMembershipRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    serviceAllowanceTotalQuantity: number;
    serviceAllowanceUsedQuantity: number;
    serviceAllowanceRemainingQuantity: number;
  };
}

export interface OperationsConversionSummary {
  searchCount: number;
  waitlistCount: number;
  bookingCreatedCount: number;
  paidBookingCount: number;
  paidBookingOrderCount: number;
  paidServiceRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  searchToBookingRate: number;
  searchToPaidBookingRate: number;
}

export interface ServicePerformanceLine extends OperationsConversionSummary {
  serviceSlug: string;
  serviceName: string;
}

export interface MachinePerformanceLine {
  machineSlug: string;
  machineName: string;
  bookingCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
  paidServiceRevenueAmount: {
    currency: string;
    amountCents: number;
  };
}

export interface RoomPerformanceLine {
  roomSlug: string;
  roomName: string;
  bookingCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
  paidServiceRevenueAmount: {
    currency: string;
    amountCents: number;
  };
}

export interface TreatmentPlanFunnelSummary {
  createdCount: number;
  sharedCount: number;
  acceptedCount: number;
  bookedCount: number;
  paidCount: number;
  paidRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  createdToSharedRate: number;
  sharedToAcceptedRate: number;
  acceptedToBookedRate: number;
  bookedToPaidRate: number;
  createdToPaidRate: number;
}

export interface TreatmentPlanServicePerformanceLine extends TreatmentPlanFunnelSummary {
  serviceSlug: string;
  serviceName: string;
}

export interface TreatmentPlanPerformanceReport {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  currency: string;
  funnel: TreatmentPlanFunnelSummary;
  services: TreatmentPlanServicePerformanceLine[];
}

export interface MultiLocationBenchmarkLine {
  locationSlug: string;
  locationName: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  organizationOperatingMode: OrganizationOperatingMode;
  netRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  paidServiceRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  paidBookingCount: number;
  searchToPaidBookingRate: number;
  activeMembershipCount: number;
  activeRecurringAmount: {
    currency: string;
    amountCents: number;
  };
  treatmentPlanCreatedCount: number;
  treatmentPlanPaidCount: number;
  treatmentPlanCreatedToPaidRate: number;
  skinAssessmentCount: number;
  attributedSkinAssessmentRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  machineUtilizationPercent: number;
  revenueRank: number;
  conversionRank: number;
  activeRecurringRank: number;
  peerDelta: {
    peerLocationCount: number;
    netRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    paidServiceRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    searchToPaidBookingRate: number;
    activeMembershipCount: number;
    activeRecurringAmount: {
      currency: string;
      amountCents: number;
    };
    treatmentPlanCreatedToPaidRate: number;
    skinAssessmentCount: number;
    machineUtilizationPercent: number;
  };
}

export interface MultiLocationBenchmarkReport {
  organization?: {
    id: string;
    slug: string;
    name: string;
    operatingMode: OrganizationOperatingMode;
  };
  fromDate: string;
  toDate: string;
  currency: string;
  totals: {
    locationCount: number;
    netRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    paidServiceRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    paidBookingCount: number;
    activeMembershipCount: number;
    activeRecurringAmount: {
      currency: string;
      amountCents: number;
    };
    treatmentPlanCreatedCount: number;
    treatmentPlanPaidCount: number;
    skinAssessmentCount: number;
    attributedSkinAssessmentRevenueAmount: {
      currency: string;
      amountCents: number;
    };
  };
  peerAverages: {
    locationCount: number;
    averageNetRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    averagePaidServiceRevenueAmount: {
      currency: string;
      amountCents: number;
    };
    averagePaidBookingCount: number;
    averageSearchToPaidBookingRate: number;
    averageActiveMembershipCount: number;
    averageActiveRecurringAmount: {
      currency: string;
      amountCents: number;
    };
    averageTreatmentPlanCreatedToPaidRate: number;
    averageSkinAssessmentCount: number;
    averageMachineUtilizationPercent: number;
  };
  locations: MultiLocationBenchmarkLine[];
}

export interface OperationsPerformanceReport {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  currency: string;
  conversion: OperationsConversionSummary;
  services: ServicePerformanceLine[];
  machines: MachinePerformanceLine[];
  rooms: RoomPerformanceLine[];
}

export interface SkinAssessmentConcernPerformanceLine {
  concernKey: string;
  label: string;
  assessmentCount: number;
  averageSeverityScore: number;
  highSeverityCount: number;
}

export interface SkinAssessmentServiceRecommendationLine {
  serviceSlug: string;
  serviceName: string;
  recommendationCount: number;
  uniqueCustomerCount: number;
}

export interface SkinAssessmentUnresolvedRecommendationLine {
  serviceSlug: string;
  recommendationCount: number;
}

export interface SkinAssessmentPerformanceReport {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  assessmentCount: number;
  uniqueCustomerCount: number;
  withImagesCount: number;
  averageConfidenceScore: number | null;
  mappedRecommendationCount: number;
  unresolvedRecommendationCount: number;
  attributedBookingCount: number;
  attributedPaidBookingCount: number;
  attributedPaidRevenueAmount: {
    currency: string;
    amountCents: number;
  };
  assessmentToBookingRate: number;
  assessmentToPaidBookingRate: number;
  concerns: SkinAssessmentConcernPerformanceLine[];
  recommendedServices: SkinAssessmentServiceRecommendationLine[];
  unresolvedRecommendations: SkinAssessmentUnresolvedRecommendationLine[];
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const isWithinDateRange = (timestamp: string | undefined, fromDate: string, toDate: string): boolean =>
  !!timestamp && timestamp.slice(0, 10) >= fromDate && timestamp.slice(0, 10) <= toDate;

const isOnOrBeforeDate = (timestamp: string | undefined, toDate: string): boolean =>
  !!timestamp && timestamp.slice(0, 10) <= toDate;

const roundToTwo = (value: number): number => Number(value.toFixed(2));

const minutesBetween = (startAt: string, endAt: string): number =>
  Math.max(
    0,
    Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / (60 * 1000)),
  );

const availableMinutesForRange = (
  windows: MachineResource["availability"],
  fromDate: string,
  toDate: string,
): number => {
  const start = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);
  const totals: number[] = [];

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_IN_MS) {
    const date = new Date(current);
    const dayOfWeek = date.getUTCDay();
    totals.push(
      sum(
        windows
          .filter((window) => window.daysOfWeek.includes(dayOfWeek))
          .map((window) => window.endMinute - window.startMinute),
      ),
    );
  }

  return sum(totals);
};

export const buildRevenueSummaryReport = (input: {
  locationSlug: string;
  orders: OrderRecord[];
}): RevenueSummaryReport => {
  const orders = input.orders.filter((order) => order.locationSlug === input.locationSlug);
  const currency = orders[0]?.currency ?? "CAD";
  const streamOrderCounts = new Map<RevenueStream, Set<string>>();
  const streamTotals = new Map<
    RevenueStream,
    { gross: number; discount: number; net: number; refunded: number }
  >();

  for (const order of orders) {
    for (const lineItem of order.lineItems) {
      const nextTotals = streamTotals.get(lineItem.revenueStream) ?? {
        gross: 0,
        discount: 0,
        net: 0,
        refunded: 0,
      };

      nextTotals.gross += lineItem.subtotalAmount.amountCents;
      nextTotals.discount += lineItem.discountAmount.amountCents;

      if (order.status === "refunded") {
        nextTotals.refunded += lineItem.finalAmount.amountCents;
      } else if (order.status === "paid") {
        nextTotals.net += lineItem.finalAmount.amountCents;
      }

      streamTotals.set(lineItem.revenueStream, nextTotals);

      const orderIds = streamOrderCounts.get(lineItem.revenueStream) ?? new Set<string>();
      orderIds.add(order.id);
      streamOrderCounts.set(lineItem.revenueStream, orderIds);
    }
  }

  const streams = revenueStreamOrder
    .filter((revenueStream) => streamTotals.has(revenueStream))
    .map((revenueStream) => {
      const totals = streamTotals.get(revenueStream) ?? {
        gross: 0,
        discount: 0,
        net: 0,
        refunded: 0,
      };

      return {
        revenueStream,
        grossAmount: {
          currency,
          amountCents: totals.gross,
        },
        discountAmount: {
          currency,
          amountCents: totals.discount,
        },
        netAmount: {
          currency,
          amountCents: totals.net,
        },
        refundedAmount: {
          currency,
          amountCents: totals.refunded,
        },
        orderCount: streamOrderCounts.get(revenueStream)?.size ?? 0,
      };
    });

  return {
    currency,
    streams,
    totals: {
      grossAmount: {
        currency,
        amountCents: streams.reduce(
          (total, stream) => total + stream.grossAmount.amountCents,
          0,
        ),
      },
      discountAmount: {
        currency,
        amountCents: streams.reduce(
          (total, stream) => total + stream.discountAmount.amountCents,
          0,
        ),
      },
      netAmount: {
        currency,
        amountCents: streams.reduce((total, stream) => total + stream.netAmount.amountCents, 0),
      },
      refundedAmount: {
        currency,
        amountCents: streams.reduce(
          (total, stream) => total + stream.refundedAmount.amountCents,
          0,
        ),
      },
      orderCount: new Set(orders.map((order) => order.id)).size,
    },
  };
};

export const buildLocationFinanceDashboard = (input: {
  locationSlug: string;
  orders: OrderRecord[];
  payoutRuns: ProviderPayoutRun[];
}): LocationFinanceDashboard => {
  const revenue = buildRevenueSummaryReport({
    locationSlug: input.locationSlug,
    orders: input.orders,
  });
  const payoutRuns = input.payoutRuns
    .filter((payoutRun) => payoutRun.locationSlug === input.locationSlug)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const sumPayoutAmounts = (status?: ProviderPayoutRun["status"]): number =>
    payoutRuns
      .filter((payoutRun) => (status ? payoutRun.status === status : true))
      .reduce(
        (total, payoutRun) =>
          total +
          payoutRun.providerPayouts.reduce(
            (payoutTotal, payout) => payoutTotal + payout.totalPayoutAmountCents,
            0,
          ),
        0,
      );

  return {
    locationSlug: input.locationSlug,
    currency: revenue.currency,
    streams: revenue.streams,
    totals: revenue.totals,
    totalPayoutAmountCents: sumPayoutAmounts(),
    draftPayoutAmountCents: sumPayoutAmounts("draft"),
    approvedPayoutAmountCents: sumPayoutAmounts("approved"),
    paidPayoutAmountCents: sumPayoutAmounts("paid"),
    payoutRunCount: payoutRuns.length,
    latestPayoutRunStatus: payoutRuns[0]?.status,
  };
};

export const buildReferralPerformanceReport = (input: {
  locationSlug: string;
  orders: OrderRecord[];
  programs: ReferralProgram[];
  relationships: ReferralRelationship[];
  rewardEvents: ReferralRewardEvent[];
}): ReferralPerformanceReport => {
  const programs = input.programs.filter(
    (program) => program.locationSlug === input.locationSlug,
  );
  const relationships = input.relationships.filter(
    (relationship) => relationship.locationSlug === input.locationSlug,
  );
  const rewardEvents = input.rewardEvents.filter(
    (event) => event.locationSlug === input.locationSlug && event.status === "earned",
  );
  const qualifiedOrderIds = new Set(
    relationships
      .filter((relationship) => relationship.status === "qualified")
      .flatMap((relationship) =>
        relationship.firstQualifiedOrderId ? [relationship.firstQualifiedOrderId] : [],
      ),
  );
  const qualifyingOrders = input.orders.filter(
    (order) => order.status === "paid" && qualifiedOrderIds.has(order.id),
  );
  const currency =
    rewardEvents[0]?.reward.amount.currency ?? qualifyingOrders[0]?.currency ?? "CAD";

  return {
    locationSlug: input.locationSlug,
    currency,
    programCount: programs.length,
    activeProgramCount: programs.filter((program) => program.status === "active").length,
    relationshipCount: relationships.length,
    qualifiedRelationshipCount: relationships.filter(
      (relationship) => relationship.status === "qualified",
    ).length,
    rewardEventCount: rewardEvents.length,
    totalRewardAmount: {
      currency,
      amountCents: rewardEvents.reduce(
        (total, event) => total + event.reward.amount.amountCents,
        0,
      ),
    },
    totalQualifiedRevenueAmount: {
      currency,
      amountCents: qualifyingOrders.reduce(
        (total, order) => total + order.totalAmount.amountCents,
        0,
      ),
    },
  };
};

export const buildMembershipPerformanceReport = (input: {
  locationSlug: string;
  orders: OrderRecord[];
  plans: MembershipPlan[];
  subscriptions: MembershipSubscription[];
  usageRecords: MembershipUsageRecord[];
}): MembershipPerformanceReport => {
  const plans = input.plans.filter((plan) => plan.locationSlug === input.locationSlug);
  const subscriptions = input.subscriptions.filter(
    (subscription) => subscription.locationSlug === input.locationSlug,
  );
  const orders = input.orders.filter((order) => order.locationSlug === input.locationSlug);
  const currency =
    plans[0]?.price.currency ?? orders[0]?.currency ?? "CAD";
  const serviceAllowances = buildRemainingServiceAllowances({
    plans,
    subscriptions,
    usageRecords: input.usageRecords,
  });

  const plansBySlug = new Map(plans.map((plan) => [plan.slug, plan]));

  const lines = plans.map((plan) => {
    const planSubscriptions = subscriptions.filter(
      (subscription) => subscription.planSlug === plan.slug,
    );
    const membershipLineItems = orders.flatMap((order) =>
      order.lineItems
        .filter(
          (lineItem) =>
            lineItem.kind === "membershipPlan" && lineItem.referenceId === plan.slug,
        )
        .map((lineItem) => ({
          orderStatus: order.status,
          subtotalAmountCents: lineItem.subtotalAmount.amountCents,
          finalAmountCents: lineItem.finalAmount.amountCents,
        })),
    );
    const planAllowances = serviceAllowances.filter(
      (allowance) => allowance.planSlug === plan.slug,
    );

    return {
      planSlug: plan.slug,
      planName: plan.name,
      educationOnly: plan.educationOnly,
      totalSubscriptions: planSubscriptions.length,
      activeSubscriptionCount: planSubscriptions.filter(
        (subscription) => subscription.status === "active",
      ).length,
      pendingSubscriptionCount: planSubscriptions.filter(
        (subscription) => subscription.status === "pending_payment",
      ).length,
      cancelledSubscriptionCount: planSubscriptions.filter(
        (subscription) => subscription.status === "cancelled",
      ).length,
      activeRecurringAmount: {
        currency,
        amountCents:
          planSubscriptions.filter((subscription) => subscription.status === "active").length *
          plan.price.amountCents,
      },
      grossMembershipRevenueAmount: {
        currency,
        amountCents: membershipLineItems.reduce(
          (total, lineItem) => total + lineItem.subtotalAmountCents,
          0,
        ),
      },
      netMembershipRevenueAmount: {
        currency,
        amountCents: membershipLineItems
          .filter((lineItem) => lineItem.orderStatus === "paid")
          .reduce((total, lineItem) => total + lineItem.finalAmountCents, 0),
      },
      refundedMembershipRevenueAmount: {
        currency,
        amountCents: membershipLineItems
          .filter((lineItem) => lineItem.orderStatus === "refunded")
          .reduce((total, lineItem) => total + lineItem.finalAmountCents, 0),
      },
      serviceAllowanceTotalQuantity: planAllowances.reduce(
        (total, allowance) => total + allowance.totalQuantity,
        0,
      ),
      serviceAllowanceUsedQuantity: planAllowances.reduce(
        (total, allowance) => total + allowance.usedQuantity,
        0,
      ),
      serviceAllowanceRemainingQuantity: planAllowances.reduce(
        (total, allowance) => total + allowance.remainingQuantity,
        0,
      ),
    };
  });

  return {
    locationSlug: input.locationSlug,
    currency,
    plans: lines,
    totals: {
      totalSubscriptions: subscriptions.length,
      activeSubscriptionCount: subscriptions.filter(
        (subscription) => subscription.status === "active",
      ).length,
      pendingSubscriptionCount: subscriptions.filter(
        (subscription) => subscription.status === "pending_payment",
      ).length,
      cancelledSubscriptionCount: subscriptions.filter(
        (subscription) => subscription.status === "cancelled",
      ).length,
      educationOnlyActiveSubscriptionCount: subscriptions.filter((subscription) => {
        const plan = plansBySlug.get(subscription.planSlug);
        return subscription.status === "active" && !!plan?.educationOnly;
      }).length,
      serviceMembershipActiveSubscriptionCount: subscriptions.filter((subscription) => {
        const plan = plansBySlug.get(subscription.planSlug);
        return subscription.status === "active" && plan?.educationOnly === false;
      }).length,
      activeRecurringAmount: {
        currency,
        amountCents: lines.reduce(
          (total, line) => total + line.activeRecurringAmount.amountCents,
          0,
        ),
      },
      grossMembershipRevenueAmount: {
        currency,
        amountCents: lines.reduce(
          (total, line) => total + line.grossMembershipRevenueAmount.amountCents,
          0,
        ),
      },
      netMembershipRevenueAmount: {
        currency,
        amountCents: lines.reduce(
          (total, line) => total + line.netMembershipRevenueAmount.amountCents,
          0,
        ),
      },
      refundedMembershipRevenueAmount: {
        currency,
        amountCents: lines.reduce(
          (total, line) => total + line.refundedMembershipRevenueAmount.amountCents,
          0,
        ),
      },
      serviceAllowanceTotalQuantity: lines.reduce(
        (total, line) => total + line.serviceAllowanceTotalQuantity,
        0,
      ),
      serviceAllowanceUsedQuantity: lines.reduce(
        (total, line) => total + line.serviceAllowanceUsedQuantity,
        0,
      ),
      serviceAllowanceRemainingQuantity: lines.reduce(
        (total, line) => total + line.serviceAllowanceRemainingQuantity,
        0,
      ),
    },
  };
};

export const buildOperationsPerformanceReport = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  services: CatalogService[];
  machines: MachineResource[];
  rooms: RoomResource[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  metricEvents: OperationalMetricEventRecord[];
}): OperationsPerformanceReport => {
  const currency = input.orders[0]?.currency ?? input.services[0]?.price.currency ?? "CAD";
  const services = input.services.filter((service) => service.locationSlug === input.locationSlug);
  const relevantEvents = input.metricEvents.filter(
    (event) =>
      event.locationSlug === input.locationSlug &&
      isWithinDateRange(event.occurredAt, input.fromDate, input.toDate),
  );
  const relevantBookings = input.bookings.filter(
    (booking) =>
      booking.locationSlug === input.locationSlug &&
      isWithinDateRange(booking.startAt, input.fromDate, input.toDate),
  );
  const paidBookingLineItems = input.orders
    .filter((order) => order.status === "paid")
    .flatMap((order) =>
      order.lineItems
        .filter((lineItem) => lineItem.kind === "booking" && lineItem.revenueStream === "services")
        .map((lineItem) => ({
          orderId: order.id,
          bookingId: lineItem.referenceId,
          amountCents: lineItem.finalAmount.amountCents,
        })),
    );
  const paidBookingEvents = relevantEvents.filter((event) => event.eventType === "booking_paid");
  const paidBookingEventKeys = new Set(
    paidBookingEvents.map((event) => `${event.sourceOrderId ?? ""}::${event.referenceId ?? ""}`),
  );
  const paidBookingLineItemsInRange = paidBookingLineItems.filter((lineItem) =>
    paidBookingEventKeys.has(`${lineItem.orderId}::${lineItem.bookingId}`),
  );
  const bookingsById = new Map(input.bookings.map((booking) => [booking.id, booking]));

  const buildConversionSummary = (inputSummary: {
    searchEvents: OperationalMetricEventRecord[];
    waitlistEvents: OperationalMetricEventRecord[];
    bookingEvents: OperationalMetricEventRecord[];
    paidBookingEvents: OperationalMetricEventRecord[];
    paidBookingLineItems: Array<{ orderId: string; bookingId: string; amountCents: number }>;
  }): OperationsConversionSummary => ({
    searchCount: inputSummary.searchEvents.length,
    waitlistCount: inputSummary.waitlistEvents.length,
    bookingCreatedCount: inputSummary.bookingEvents.length,
    paidBookingCount: inputSummary.paidBookingEvents.length,
    paidBookingOrderCount: new Set(
      inputSummary.paidBookingLineItems.map((lineItem) => lineItem.orderId),
    ).size,
    paidServiceRevenueAmount: {
      currency,
      amountCents: inputSummary.paidBookingLineItems.reduce(
        (total, lineItem) => total + lineItem.amountCents,
        0,
      ),
    },
    searchToBookingRate:
      inputSummary.searchEvents.length === 0
        ? 0
        : Number(
            (
              (inputSummary.bookingEvents.length / inputSummary.searchEvents.length) *
              100
            ).toFixed(2),
          ),
    searchToPaidBookingRate:
      inputSummary.searchEvents.length === 0
        ? 0
        : Number(
            (
              (inputSummary.paidBookingEvents.length / inputSummary.searchEvents.length) *
              100
            ).toFixed(2),
          ),
  });

  const servicesReport = services
    .map((service) => {
      const searchEvents = relevantEvents.filter(
        (event) => event.eventType === "availability_search" && event.serviceSlug === service.slug,
      );
      const waitlistEvents = relevantEvents.filter(
        (event) => event.eventType === "waitlist_created" && event.serviceSlug === service.slug,
      );
      const bookingEvents = relevantEvents.filter(
        (event) => event.eventType === "booking_created" && event.serviceSlug === service.slug,
      );
      const servicePaidBookingEvents = paidBookingEvents.filter(
        (event) => event.serviceSlug === service.slug,
      );
      const servicePaidBookingLineItems = paidBookingLineItemsInRange.filter((lineItem) => {
        const booking = bookingsById.get(lineItem.bookingId);
        return booking?.serviceSlug === service.slug;
      });

      return {
        serviceSlug: service.slug,
        serviceName: service.name,
        ...buildConversionSummary({
          searchEvents,
          waitlistEvents,
          bookingEvents,
          paidBookingEvents: servicePaidBookingEvents,
          paidBookingLineItems: servicePaidBookingLineItems,
        }),
      };
    })
    .filter(
      (line) =>
        line.searchCount > 0 ||
        line.waitlistCount > 0 ||
        line.bookingCreatedCount > 0 ||
        line.paidBookingCount > 0 ||
        line.paidServiceRevenueAmount.amountCents > 0,
    )
    .sort((left, right) => right.paidServiceRevenueAmount.amountCents - left.paidServiceRevenueAmount.amountCents);

  const machinesReport = input.machines
    .filter((machine) => machine.locationSlug === input.locationSlug)
    .map((machine) => {
      const machineBookings = relevantBookings.filter(
        (booking) => booking.machineSlug === machine.slug && booking.status === "confirmed",
      );
      const bookedMinutes = sum(
        machineBookings.map((booking) => minutesBetween(booking.startAt, booking.endAt)),
      );
      const availableMinutes = availableMinutesForRange(
        machine.availability,
        input.fromDate,
        input.toDate,
      );
      const paidServiceRevenueAmountCents = paidBookingLineItemsInRange.reduce((total, lineItem) => {
        const booking = bookingsById.get(lineItem.bookingId);
        if (!booking || booking.machineSlug !== machine.slug) {
          return total;
        }

        return total + lineItem.amountCents;
      }, 0);

      return {
        machineSlug: machine.slug,
        machineName: machine.name,
        bookingCount: machineBookings.length,
        bookedMinutes,
        availableMinutes,
        utilizationPercent:
          availableMinutes === 0 ? 0 : Number(((bookedMinutes / availableMinutes) * 100).toFixed(2)),
        paidServiceRevenueAmount: {
          currency,
          amountCents: paidServiceRevenueAmountCents,
        },
      };
    })
    .sort((left, right) => right.paidServiceRevenueAmount.amountCents - left.paidServiceRevenueAmount.amountCents);

  const roomsReport = input.rooms
    .filter((room) => room.locationSlug === input.locationSlug)
    .map((room) => {
      const roomBookings = relevantBookings.filter(
        (booking) => booking.roomSlug === room.slug && booking.status === "confirmed",
      );
      const bookedMinutes = sum(
        roomBookings.map((booking) => minutesBetween(booking.startAt, booking.endAt)),
      );
      const availableMinutes = availableMinutesForRange(
        room.availability,
        input.fromDate,
        input.toDate,
      );
      const paidServiceRevenueAmountCents = paidBookingLineItemsInRange.reduce((total, lineItem) => {
        const booking = bookingsById.get(lineItem.bookingId);
        if (!booking || booking.roomSlug !== room.slug) {
          return total;
        }

        return total + lineItem.amountCents;
      }, 0);

      return {
        roomSlug: room.slug,
        roomName: room.name,
        bookingCount: roomBookings.length,
        bookedMinutes,
        availableMinutes,
        utilizationPercent:
          availableMinutes === 0 ? 0 : Number(((bookedMinutes / availableMinutes) * 100).toFixed(2)),
        paidServiceRevenueAmount: {
          currency,
          amountCents: paidServiceRevenueAmountCents,
        },
      };
    })
    .sort((left, right) => right.paidServiceRevenueAmount.amountCents - left.paidServiceRevenueAmount.amountCents);

  return {
    locationSlug: input.locationSlug,
    fromDate: input.fromDate,
    toDate: input.toDate,
    currency,
    conversion: buildConversionSummary({
      searchEvents: relevantEvents.filter((event) => event.eventType === "availability_search"),
      waitlistEvents: relevantEvents.filter((event) => event.eventType === "waitlist_created"),
      bookingEvents: relevantEvents.filter((event) => event.eventType === "booking_created"),
      paidBookingEvents,
      paidBookingLineItems: paidBookingLineItemsInRange,
    }),
    services: servicesReport,
    machines: machinesReport,
    rooms: roomsReport,
  };
};

const buildTreatmentPlanFunnelSummary = (input: {
  currency: string;
  createdCount: number;
  sharedCount: number;
  acceptedCount: number;
  bookedCount: number;
  paidCount: number;
  paidRevenueAmountCents: number;
}): TreatmentPlanFunnelSummary => {
  const toRate = (numerator: number, denominator: number): number =>
    denominator === 0 ? 0 : Number(((numerator / denominator) * 100).toFixed(2));

  return {
    createdCount: input.createdCount,
    sharedCount: input.sharedCount,
    acceptedCount: input.acceptedCount,
    bookedCount: input.bookedCount,
    paidCount: input.paidCount,
    paidRevenueAmount: {
      currency: input.currency,
      amountCents: input.paidRevenueAmountCents,
    },
    createdToSharedRate: toRate(input.sharedCount, input.createdCount),
    sharedToAcceptedRate: toRate(input.acceptedCount, input.sharedCount),
    acceptedToBookedRate: toRate(input.bookedCount, input.acceptedCount),
    bookedToPaidRate: toRate(input.paidCount, input.bookedCount),
    createdToPaidRate: toRate(input.paidCount, input.createdCount),
  };
};

export const buildTreatmentPlanPerformanceReport = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  services: CatalogService[];
  treatmentPlans: TreatmentPlanRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
}): TreatmentPlanPerformanceReport => {
  const relevantPlans = input.treatmentPlans.filter(
    (treatmentPlan) =>
      treatmentPlan.locationSlug === input.locationSlug &&
      isWithinDateRange(treatmentPlan.createdAt, input.fromDate, input.toDate),
  );
  const relevantPlanIds = new Set(relevantPlans.map((treatmentPlan) => treatmentPlan.id));
  const serviceNameBySlug = new Map(
    input.services
      .filter((service) => service.locationSlug === input.locationSlug)
      .map((service) => [service.slug, service.name]),
  );
  const currency =
    input.orders[0]?.currency ??
    input.services.find((service) => service.locationSlug === input.locationSlug)?.price.currency ??
    "CAD";
  const sharedPlanIds = new Set(
    relevantPlans
      .filter((treatmentPlan) => isOnOrBeforeDate(treatmentPlan.sharedAt, input.toDate))
      .map((treatmentPlan) => treatmentPlan.id),
  );
  const acceptedPlanIds = new Set(
    relevantPlans
      .filter((treatmentPlan) => isOnOrBeforeDate(treatmentPlan.acceptedAt, input.toDate))
      .map((treatmentPlan) => treatmentPlan.id),
  );
  const relevantBookings = input.bookings.filter(
    (booking) =>
      booking.locationSlug === input.locationSlug &&
      !!booking.sourceTreatmentPlanId &&
      relevantPlanIds.has(booking.sourceTreatmentPlanId) &&
      isOnOrBeforeDate(booking.createdAt, input.toDate),
  );
  const relevantBookingsById = new Map(
    relevantBookings.map((booking) => [booking.id, booking]),
  );
  const bookedPlanIds = new Set(
    relevantBookings.flatMap((booking) =>
      booking.sourceTreatmentPlanId ? [booking.sourceTreatmentPlanId] : [],
    ),
  );
  const paidBookingLineItems = input.orders
    .filter(
      (order) =>
        order.locationSlug === input.locationSlug &&
        order.status === "paid" &&
        isOnOrBeforeDate(order.paidAt, input.toDate),
    )
    .flatMap((order) =>
      order.lineItems
        .filter(
          (lineItem) =>
            lineItem.kind === "booking" && lineItem.revenueStream === "services",
        )
        .flatMap((lineItem) => {
          const booking = relevantBookingsById.get(lineItem.referenceId);
          if (!booking?.sourceTreatmentPlanId) {
            return [];
          }

          return [
            {
              treatmentPlanId: booking.sourceTreatmentPlanId,
              bookingId: booking.id,
              serviceSlug: booking.serviceSlug,
              amountCents: lineItem.finalAmount.amountCents,
            },
          ];
        }),
    );
  const paidPlanIds = new Set(
    paidBookingLineItems.map((lineItem) => lineItem.treatmentPlanId),
  );
  const serviceMap = new Map<
    string,
    {
      serviceName: string;
      createdPlanIds: Set<string>;
      sharedPlanIds: Set<string>;
      acceptedPlanIds: Set<string>;
      bookedPlanIds: Set<string>;
      paidPlanIds: Set<string>;
      paidRevenueAmountCents: number;
    }
  >();

  for (const treatmentPlan of relevantPlans) {
    const uniqueLines = new Map(
      treatmentPlan.lines.map((line) => [line.serviceSlug, line.serviceName]),
    );
    for (const [serviceSlug, serviceName] of uniqueLines.entries()) {
      const entry = serviceMap.get(serviceSlug) ?? {
        serviceName: serviceNameBySlug.get(serviceSlug) ?? serviceName,
        createdPlanIds: new Set<string>(),
        sharedPlanIds: new Set<string>(),
        acceptedPlanIds: new Set<string>(),
        bookedPlanIds: new Set<string>(),
        paidPlanIds: new Set<string>(),
        paidRevenueAmountCents: 0,
      };
      entry.createdPlanIds.add(treatmentPlan.id);
      if (sharedPlanIds.has(treatmentPlan.id)) {
        entry.sharedPlanIds.add(treatmentPlan.id);
      }
      if (acceptedPlanIds.has(treatmentPlan.id)) {
        entry.acceptedPlanIds.add(treatmentPlan.id);
      }
      serviceMap.set(serviceSlug, entry);
    }
  }

  for (const booking of relevantBookings) {
    if (!booking.sourceTreatmentPlanId) {
      continue;
    }

    const entry = serviceMap.get(booking.serviceSlug);
    if (!entry) {
      continue;
    }

    entry.bookedPlanIds.add(booking.sourceTreatmentPlanId);
  }

  for (const lineItem of paidBookingLineItems) {
    const entry = serviceMap.get(lineItem.serviceSlug);
    if (!entry) {
      continue;
    }

    entry.paidPlanIds.add(lineItem.treatmentPlanId);
    entry.paidRevenueAmountCents += lineItem.amountCents;
  }

  const services = [...serviceMap.entries()]
    .map(([serviceSlug, entry]) => ({
      serviceSlug,
      serviceName: entry.serviceName,
      ...buildTreatmentPlanFunnelSummary({
        currency,
        createdCount: entry.createdPlanIds.size,
        sharedCount: entry.sharedPlanIds.size,
        acceptedCount: entry.acceptedPlanIds.size,
        bookedCount: entry.bookedPlanIds.size,
        paidCount: entry.paidPlanIds.size,
        paidRevenueAmountCents: entry.paidRevenueAmountCents,
      }),
    }))
    .sort((left, right) => {
      if (right.paidRevenueAmount.amountCents !== left.paidRevenueAmount.amountCents) {
        return right.paidRevenueAmount.amountCents - left.paidRevenueAmount.amountCents;
      }

      return right.createdCount - left.createdCount;
    });

  return {
    locationSlug: input.locationSlug,
    fromDate: input.fromDate,
    toDate: input.toDate,
    currency,
    funnel: buildTreatmentPlanFunnelSummary({
      currency,
      createdCount: relevantPlans.length,
      sharedCount: sharedPlanIds.size,
      acceptedCount: acceptedPlanIds.size,
      bookedCount: bookedPlanIds.size,
      paidCount: paidPlanIds.size,
      paidRevenueAmountCents: paidBookingLineItems.reduce(
        (total, lineItem) => total + lineItem.amountCents,
        0,
      ),
    }),
    services,
  };
};

const buildRankMap = (
  locations: MultiLocationBenchmarkLine[],
  getValue: (location: MultiLocationBenchmarkLine) => number,
): Map<string, number> => {
  const sorted = [...locations].sort((left, right) => {
    const delta = getValue(right) - getValue(left);
    if (delta !== 0) {
      return delta;
    }

    return left.locationSlug.localeCompare(right.locationSlug);
  });

  return new Map(
    sorted.map((location, index) => [location.locationSlug, index + 1]),
  );
};

const averageForPeers = <T extends MultiLocationBenchmarkLine>(
  locations: T[],
  currentLocationSlug: string,
  selector: (location: T) => number,
): { peerLocationCount: number; average: number } => {
  const peers = locations.filter((location) => location.locationSlug !== currentLocationSlug);
  if (peers.length === 0) {
    return {
      peerLocationCount: 0,
      average: 0,
    };
  }

  return {
    peerLocationCount: peers.length,
    average: peers.reduce((total, location) => total + selector(location), 0) / peers.length,
  };
};

const deltaFromPeerAverage = (
  currentValue: number,
  peerAverage: { peerLocationCount: number; average: number },
  round?: "two",
): number => {
  if (peerAverage.peerLocationCount === 0) {
    return 0;
  }

  const delta = currentValue - peerAverage.average;
  return round === "two" ? roundToTwo(delta) : Math.round(delta);
};

export const buildMultiLocationBenchmarkReport = (input: {
  fromDate: string;
  toDate: string;
  locations: TenantLocation[];
  organizations: TenantOrganization[];
  organization?: TenantOrganization;
  services: CatalogService[];
  machines: MachineResource[];
  rooms: RoomResource[];
  orders: OrderRecord[];
  bookings: BookingRecord[];
  metricEvents: OperationalMetricEventRecord[];
  membershipPlans: MembershipPlan[];
  membershipSubscriptions: MembershipSubscription[];
  membershipUsageRecords: MembershipUsageRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  skinAssessments: SkinAssessmentRecord[];
}): MultiLocationBenchmarkReport => {
  const organizationsById = new Map(
    input.organizations.map((organization) => [organization.id, organization]),
  );
  const inRangeRevenueOrders = input.orders.filter((order) => {
    const effectiveDate = order.paidAt ?? order.createdAt;
    return (
      (order.status === "paid" || order.status === "refunded") &&
      effectiveDate.slice(0, 10) >= input.fromDate &&
      effectiveDate.slice(0, 10) <= input.toDate
    );
  });
  const currency =
    inRangeRevenueOrders[0]?.currency ??
    input.services[0]?.price.currency ??
    input.membershipPlans[0]?.price.currency ??
    "CAD";

  const lines = input.locations.map((location) => {
    const organization = organizationsById.get(location.organizationId);
    if (!organization) {
      throw new Error(`Organization ${location.organizationId} not found for location ${location.slug}.`);
    }

    const revenue = buildRevenueSummaryReport({
      locationSlug: location.slug,
      orders: inRangeRevenueOrders,
    });
    const membership = buildMembershipPerformanceReport({
      locationSlug: location.slug,
      orders: input.orders,
      plans: input.membershipPlans,
      subscriptions: input.membershipSubscriptions,
      usageRecords: input.membershipUsageRecords,
    });
    const operations = buildOperationsPerformanceReport({
      locationSlug: location.slug,
      fromDate: input.fromDate,
      toDate: input.toDate,
      services: input.services,
      machines: input.machines,
      rooms: input.rooms,
      bookings: input.bookings,
      orders: input.orders,
      metricEvents: input.metricEvents,
    });
    const treatmentPlan = buildTreatmentPlanPerformanceReport({
      locationSlug: location.slug,
      fromDate: input.fromDate,
      toDate: input.toDate,
      services: input.services,
      treatmentPlans: input.treatmentPlans,
      bookings: input.bookings,
      orders: input.orders,
    });
    const skinAssessment = buildSkinAssessmentPerformanceReport({
      locationSlug: location.slug,
      fromDate: input.fromDate,
      toDate: input.toDate,
      services: input.services,
      assessments: input.skinAssessments,
      bookings: input.bookings,
      orders: input.orders,
    });
    const machineUtilizationPercent =
      operations.machines.length === 0
        ? 0
        : roundToTwo(
            sum(operations.machines.map((machine) => machine.utilizationPercent)) /
              operations.machines.length,
          );

    return {
      locationSlug: location.slug,
      locationName: location.name,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      organizationOperatingMode: organization.operatingMode,
      netRevenueAmount: {
        currency,
        amountCents: revenue.totals.netAmount.amountCents,
      },
      paidServiceRevenueAmount: {
        currency,
        amountCents: operations.conversion.paidServiceRevenueAmount.amountCents,
      },
      paidBookingCount: operations.conversion.paidBookingCount,
      searchToPaidBookingRate: operations.conversion.searchToPaidBookingRate,
      activeMembershipCount: membership.totals.activeSubscriptionCount,
      activeRecurringAmount: {
        currency,
        amountCents: membership.totals.activeRecurringAmount.amountCents,
      },
      treatmentPlanCreatedCount: treatmentPlan.funnel.createdCount,
      treatmentPlanPaidCount: treatmentPlan.funnel.paidCount,
      treatmentPlanCreatedToPaidRate: treatmentPlan.funnel.createdToPaidRate,
      skinAssessmentCount: skinAssessment.assessmentCount,
      attributedSkinAssessmentRevenueAmount: {
        currency,
        amountCents: skinAssessment.attributedPaidRevenueAmount.amountCents,
      },
      machineUtilizationPercent,
      revenueRank: 0,
      conversionRank: 0,
      activeRecurringRank: 0,
      peerDelta: {
        peerLocationCount: 0,
        netRevenueAmount: {
          currency,
          amountCents: 0,
        },
        paidServiceRevenueAmount: {
          currency,
          amountCents: 0,
        },
        searchToPaidBookingRate: 0,
        activeMembershipCount: 0,
        activeRecurringAmount: {
          currency,
          amountCents: 0,
        },
        treatmentPlanCreatedToPaidRate: 0,
        skinAssessmentCount: 0,
        machineUtilizationPercent: 0,
      },
    };
  });

  const revenueRankMap = buildRankMap(lines, (location) => location.netRevenueAmount.amountCents);
  const conversionRankMap = buildRankMap(lines, (location) => location.searchToPaidBookingRate);
  const activeRecurringRankMap = buildRankMap(
    lines,
    (location) => location.activeRecurringAmount.amountCents,
  );
  const rankedLines = lines
    .map((location) => {
      const netRevenuePeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.netRevenueAmount.amountCents,
      );
      const paidServiceRevenuePeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.paidServiceRevenueAmount.amountCents,
      );
      const conversionPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.searchToPaidBookingRate,
      );
      const activeMembershipPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.activeMembershipCount,
      );
      const activeRecurringPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.activeRecurringAmount.amountCents,
      );
      const treatmentPlanPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.treatmentPlanCreatedToPaidRate,
      );
      const skinAssessmentPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.skinAssessmentCount,
      );
      const machineUtilizationPeers = averageForPeers(
        lines,
        location.locationSlug,
        (peer) => peer.machineUtilizationPercent,
      );

      return {
        ...location,
        revenueRank: revenueRankMap.get(location.locationSlug) ?? 0,
        conversionRank: conversionRankMap.get(location.locationSlug) ?? 0,
        activeRecurringRank: activeRecurringRankMap.get(location.locationSlug) ?? 0,
        peerDelta: {
          peerLocationCount: netRevenuePeers.peerLocationCount,
          netRevenueAmount: {
            currency,
            amountCents: deltaFromPeerAverage(
              location.netRevenueAmount.amountCents,
              netRevenuePeers,
            ),
          },
          paidServiceRevenueAmount: {
            currency,
            amountCents: deltaFromPeerAverage(
              location.paidServiceRevenueAmount.amountCents,
              paidServiceRevenuePeers,
            ),
          },
          searchToPaidBookingRate: deltaFromPeerAverage(
            location.searchToPaidBookingRate,
            conversionPeers,
            "two",
          ),
          activeMembershipCount: deltaFromPeerAverage(
            location.activeMembershipCount,
            activeMembershipPeers,
          ),
          activeRecurringAmount: {
            currency,
            amountCents: deltaFromPeerAverage(
              location.activeRecurringAmount.amountCents,
              activeRecurringPeers,
            ),
          },
          treatmentPlanCreatedToPaidRate: deltaFromPeerAverage(
            location.treatmentPlanCreatedToPaidRate,
            treatmentPlanPeers,
            "two",
          ),
          skinAssessmentCount: deltaFromPeerAverage(
            location.skinAssessmentCount,
            skinAssessmentPeers,
            "two",
          ),
          machineUtilizationPercent: deltaFromPeerAverage(
            location.machineUtilizationPercent,
            machineUtilizationPeers,
            "two",
          ),
        },
      };
    })
    .sort((left, right) => {
      if (right.netRevenueAmount.amountCents !== left.netRevenueAmount.amountCents) {
        return right.netRevenueAmount.amountCents - left.netRevenueAmount.amountCents;
      }

      return left.locationSlug.localeCompare(right.locationSlug);
    });
  const locationCount = rankedLines.length;
  const sumLineValues = (
    selector: (location: MultiLocationBenchmarkLine) => number,
  ): number => rankedLines.reduce((total, location) => total + selector(location), 0);

  return {
    organization: input.organization
      ? {
          id: input.organization.id,
          slug: input.organization.slug,
          name: input.organization.name,
          operatingMode: input.organization.operatingMode,
        }
      : undefined,
    fromDate: input.fromDate,
    toDate: input.toDate,
    currency,
    totals: {
      locationCount,
      netRevenueAmount: {
        currency,
        amountCents: sumLineValues((location) => location.netRevenueAmount.amountCents),
      },
      paidServiceRevenueAmount: {
        currency,
        amountCents: sumLineValues((location) => location.paidServiceRevenueAmount.amountCents),
      },
      paidBookingCount: sumLineValues((location) => location.paidBookingCount),
      activeMembershipCount: sumLineValues((location) => location.activeMembershipCount),
      activeRecurringAmount: {
        currency,
        amountCents: sumLineValues((location) => location.activeRecurringAmount.amountCents),
      },
      treatmentPlanCreatedCount: sumLineValues(
        (location) => location.treatmentPlanCreatedCount,
      ),
      treatmentPlanPaidCount: sumLineValues((location) => location.treatmentPlanPaidCount),
      skinAssessmentCount: sumLineValues((location) => location.skinAssessmentCount),
      attributedSkinAssessmentRevenueAmount: {
        currency,
        amountCents: sumLineValues(
          (location) => location.attributedSkinAssessmentRevenueAmount.amountCents,
        ),
      },
    },
    peerAverages: {
      locationCount,
      averageNetRevenueAmount: {
        currency,
        amountCents:
          locationCount === 0
            ? 0
            : Math.round(sumLineValues((location) => location.netRevenueAmount.amountCents) / locationCount),
      },
      averagePaidServiceRevenueAmount: {
        currency,
        amountCents:
          locationCount === 0
            ? 0
            : Math.round(
                sumLineValues((location) => location.paidServiceRevenueAmount.amountCents) / locationCount,
              ),
      },
      averagePaidBookingCount:
        locationCount === 0 ? 0 : roundToTwo(sumLineValues((location) => location.paidBookingCount) / locationCount),
      averageSearchToPaidBookingRate:
        locationCount === 0
          ? 0
          : roundToTwo(sumLineValues((location) => location.searchToPaidBookingRate) / locationCount),
      averageActiveMembershipCount:
        locationCount === 0
          ? 0
          : roundToTwo(sumLineValues((location) => location.activeMembershipCount) / locationCount),
      averageActiveRecurringAmount: {
        currency,
        amountCents:
          locationCount === 0
            ? 0
            : Math.round(
                sumLineValues((location) => location.activeRecurringAmount.amountCents) / locationCount,
              ),
      },
      averageTreatmentPlanCreatedToPaidRate:
        locationCount === 0
          ? 0
          : roundToTwo(
              sumLineValues((location) => location.treatmentPlanCreatedToPaidRate) / locationCount,
            ),
      averageSkinAssessmentCount:
        locationCount === 0
          ? 0
          : roundToTwo(sumLineValues((location) => location.skinAssessmentCount) / locationCount),
      averageMachineUtilizationPercent:
        locationCount === 0
          ? 0
          : roundToTwo(sumLineValues((location) => location.machineUtilizationPercent) / locationCount),
    },
    locations: rankedLines,
  };
};

export const buildSkinAssessmentPerformanceReport = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  services: CatalogService[];
  assessments: SkinAssessmentRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
}): SkinAssessmentPerformanceReport => {
  const relevantAssessments = input.assessments.filter(
    (assessment) =>
      assessment.locationSlug === input.locationSlug &&
      isWithinDateRange(assessment.capturedAt, input.fromDate, input.toDate),
  );
  const relevantAssessmentIds = new Set(relevantAssessments.map((assessment) => assessment.id));
  const attributedBookings = input.bookings.filter(
    (booking) =>
      booking.locationSlug === input.locationSlug &&
      !!booking.sourceAssessmentId &&
      relevantAssessmentIds.has(booking.sourceAssessmentId) &&
      isWithinDateRange(booking.createdAt, input.fromDate, input.toDate),
  );
  const attributedBookingIds = new Set(attributedBookings.map((booking) => booking.id));
  const serviceNameBySlug = new Map(
    input.services
      .filter((service) => service.locationSlug === input.locationSlug)
      .map((service) => [service.slug, service.name]),
  );
  const currency = input.orders[0]?.currency ?? input.services[0]?.price.currency ?? "CAD";
  const confidenceScores = relevantAssessments
    .flatMap((assessment) =>
      typeof assessment.confidenceScore === "number" ? [assessment.confidenceScore] : [],
    );
  const concernMap = new Map<
    string,
    { label: string; assessmentCount: number; totalSeverity: number; highSeverityCount: number }
  >();
  const mappedServiceMap = new Map<
    string,
    { recommendationCount: number; customerEmails: Set<string> }
  >();
  const unresolvedServiceMap = new Map<string, number>();
  const attributedPaidLineItems = input.orders
    .filter(
      (order) =>
        order.locationSlug === input.locationSlug &&
        order.status === "paid" &&
        isWithinDateRange(order.paidAt, input.fromDate, input.toDate),
    )
    .flatMap((order) =>
      order.lineItems
        .filter(
          (lineItem) =>
            lineItem.kind === "booking" &&
            lineItem.revenueStream === "services" &&
            attributedBookingIds.has(lineItem.referenceId),
        )
        .map((lineItem) => ({
          orderId: order.id,
          bookingId: lineItem.referenceId,
          amountCents: lineItem.finalAmount.amountCents,
        })),
    );

  for (const assessment of relevantAssessments) {
    for (const concern of assessment.concerns) {
      const entry = concernMap.get(concern.key) ?? {
        label: concern.label,
        assessmentCount: 0,
        totalSeverity: 0,
        highSeverityCount: 0,
      };
      entry.assessmentCount += 1;
      entry.totalSeverity += concern.severityScore;
      if (concern.severityScore >= 80) {
        entry.highSeverityCount += 1;
      }
      concernMap.set(concern.key, entry);
    }

    for (const serviceSlug of assessment.recommendedServiceSlugs) {
      const entry = mappedServiceMap.get(serviceSlug) ?? {
        recommendationCount: 0,
        customerEmails: new Set<string>(),
      };
      entry.recommendationCount += 1;
      entry.customerEmails.add(assessment.customerEmail);
      mappedServiceMap.set(serviceSlug, entry);
    }

    for (const serviceSlug of assessment.unresolvedRecommendedServiceSlugs) {
      unresolvedServiceMap.set(serviceSlug, (unresolvedServiceMap.get(serviceSlug) ?? 0) + 1);
    }
  }

  return {
    locationSlug: input.locationSlug,
    fromDate: input.fromDate,
    toDate: input.toDate,
    assessmentCount: relevantAssessments.length,
    uniqueCustomerCount: new Set(
      relevantAssessments.map((assessment) => assessment.customerEmail),
    ).size,
    withImagesCount: relevantAssessments.filter((assessment) => assessment.imageCount > 0).length,
    averageConfidenceScore:
      confidenceScores.length > 0
        ? Number((sum(confidenceScores) / confidenceScores.length).toFixed(2))
        : null,
    mappedRecommendationCount: relevantAssessments.reduce(
      (total, assessment) => total + assessment.recommendedServiceSlugs.length,
      0,
    ),
    unresolvedRecommendationCount: relevantAssessments.reduce(
      (total, assessment) => total + assessment.unresolvedRecommendedServiceSlugs.length,
      0,
    ),
    attributedBookingCount: attributedBookings.length,
    attributedPaidBookingCount: attributedPaidLineItems.length,
    attributedPaidRevenueAmount: {
      currency,
      amountCents: attributedPaidLineItems.reduce(
        (total, lineItem) => total + lineItem.amountCents,
        0,
      ),
    },
    assessmentToBookingRate:
      relevantAssessments.length === 0
        ? 0
        : Number(((attributedBookings.length / relevantAssessments.length) * 100).toFixed(2)),
    assessmentToPaidBookingRate:
      relevantAssessments.length === 0
        ? 0
        : Number(
            (
              (attributedPaidLineItems.length / relevantAssessments.length) *
              100
            ).toFixed(2),
          ),
    concerns: [...concernMap.entries()]
      .map(([concernKey, entry]) => ({
        concernKey,
        label: entry.label,
        assessmentCount: entry.assessmentCount,
        averageSeverityScore: Number(
          (entry.totalSeverity / entry.assessmentCount).toFixed(2),
        ),
        highSeverityCount: entry.highSeverityCount,
      }))
      .sort((left, right) => right.assessmentCount - left.assessmentCount),
    recommendedServices: [...mappedServiceMap.entries()]
      .map(([serviceSlug, entry]) => ({
        serviceSlug,
        serviceName: serviceNameBySlug.get(serviceSlug) ?? serviceSlug,
        recommendationCount: entry.recommendationCount,
        uniqueCustomerCount: entry.customerEmails.size,
      }))
      .sort((left, right) => right.recommendationCount - left.recommendationCount),
    unresolvedRecommendations: [...unresolvedServiceMap.entries()]
      .map(([serviceSlug, recommendationCount]) => ({
        serviceSlug,
        recommendationCount,
      }))
      .sort((left, right) => right.recommendationCount - left.recommendationCount),
  };
};
