import { z } from "zod";

import { revenueStreamSchema } from "./commerce";
import { locationSlugSchema, moneySchema, successEnvelope } from "./common";
import { providerPayoutRunStatusSchema } from "./operations";

const signedMoneySchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amountCents: z.number().int(),
});

export const revenueSummaryLineSchema = z.object({
  revenueStream: revenueStreamSchema,
  grossAmount: moneySchema,
  discountAmount: moneySchema,
  netAmount: moneySchema,
  refundedAmount: moneySchema,
  orderCount: z.number().int().nonnegative(),
});

export const revenueSummaryTotalsSchema = z.object({
  grossAmount: moneySchema,
  discountAmount: moneySchema,
  netAmount: moneySchema,
  refundedAmount: moneySchema,
  orderCount: z.number().int().nonnegative(),
});

export const revenueSummaryReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    streams: z.array(revenueSummaryLineSchema),
    totals: revenueSummaryTotalsSchema,
  }),
);

export const locationFinanceDashboardResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    streams: z.array(revenueSummaryLineSchema),
    totals: revenueSummaryTotalsSchema,
    totalPayoutAmountCents: z.number().int().nonnegative(),
    draftPayoutAmountCents: z.number().int().nonnegative(),
    approvedPayoutAmountCents: z.number().int().nonnegative(),
    paidPayoutAmountCents: z.number().int().nonnegative(),
    payoutRunCount: z.number().int().nonnegative(),
    latestPayoutRunStatus: providerPayoutRunStatusSchema.optional(),
  }),
);

export const referralPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    programCount: z.number().int().nonnegative(),
    activeProgramCount: z.number().int().nonnegative(),
    relationshipCount: z.number().int().nonnegative(),
    qualifiedRelationshipCount: z.number().int().nonnegative(),
    rewardEventCount: z.number().int().nonnegative(),
    totalRewardAmount: moneySchema,
    totalQualifiedRevenueAmount: moneySchema,
  }),
);

export const membershipPlanPerformanceLineSchema = z.object({
  planSlug: z.string().min(1),
  planName: z.string().min(1),
  educationOnly: z.boolean(),
  totalSubscriptions: z.number().int().nonnegative(),
  activeSubscriptionCount: z.number().int().nonnegative(),
  pendingSubscriptionCount: z.number().int().nonnegative(),
  cancelledSubscriptionCount: z.number().int().nonnegative(),
  activeRecurringAmount: moneySchema,
  grossMembershipRevenueAmount: moneySchema,
  netMembershipRevenueAmount: moneySchema,
  refundedMembershipRevenueAmount: moneySchema,
  serviceAllowanceTotalQuantity: z.number().int().nonnegative(),
  serviceAllowanceUsedQuantity: z.number().int().nonnegative(),
  serviceAllowanceRemainingQuantity: z.number().int().nonnegative(),
});

export const operationsConversionSummarySchema = z.object({
  searchCount: z.number().int().nonnegative(),
  waitlistCount: z.number().int().nonnegative(),
  bookingCreatedCount: z.number().int().nonnegative(),
  paidBookingCount: z.number().int().nonnegative(),
  paidBookingOrderCount: z.number().int().nonnegative(),
  paidServiceRevenueAmount: moneySchema,
  searchToBookingRate: z.number().nonnegative(),
  searchToPaidBookingRate: z.number().nonnegative(),
});

export const servicePerformanceLineSchema = operationsConversionSummarySchema.extend({
  serviceSlug: z.string().min(1),
  serviceName: z.string().min(1),
});

export const machinePerformanceLineSchema = z.object({
  machineSlug: z.string().min(1),
  machineName: z.string().min(1),
  bookingCount: z.number().int().nonnegative(),
  bookedMinutes: z.number().int().nonnegative(),
  availableMinutes: z.number().int().nonnegative(),
  utilizationPercent: z.number().nonnegative(),
  paidServiceRevenueAmount: moneySchema,
});

