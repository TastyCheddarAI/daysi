import { randomUUID } from "node:crypto";

import type { BookingRecord } from "./bookings";
import { calculateAccountCreditBalance, type CreditEntry } from "./credits";
import type { LearningEntitlement } from "./learning";
import type { MembershipSubscription } from "./memberships";
import type { OrderRecord } from "./commerce";
import type { SkinAssessmentRecord } from "./skin-assessments";

export interface CustomerNote {
  id: string;
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  body: string;
  createdByUserId?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTag {
  id: string;
  locationSlug: string;
  customerEmail: string;
  label: string;
  createdByUserId?: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface CustomerEventRecord {
  id: string;
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  actorUserId?: string;
  source:
    | "booking"
    | "commerce"
    | "learning"
    | "referral"
    | "ai"
    | "skinAnalysis"
    | "manual";
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface CustomerSegment {
  key:
    | "active_member"
    | "education_customer"
    | "referred_customer"
    | "repeat_booker"
    | "credit_balance_holder";
  label: string;
  reason: string;
}

export interface CustomerContextView {
  customerEmail: string;
  customerName?: string;
  locationSlug: string;
  notes: CustomerNote[];
  tags: CustomerTag[];
  segments: CustomerSegment[];
  latestSkinAssessments: Array<{
    assessmentId: string;
    capturedAt: string;
    summary: string;
    dominantConcernKeys: string[];
    recommendedServiceSlugs: string[];
    unresolvedRecommendedServiceSlugs: string[];
    imageCount: number;
  }>;
  recentEvents: CustomerEventRecord[];
  summary: {
    bookingCount: number;
    paidOrderCount: number;
    activeSubscriptionCount: number;
    activeEntitlementCount: number;
    activeCreditAmountCents: number;
    skinAssessmentCount: number;
    latestSkinAssessmentAt?: string;
    lastSeenAt?: string;
  };
}

export interface CustomerDirectoryEntry {
  customerEmail: string;
  customerName?: string;
  locationSlug: string;
  tags: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
  segments: CustomerSegment[];
  summary: {
    bookingCount: number;
    paidOrderCount: number;
    activeSubscriptionCount: number;
    activeEntitlementCount: number;
    activeCreditAmountCents: number;
    totalPaidRevenueAmountCents: number;
    skinAssessmentCount: number;
    latestSkinAssessmentAt?: string;
    lastSeenAt?: string;
  };
}

export interface CustomerDirectoryView {
  customers: CustomerDirectoryEntry[];
  stats: {
    totalCustomers: number;
    activeMembershipCustomerCount: number;
    educationCustomerCount: number;
    repeatBookerCount: number;
    totalBookingCount: number;
    totalPaidOrderCount: number;
    totalPaidRevenueAmountCents: number;
    totalActiveCreditAmountCents: number;
    totalSkinAssessmentCount: number;
  };
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const matchesCustomerEmail = (candidate: string | undefined, customerEmail: string): boolean =>
  !!candidate && normalizeEmail(candidate) === normalizeEmail(customerEmail);

export const createCustomerNote = (input: {
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  body: string;
  createdByUserId?: string;
  createdByEmail?: string;
  now?: string;
}): CustomerNote => {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `cnote_${randomUUID()}`,
    locationSlug: input.locationSlug,
    customerEmail: normalizeEmail(input.customerEmail),
    customerName: input.customerName,
    body: input.body.trim(),
    createdByUserId: input.createdByUserId,
    createdByEmail: input.createdByEmail ? normalizeEmail(input.createdByEmail) : undefined,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateCustomerNote = (input: {
  note: CustomerNote;
  body: string;
  now?: string;
}): CustomerNote => ({
  ...input.note,
  body: input.body.trim(),
  updatedAt: input.now ?? new Date().toISOString(),
});

export const createCustomerTag = (input: {
  locationSlug: string;
  customerEmail: string;
  label: string;
  createdByUserId?: string;
  createdByEmail?: string;
  now?: string;
}): CustomerTag => ({
  id: `ctag_${randomUUID()}`,
  locationSlug: input.locationSlug,
  customerEmail: normalizeEmail(input.customerEmail),
  label: input.label.trim(),
  createdByUserId: input.createdByUserId,
  createdByEmail: input.createdByEmail ? normalizeEmail(input.createdByEmail) : undefined,
  createdAt: input.now ?? new Date().toISOString(),
});

export const createCustomerEventRecord = (input: {
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  actorUserId?: string;
  source: CustomerEventRecord["source"];
  eventType: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
}): CustomerEventRecord => ({
  id: `cevt_${randomUUID()}`,
  locationSlug: input.locationSlug,
  customerEmail: normalizeEmail(input.customerEmail),
  customerName: input.customerName,
  actorUserId: input.actorUserId,
  source: input.source,
  eventType: input.eventType,
  payload: input.payload ?? {},
  occurredAt: input.occurredAt ?? new Date().toISOString(),
});

export const buildCustomerSegments = (input: {
  locationSlug: string;
  customerEmail: string;
  notes: CustomerNote[];
  tags: CustomerTag[];
  events: CustomerEventRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  subscriptions: MembershipSubscription[];
  entitlements: LearningEntitlement[];
  creditEntries: CreditEntry[];
}): CustomerSegment[] => {
  const segments: CustomerSegment[] = [];
  const activeSubscriptions = input.subscriptions.filter(
    (subscription) => subscription.status === "active",
  );
  const activeEntitlements = input.entitlements.filter(
    (entitlement) => entitlement.status === "active",
  );
  const paidOrders = input.orders.filter((order) => order.status === "paid");
  const activeCreditAmount = calculateAccountCreditBalance(input.creditEntries).amountCents;

  if (activeSubscriptions.length > 0) {
    segments.push({
      key: "active_member",
      label: "Active Member",
      reason: `${activeSubscriptions.length} active membership subscription(s).`,
    });
  }

  if (activeEntitlements.length > 0) {
    segments.push({
      key: "education_customer",
      label: "Education Customer",
      reason: `${activeEntitlements.length} active education entitlement(s).`,
    });
  }

  if (input.events.some((event) => event.eventType.startsWith("referral."))) {
    segments.push({
      key: "referred_customer",
      label: "Referral Customer",
      reason: "Referral activity is present in the event history.",
    });
  }

  if (input.bookings.length >= 2) {
    segments.push({
      key: "repeat_booker",
      label: "Repeat Booker",
      reason: `${input.bookings.length} bookings recorded at this location.`,
    });
  }

  if (activeCreditAmount > 0) {
    segments.push({
      key: "credit_balance_holder",
      label: "Credit Balance Holder",
      reason: `${activeCreditAmount} cents of available credit remains on account.`,
    });
  }

  return segments;
};

export const buildCustomerContextView = (input: {
  locationSlug: string;
  customerEmail: string;
  notes: CustomerNote[];
  tags: CustomerTag[];
  events: CustomerEventRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  subscriptions: MembershipSubscription[];
  entitlements: LearningEntitlement[];
  creditEntries: CreditEntry[];
  skinAssessments: SkinAssessmentRecord[];
}): CustomerContextView => {
  const customerName =
    input.notes[0]?.customerName ??
    input.events.find((event) => event.customerName)?.customerName ??
    input.orders[0]?.customer.firstName
      ? `${input.orders[0]?.customer.firstName ?? ""} ${input.orders[0]?.customer.lastName ?? ""}`.trim()
      : undefined;
  const recentEvents = [...input.events].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
  const lastSeenAt = recentEvents[0]?.occurredAt;
  const latestSkinAssessments = [...input.skinAssessments]
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .slice(0, 3)
    .map((assessment) => ({
      assessmentId: assessment.id,
      capturedAt: assessment.capturedAt,
      summary: assessment.summary,
      dominantConcernKeys: assessment.dominantConcernKeys,
      recommendedServiceSlugs: assessment.recommendedServiceSlugs,
      unresolvedRecommendedServiceSlugs: assessment.unresolvedRecommendedServiceSlugs,
      imageCount: assessment.imageCount,
    }));
  const latestSkinAssessmentAt = latestSkinAssessments[0]?.capturedAt;

  return {
    customerEmail: normalizeEmail(input.customerEmail),
    customerName: customerName || undefined,
    locationSlug: input.locationSlug,
    notes: [...input.notes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    tags: [...input.tags].sort((left, right) => left.label.localeCompare(right.label)),
    segments: buildCustomerSegments(input),
    latestSkinAssessments,
    recentEvents,
    summary: {
      bookingCount: input.bookings.length,
      paidOrderCount: input.orders.filter((order) => order.status === "paid").length,
      activeSubscriptionCount: input.subscriptions.filter(
        (subscription) => subscription.status === "active",
      ).length,
      activeEntitlementCount: input.entitlements.filter(
        (entitlement) => entitlement.status === "active",
      ).length,
      activeCreditAmountCents: calculateAccountCreditBalance(input.creditEntries).amountCents,
      skinAssessmentCount: input.skinAssessments.length,
      latestSkinAssessmentAt,
      lastSeenAt,
    },
  };
};

export const buildCustomerDirectoryView = (input: {
  locationSlug: string;
  notes: CustomerNote[];
  tags: CustomerTag[];
  events: CustomerEventRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  subscriptions: MembershipSubscription[];
  entitlements: LearningEntitlement[];
  creditEntries: CreditEntry[];
  skinAssessments: SkinAssessmentRecord[];
}): CustomerDirectoryView => {
  const scopedEmails = new Set<string>();

  for (const note of input.notes) {
    if (note.locationSlug === input.locationSlug) scopedEmails.add(normalizeEmail(note.customerEmail));
  }
  for (const tag of input.tags) {
    if (tag.locationSlug === input.locationSlug) scopedEmails.add(normalizeEmail(tag.customerEmail));
  }
  for (const event of input.events) {
    if (event.locationSlug === input.locationSlug) scopedEmails.add(normalizeEmail(event.customerEmail));
  }
  for (const booking of input.bookings) {
    if (booking.locationSlug === input.locationSlug) scopedEmails.add(normalizeEmail(booking.customer.email));
  }
  for (const order of input.orders) {
    if (order.locationSlug === input.locationSlug) scopedEmails.add(normalizeEmail(order.customer.email));
  }
  for (const subscription of input.subscriptions) {
    if (subscription.locationSlug === input.locationSlug) {
      scopedEmails.add(normalizeEmail(subscription.customerEmail));
    }
  }
  for (const entitlement of input.entitlements) {
    if (entitlement.locationSlug === input.locationSlug) {
      scopedEmails.add(normalizeEmail(entitlement.customerEmail));
    }
  }
  for (const assessment of input.skinAssessments) {
    if (assessment.locationSlug === input.locationSlug) {
      scopedEmails.add(normalizeEmail(assessment.customerEmail));
    }
  }

  const customers = [...scopedEmails]
    .map((customerEmail) => {
      const context = buildCustomerContextView({
        locationSlug: input.locationSlug,
        customerEmail,
        notes: filterCustomerNotes({
          notes: input.notes,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        tags: filterCustomerTags({
          tags: input.tags,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        events: filterCustomerEvents({
          events: input.events,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        bookings: filterCustomerBookings({
          bookings: input.bookings,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        orders: filterCustomerOrders({
          orders: input.orders,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        subscriptions: filterCustomerSubscriptions({
          subscriptions: input.subscriptions,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        entitlements: filterCustomerLearningEntitlements({
          entitlements: input.entitlements,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
        creditEntries: filterCustomerCreditEntries({
          creditEntries: input.creditEntries,
          customerEmail,
        }),
        skinAssessments: filterCustomerSkinAssessments({
          assessments: input.skinAssessments,
          locationSlug: input.locationSlug,
          customerEmail,
        }),
      });

      const totalPaidRevenueAmountCents = input.orders
        .filter(
          (order) =>
            order.locationSlug === input.locationSlug &&
            matchesCustomerEmail(order.customer.email, customerEmail) &&
            order.status === "paid",
        )
        .reduce((total, order) => total + order.totalAmount.amountCents, 0);

      return {
        customerEmail: context.customerEmail,
        customerName: context.customerName,
        locationSlug: context.locationSlug,
        tags: context.tags.map((tag) => ({
          id: tag.id,
          label: tag.label,
          createdAt: tag.createdAt,
        })),
        segments: context.segments,
        summary: {
          bookingCount: context.summary.bookingCount,
          paidOrderCount: context.summary.paidOrderCount,
          activeSubscriptionCount: context.summary.activeSubscriptionCount,
          activeEntitlementCount: context.summary.activeEntitlementCount,
          activeCreditAmountCents: context.summary.activeCreditAmountCents,
          totalPaidRevenueAmountCents,
          skinAssessmentCount: context.summary.skinAssessmentCount,
          latestSkinAssessmentAt: context.summary.latestSkinAssessmentAt,
          lastSeenAt: context.summary.lastSeenAt,
        },
      };
    })
    .sort((left, right) => {
      const lastSeenDelta = (right.summary.lastSeenAt ?? "").localeCompare(left.summary.lastSeenAt ?? "");
      if (lastSeenDelta !== 0) {
        return lastSeenDelta;
      }

      const revenueDelta =
        right.summary.totalPaidRevenueAmountCents - left.summary.totalPaidRevenueAmountCents;
      if (revenueDelta !== 0) {
        return revenueDelta;
      }

      return left.customerEmail.localeCompare(right.customerEmail);
    });

  return {
    customers,
    stats: {
      totalCustomers: customers.length,
      activeMembershipCustomerCount: customers.filter(
        (customer) => customer.summary.activeSubscriptionCount > 0,
      ).length,
      educationCustomerCount: customers.filter(
        (customer) => customer.summary.activeEntitlementCount > 0,
      ).length,
      repeatBookerCount: customers.filter((customer) => customer.summary.bookingCount >= 2).length,
      totalBookingCount: customers.reduce(
        (total, customer) => total + customer.summary.bookingCount,
        0,
      ),
      totalPaidOrderCount: customers.reduce(
        (total, customer) => total + customer.summary.paidOrderCount,
        0,
      ),
      totalPaidRevenueAmountCents: customers.reduce(
        (total, customer) => total + customer.summary.totalPaidRevenueAmountCents,
        0,
      ),
      totalActiveCreditAmountCents: customers.reduce(
        (total, customer) => total + customer.summary.activeCreditAmountCents,
        0,
      ),
      totalSkinAssessmentCount: customers.reduce(
        (total, customer) => total + customer.summary.skinAssessmentCount,
        0,
      ),
    },
  };
};

export const filterCustomerNotes = (input: {
  notes: CustomerNote[];
  locationSlug: string;
  customerEmail: string;
}): CustomerNote[] =>
  input.notes.filter(
    (note) =>
      note.locationSlug === input.locationSlug &&
      matchesCustomerEmail(note.customerEmail, input.customerEmail),
  );

export const filterCustomerTags = (input: {
  tags: CustomerTag[];
  locationSlug: string;
  customerEmail: string;
}): CustomerTag[] =>
  input.tags.filter(
    (tag) =>
      tag.locationSlug === input.locationSlug &&
      matchesCustomerEmail(tag.customerEmail, input.customerEmail),
  );

export const filterCustomerEvents = (input: {
  events: CustomerEventRecord[];
  locationSlug: string;
  customerEmail: string;
}): CustomerEventRecord[] =>
  input.events.filter(
    (event) =>
      event.locationSlug === input.locationSlug &&
      matchesCustomerEmail(event.customerEmail, input.customerEmail),
  );

export const filterCustomerBookings = (input: {
  bookings: BookingRecord[];
  locationSlug: string;
  customerEmail: string;
}): BookingRecord[] =>
  input.bookings.filter(
    (booking) =>
      booking.locationSlug === input.locationSlug &&
      matchesCustomerEmail(booking.customer.email, input.customerEmail),
  );

export const filterCustomerOrders = (input: {
  orders: OrderRecord[];
  locationSlug: string;
  customerEmail: string;
}): OrderRecord[] =>
  input.orders.filter(
    (order) =>
      order.locationSlug === input.locationSlug &&
      matchesCustomerEmail(order.customer.email, input.customerEmail),
  );

export const filterCustomerSubscriptions = (input: {
  subscriptions: MembershipSubscription[];
  locationSlug: string;
  customerEmail: string;
}): MembershipSubscription[] =>
  input.subscriptions.filter(
    (subscription) =>
      subscription.locationSlug === input.locationSlug &&
      matchesCustomerEmail(subscription.customerEmail, input.customerEmail),
  );

export const filterCustomerLearningEntitlements = (input: {
  entitlements: LearningEntitlement[];
  locationSlug: string;
  customerEmail: string;
}): LearningEntitlement[] =>
  input.entitlements.filter(
    (entitlement) =>
      entitlement.locationSlug === input.locationSlug &&
      matchesCustomerEmail(entitlement.customerEmail, input.customerEmail),
  );

export const filterCustomerCreditEntries = (input: {
  creditEntries: CreditEntry[];
  customerEmail: string;
}): CreditEntry[] =>
  input.creditEntries.filter((entry) =>
    matchesCustomerEmail(entry.customerEmail, input.customerEmail),
  );

export const filterCustomerSkinAssessments = (input: {
  assessments: SkinAssessmentRecord[];
  locationSlug: string;
  customerEmail: string;
}): SkinAssessmentRecord[] =>
  input.assessments.filter(
    (assessment) =>
      assessment.locationSlug === input.locationSlug &&
      matchesCustomerEmail(assessment.customerEmail, input.customerEmail),
  );