export const roomPerformanceLineSchema = z.object({
  roomSlug: z.string().min(1),
  roomName: z.string().min(1),
  bookingCount: z.number().int().nonnegative(),
  bookedMinutes: z.number().int().nonnegative(),
  availableMinutes: z.number().int().nonnegative(),
  utilizationPercent: z.number().nonnegative(),
  paidServiceRevenueAmount: moneySchema,
});

export const treatmentPlanFunnelSummarySchema = z.object({
  createdCount: z.number().int().nonnegative(),
  sharedCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  bookedCount: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
  paidRevenueAmount: moneySchema,
  createdToSharedRate: z.number().nonnegative(),
  sharedToAcceptedRate: z.number().nonnegative(),
  acceptedToBookedRate: z.number().nonnegative(),
  bookedToPaidRate: z.number().nonnegative(),
  createdToPaidRate: z.number().nonnegative(),
});

export const treatmentPlanServicePerformanceLineSchema =
  treatmentPlanFunnelSummarySchema.extend({
    serviceSlug: z.string().min(1),
    serviceName: z.string().min(1),
  });

export const multiLocationBenchmarkLineSchema = z.object({
  locationSlug: locationSlugSchema,
  locationName: z.string().min(1),
  organizationId: z.string().min(1),
  organizationSlug: z.string().min(1),
  organizationName: z.string().min(1),
  organizationOperatingMode: z.enum(["corporate", "franchise"]),
  netRevenueAmount: moneySchema,
  paidServiceRevenueAmount: moneySchema,
  paidBookingCount: z.number().int().nonnegative(),
  searchToPaidBookingRate: z.number().nonnegative(),
  activeMembershipCount: z.number().int().nonnegative(),
  activeRecurringAmount: moneySchema,
  treatmentPlanCreatedCount: z.number().int().nonnegative(),
  treatmentPlanPaidCount: z.number().int().nonnegative(),
  treatmentPlanCreatedToPaidRate: z.number().nonnegative(),
  skinAssessmentCount: z.number().int().nonnegative(),
  attributedSkinAssessmentRevenueAmount: moneySchema,
  machineUtilizationPercent: z.number().nonnegative(),
  revenueRank: z.number().int().positive(),
  conversionRank: z.number().int().positive(),
  activeRecurringRank: z.number().int().positive(),
  peerDelta: z.object({
    peerLocationCount: z.number().int().nonnegative(),
    netRevenueAmount: signedMoneySchema,
    paidServiceRevenueAmount: signedMoneySchema,
    searchToPaidBookingRate: z.number(),
    activeMembershipCount: z.number().int(),
    activeRecurringAmount: signedMoneySchema,
    treatmentPlanCreatedToPaidRate: z.number(),
    skinAssessmentCount: z.number(),
    machineUtilizationPercent: z.number(),
  }),
});

export const multiLocationBenchmarkTotalsSchema = z.object({
  locationCount: z.number().int().nonnegative(),
  netRevenueAmount: moneySchema,
  paidServiceRevenueAmount: moneySchema,
  paidBookingCount: z.number().int().nonnegative(),
  activeMembershipCount: z.number().int().nonnegative(),
  activeRecurringAmount: moneySchema,
  treatmentPlanCreatedCount: z.number().int().nonnegative(),
  treatmentPlanPaidCount: z.number().int().nonnegative(),
  skinAssessmentCount: z.number().int().nonnegative(),
  attributedSkinAssessmentRevenueAmount: moneySchema,
});

export const multiLocationBenchmarkPeerAveragesSchema = z.object({
  locationCount: z.number().int().nonnegative(),
  averageNetRevenueAmount: moneySchema,
  averagePaidServiceRevenueAmount: moneySchema,
  averagePaidBookingCount: z.number().nonnegative(),
  averageSearchToPaidBookingRate: z.number().nonnegative(),
  averageActiveMembershipCount: z.number().nonnegative(),
  averageActiveRecurringAmount: moneySchema,
  averageTreatmentPlanCreatedToPaidRate: z.number().nonnegative(),
  averageSkinAssessmentCount: z.number().nonnegative(),
  averageMachineUtilizationPercent: z.number().nonnegative(),
});

export const skinAssessmentConcernPerformanceLineSchema = z.object({
  concernKey: z.string().min(1),
  label: z.string().min(1),
  assessmentCount: z.number().int().nonnegative(),
  averageSeverityScore: z.number().nonnegative(),
  highSeverityCount: z.number().int().nonnegative(),
});

export const skinAssessmentServiceRecommendationLineSchema = z.object({
  serviceSlug: z.string().min(1),
  serviceName: z.string().min(1),
  recommendationCount: z.number().int().nonnegative(),
  uniqueCustomerCount: z.number().int().nonnegative(),
});

export const skinAssessmentUnresolvedRecommendationLineSchema = z.object({
  serviceSlug: z.string().min(1),
  recommendationCount: z.number().int().nonnegative(),
});

export const membershipPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    plans: z.array(membershipPlanPerformanceLineSchema),
    totals: z.object({
      totalSubscriptions: z.number().int().nonnegative(),
      activeSubscriptionCount: z.number().int().nonnegative(),
      pendingSubscriptionCount: z.number().int().nonnegative(),
      cancelledSubscriptionCount: z.number().int().nonnegative(),
      educationOnlyActiveSubscriptionCount: z.number().int().nonnegative(),
      serviceMembershipActiveSubscriptionCount: z.number().int().nonnegative(),
      activeRecurringAmount: moneySchema,
      grossMembershipRevenueAmount: moneySchema,
      netMembershipRevenueAmount: moneySchema,
      refundedMembershipRevenueAmount: moneySchema,
      serviceAllowanceTotalQuantity: z.number().int().nonnegative(),
      serviceAllowanceUsedQuantity: z.number().int().nonnegative(),
      serviceAllowanceRemainingQuantity: z.number().int().nonnegative(),
    }),
  }),
);

export const operationsPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    conversion: operationsConversionSummarySchema,
    services: z.array(servicePerformanceLineSchema),
    machines: z.array(machinePerformanceLineSchema),
    rooms: z.array(roomPerformanceLineSchema),
  }),
);

export const treatmentPlanPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    funnel: treatmentPlanFunnelSummarySchema,
    services: z.array(treatmentPlanServicePerformanceLineSchema),
  }),
);

export const multiLocationBenchmarkReportResponseSchema = successEnvelope(
  z.object({
    organization: z
      .object({
        id: z.string().min(1),
        slug: z.string().min(1),
        name: z.string().min(1),
        operatingMode: z.enum(["corporate", "franchise"]),
      })
      .optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/),
    totals: multiLocationBenchmarkTotalsSchema,
    peerAverages: multiLocationBenchmarkPeerAveragesSchema,
    locations: z.array(multiLocationBenchmarkLineSchema),
  }),
);

export const skinAssessmentPerformanceReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    assessmentCount: z.number().int().nonnegative(),
    uniqueCustomerCount: z.number().int().nonnegative(),
    withImagesCount: z.number().int().nonnegative(),
    averageConfidenceScore: z.number().nonnegative().nullable(),
    mappedRecommendationCount: z.number().int().nonnegative(),
    unresolvedRecommendationCount: z.number().int().nonnegative(),
    attributedBookingCount: z.number().int().nonnegative(),
    attributedPaidBookingCount: z.number().int().nonnegative(),
    attributedPaidRevenueAmount: moneySchema,
    assessmentToBookingRate: z.number().nonnegative(),
    assessmentToPaidBookingRate: z.number().nonnegative(),
    concerns: z.array(skinAssessmentConcernPerformanceLineSchema),
    recommendedServices: z.array(skinAssessmentServiceRecommendationLineSchema),
    unresolvedRecommendations: z.array(skinAssessmentUnresolvedRecommendationLineSchema),
  }),
);
