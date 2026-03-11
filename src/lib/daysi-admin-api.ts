import {
  DAYSI_API_BASE_URL,
  DAYSI_DEFAULT_LOCATION_SLUG,
  type DaysiAvailabilitySlot,
  type DaysiBusinessProfile,
  type DaysiPublicProduct,
  type DaysiPublicService,
  type DaysiPublicServicePackage,
} from "@/lib/daysi-public-api";
import {
  exchangeDaysiBootstrapSessionForRole,
  type DaysiBootstrapRole,
  type DaysiReferralProgram,
  type DaysiSession,
} from "@/lib/daysi-auth-api";

export interface DaysiAdminBookingRecord {
  id: string;
  code: string;
  locationSlug: string;
  sourceAssessmentId?: string;
  sourceTreatmentPlanId?: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  serviceName: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  providerSlug: string;
  providerName: string;
  machineSlug: string;
  machineName: string;
  roomSlug?: string;
  roomName?: string;
  status: "confirmed" | "cancelled";
  startAt: string;
  endAt: string;
  charge: {
    currency: string;
    retailAmountCents: number;
    memberAmountCents?: number;
    finalAmountCents: number;
    membershipRequired: boolean;
    appliedPricingMode: "retail" | "membership";
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledReason?: string;
  statusHistory: Array<{
    status: "confirmed" | "cancelled";
    recordedAt: string;
    note?: string;
  }>;
}

export interface DaysiAdminProviderSummary {
  providerSlug: string;
  providerName: string;
  email: string;
  locationSlug: string;
  serviceSlugs: string[];
  commissionPercent: number;
}

export interface DaysiAdminRoleAssignment {
  id: string;
  email: string;
  role: "staff" | "admin" | "owner";
  locationScopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DaysiCustomerContext {
  customerEmail: string;
  customerName?: string;
  locationSlug: string;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    updatedAt: string;
  }>;
  tags: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
  segments: Array<{
    key:
      | "active_member"
      | "education_customer"
      | "referred_customer"
      | "repeat_booker"
      | "credit_balance_holder";
    label: string;
    reason: string;
  }>;
  latestSkinAssessments: Array<{
    assessmentId: string;
    capturedAt: string;
    summary: string;
    dominantConcernKeys: string[];
    recommendedServiceSlugs: string[];
    unresolvedRecommendedServiceSlugs: string[];
    imageCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    source: string;
    eventType: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }>;
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

export interface DaysiCustomerDirectoryEntry {
  customerEmail: string;
  customerName?: string;
  locationSlug: string;
  tags: Array<{
    id: string;
    label: string;
    createdAt: string;
  }>;
  segments: Array<{
    key:
      | "active_member"
      | "education_customer"
      | "referred_customer"
      | "repeat_booker"
      | "credit_balance_holder";
    label: string;
    reason: string;
  }>;
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

export interface DaysiCustomerDirectoryStats {
  totalCustomers: number;
  activeMembershipCustomerCount: number;
  educationCustomerCount: number;
  repeatBookerCount: number;
  totalBookingCount: number;
  totalPaidOrderCount: number;
  totalPaidRevenueAmountCents: number;
  totalActiveCreditAmountCents: number;
  totalSkinAssessmentCount: number;
}

export interface DaysiAdminEducationOffer {
  id: string;
  slug: string;
  locationSlug: string;
  title: string;
  shortDescription: string;
  status: "draft" | "published";
  moduleSlugs: string[];
  membershipEligible: boolean;
  staffGrantEnabled: boolean;
  requiresEntitlement: true;
  price: {
    currency: string;
    amountCents: number;
    isFree: boolean;
  };
}

export interface DaysiAdminLearningEntitlement {
  id: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  source: "purchase" | "membership" | "admin_grant";
  membershipSubscriptionId?: string;
  sourceOrderId?: string;
  grantedByUserId?: string;
  status: "active" | "revoked";
  grantedAt: string;
  revokedAt?: string;
}

export interface DaysiLearningCertificate {
  id: string;
  enrollmentId: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  issuedAt: string;
}

export interface DaysiLearningEnrollmentView {
  enrollment: {
    id: string;
    locationSlug: string;
    educationOfferSlug: string;
    educationOfferTitle: string;
    moduleSlugs: string[];
    customerEmail: string;
    customerName: string;
    actorUserId?: string;
    entitlementId: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  };
  lessonProgress: Array<{
    id: string;
    enrollmentId: string;
    moduleSlug: string;
    status: "not_started" | "in_progress" | "completed";
    percentComplete: number;
    startedAt?: string;
    completedAt?: string;
    updatedAt: string;
  }>;
  summary: {
    totalModules: number;
    completedModules: number;
    percentComplete: number;
  };
  certificate: DaysiLearningCertificate | null;
}

export interface DaysiAdminLearningStats {
  locationSlug: string;
  totals: {
    activeEntitlementCount: number;
    enrollmentCount: number;
    completedEnrollmentCount: number;
    inProgressEnrollmentCount: number;
    certificateCount: number;
    completionRate: number;
  };
  offers: Array<{
    offerSlug: string;
    offerTitle: string;
    activeEntitlementCount: number;
    enrollmentCount: number;
    completedEnrollmentCount: number;
    certificateCount: number;
    averagePercentComplete: number;
  }>;
}

export interface DaysiMoney {
  currency: string;
  amountCents: number;
}

export interface DaysiRevenueStreamLine {
  revenueStream: "services" | "memberships" | "packages" | "retail" | "education";
  grossAmount: DaysiMoney;
  discountAmount: DaysiMoney;
  netAmount: DaysiMoney;
  refundedAmount: DaysiMoney;
  orderCount: number;
}

export interface DaysiRevenueSummaryReport {
  locationSlug: string;
  currency: string;
  streams: DaysiRevenueStreamLine[];
  totals: {
    grossAmount: DaysiMoney;
    discountAmount: DaysiMoney;
    netAmount: DaysiMoney;
    refundedAmount: DaysiMoney;
    orderCount: number;
  };
}

export interface DaysiLocationFinanceDashboard {
  locationSlug: string;
  currency: string;
  streams: DaysiRevenueStreamLine[];
  totals: {
    grossAmount: DaysiMoney;
    discountAmount: DaysiMoney;
    netAmount: DaysiMoney;
    refundedAmount: DaysiMoney;
    orderCount: number;
  };
  totalPayoutAmountCents: number;
  draftPayoutAmountCents: number;
  approvedPayoutAmountCents: number;
  paidPayoutAmountCents: number;
  payoutRunCount: number;
  latestPayoutRunStatus?: "draft" | "approved" | "paid";
}

export interface DaysiMembershipPerformanceReport {
  locationSlug: string;
  currency: string;
  plans: Array<{
    planSlug: string;
    planName: string;
    educationOnly: boolean;
    totalSubscriptions: number;
    activeSubscriptionCount: number;
    pendingSubscriptionCount: number;
    cancelledSubscriptionCount: number;
    activeRecurringAmount: DaysiMoney;
    grossMembershipRevenueAmount: DaysiMoney;
    netMembershipRevenueAmount: DaysiMoney;
    refundedMembershipRevenueAmount: DaysiMoney;
    serviceAllowanceTotalQuantity: number;
    serviceAllowanceUsedQuantity: number;
    serviceAllowanceRemainingQuantity: number;
  }>;
  totals: {
    totalSubscriptions: number;
    activeSubscriptionCount: number;
    pendingSubscriptionCount: number;
    cancelledSubscriptionCount: number;
    educationOnlyActiveSubscriptionCount: number;
    serviceMembershipActiveSubscriptionCount: number;
    activeRecurringAmount: { currency: string; amountCents: number };
    grossMembershipRevenueAmount: { currency: string; amountCents: number };
    netMembershipRevenueAmount: { currency: string; amountCents: number };
    refundedMembershipRevenueAmount: { currency: string; amountCents: number };
    serviceAllowanceTotalQuantity: number;
    serviceAllowanceUsedQuantity: number;
    serviceAllowanceRemainingQuantity: number;
  };
}

export interface DaysiOperationsPerformanceReport {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  currency: string;
  conversion: {
    searchCount: number;
    waitlistCount: number;
    bookingCreatedCount: number;
    paidBookingCount: number;
    paidBookingOrderCount: number;
    paidServiceRevenueAmount: { currency: string; amountCents: number };
    searchToBookingRate: number;
    searchToPaidBookingRate: number;
  };
  services: Array<{
    serviceSlug: string;
    serviceName: string;
    searchCount: number;
    waitlistCount: number;
    bookingCreatedCount: number;
    paidBookingCount: number;
    paidBookingOrderCount: number;
    paidServiceRevenueAmount: DaysiMoney;
    searchToBookingRate: number;
    searchToPaidBookingRate: number;
  }>;
  machines: Array<{
    machineSlug: string;
    machineName: string;
    bookingCount: number;
    bookedMinutes: number;
    availableMinutes: number;
    utilizationPercent: number;
    paidServiceRevenueAmount: { currency: string; amountCents: number };
  }>;
  rooms: Array<{
    roomSlug: string;
    roomName: string;
    bookingCount: number;
    bookedMinutes: number;
    availableMinutes: number;
    utilizationPercent: number;
    paidServiceRevenueAmount: { currency: string; amountCents: number };
  }>;
}

export interface DaysiWebsiteAnalyticsReport {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  realtime: {
    activeVisitors: number;
    lastUpdated?: string;
  };
  summary: {
    uniqueVisitors: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    pagesPerSession: number;
    totalBookings: number;
    bookingConversionRate: number;
    ctaClicks: number;
    newsletterSubscriptions: number;
  };
  dailyData: Array<{
    date: string;
    visitors: number;
    pageViews: number;
    bookings: number;
    ctaClicks: number;
    bounceRate: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  browsers: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  topPages: Array<{
    path: string;
    views?: number;
  }>;
  entryPages: Array<{
    path: string;
    entries?: number;
    bounceRate?: number;
  }>;
  exitPages: Array<{
    path: string;
    exits?: number;
  }>;
  ctaPerformance: Array<{
    ctaName: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
}

class DaysiAdminApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiAdminApiError";
    this.statusCode = statusCode;
  }
}

const buildUrl = (path: string) =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new DaysiAdminApiError(
      payload?.error?.message ?? payload?.message ?? "Daysi admin request failed.",
      response.status,
    );
  }

  return payload.data as T;
};

const authorizedFetch = async <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
};

export const exchangeDaysiAdminSession = async (input: {
  email: string;
  displayName?: string;
  requestedRole: Extract<DaysiBootstrapRole, "staff" | "admin" | "owner">;
  locationScopes?: string[];
  password?: string;
}): Promise<DaysiSession> =>
  exchangeDaysiBootstrapSessionForRole({
    email: input.email,
    displayName: input.displayName,
    requestedRole: input.requestedRole,
    locationScopes: input.locationScopes,
    password: input.password,
  });

export const fetchDaysiAdminBusinessProfile = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiBusinessProfile | null> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });
  const data = await authorizedFetch<{ profile: DaysiBusinessProfile | null }>(
    input.token,
    `/v1/admin/business-profile?${params.toString()}`,
  );
  return data.profile;
};

export const updateDaysiAdminBusinessProfile = async (input: {
  token: string;
  locationSlug?: string;
  profile: DaysiBusinessProfile;
}): Promise<DaysiBusinessProfile> => {
  const data = await authorizedFetch<{ profile: DaysiBusinessProfile }>(
    input.token,
    "/v1/admin/business-profile",
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        profile: input.profile,
      }),
    },
  );

  return data.profile;
};

export const listDaysiAdminRoleAssignments = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiAdminRoleAssignment[]> => {
  const params = new URLSearchParams();
  if (input.locationSlug) {
    params.set("locationSlug", input.locationSlug);
  }

  const data = await authorizedFetch<{ assignments: DaysiAdminRoleAssignment[] }>(
    input.token,
    `/v1/admin/role-assignments${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
  return data.assignments;
};

export const createDaysiAdminRoleAssignment = async (input: {
  token: string;
  email: string;
  role: DaysiAdminRoleAssignment["role"];
  locationScopes: string[];
}): Promise<DaysiAdminRoleAssignment> => {
  const data = await authorizedFetch<{ assignment: DaysiAdminRoleAssignment }>(
    input.token,
    "/v1/admin/role-assignments",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        role: input.role,
        locationScopes: input.locationScopes,
      }),
    },
  );
  return data.assignment;
};

export const updateDaysiAdminRoleAssignment = async (input: {
  token: string;
  assignmentId: string;
  role?: DaysiAdminRoleAssignment["role"];
  locationScopes?: string[];
}): Promise<DaysiAdminRoleAssignment> => {
  const data = await authorizedFetch<{ assignment: DaysiAdminRoleAssignment }>(
    input.token,
    `/v1/admin/role-assignments/${input.assignmentId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: input.role,
        locationScopes: input.locationScopes,
      }),
    },
  );
  return data.assignment;
};

export const deleteDaysiAdminRoleAssignment = async (input: {
  token: string;
  assignmentId: string;
}): Promise<DaysiAdminRoleAssignment> => {
  const data = await authorizedFetch<{ assignment: DaysiAdminRoleAssignment }>(
    input.token,
    `/v1/admin/role-assignments/${input.assignmentId}`,
    {
      method: "DELETE",
    },
  );
  return data.assignment;
};

export const listDaysiAdminReferralPrograms = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiReferralProgram[]> => {
  const params = new URLSearchParams();
  if (input.locationSlug) {
    params.set("locationSlug", input.locationSlug);
  }

  const data = await authorizedFetch<{ programs: DaysiReferralProgram[] }>(
    input.token,
    `/v1/admin/referrals/programs${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
  return data.programs;
};

export const createDaysiAdminReferralProgram = async (input: {
  token: string;
  locationSlug?: string;
  name: string;
  status: DaysiReferralProgram["status"];
  codePrefix?: string;
  referredReward?: DaysiReferralProgram["referredReward"];
  advocateReward?: DaysiReferralProgram["advocateReward"];
  secondLevelReward?: DaysiReferralProgram["secondLevelReward"];
}): Promise<DaysiReferralProgram> => {
  const data = await authorizedFetch<{ program: DaysiReferralProgram }>(
    input.token,
    "/v1/admin/referrals/programs",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        name: input.name,
        status: input.status,
        codePrefix: input.codePrefix,
        referredReward: input.referredReward,
        advocateReward: input.advocateReward,
        secondLevelReward: input.secondLevelReward,
      }),
    },
  );
  return data.program;
};

export const updateDaysiAdminReferralProgram = async (input: {
  token: string;
  programId: string;
  name?: string;
  status?: DaysiReferralProgram["status"];
  codePrefix?: string;
  referredReward?: DaysiReferralProgram["referredReward"] | null;
  advocateReward?: DaysiReferralProgram["advocateReward"] | null;
  secondLevelReward?: DaysiReferralProgram["secondLevelReward"] | null;
}): Promise<DaysiReferralProgram> => {
  const data = await authorizedFetch<{ program: DaysiReferralProgram }>(
    input.token,
    `/v1/admin/referrals/programs/${input.programId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        status: input.status,
        codePrefix: input.codePrefix,
        referredReward: input.referredReward,
        advocateReward: input.advocateReward,
        secondLevelReward: input.secondLevelReward,
      }),
    },
  );
  return data.program;
};

export const listDaysiAdminBookings = async (
  token: string,
  input: {
    locationSlug?: string;
    fromDate?: string;
    toDate?: string;
    status?: "confirmed" | "cancelled";
    providerSlug?: string;
    customerEmail?: string;
  } = {},
): Promise<DaysiAdminBookingRecord[]> => {
  const params = new URLSearchParams();

  if (input.locationSlug) params.set("locationSlug", input.locationSlug);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  if (input.status) params.set("status", input.status);
  if (input.providerSlug) params.set("providerSlug", input.providerSlug);
  if (input.customerEmail) params.set("customerEmail", input.customerEmail);

  const data = await authorizedFetch<{ bookings: DaysiAdminBookingRecord[] }>(
    token,
    `/v1/admin/bookings${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
  return data.bookings;
};

export const cancelDaysiAdminBooking = async (input: {
  token: string;
  bookingId: string;
  reason?: string;
}): Promise<DaysiAdminBookingRecord> => {
  const data = await authorizedFetch<{ booking: DaysiAdminBookingRecord }>(
    input.token,
    `/v1/admin/bookings/${input.bookingId}/cancel`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        reason: input.reason,
      }),
    },
  );

  return data.booking;
};

export const rescheduleDaysiAdminBooking = async (input: {
  token: string;
  bookingId: string;
  slotId: string;
  pricingMode?: "retail" | "membership";
}): Promise<DaysiAdminBookingRecord> => {
  const data = await authorizedFetch<{ booking: DaysiAdminBookingRecord }>(
    input.token,
    `/v1/admin/bookings/${input.bookingId}/reschedule`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        slotId: input.slotId,
        pricingMode: input.pricingMode ?? "retail",
      }),
    },
  );

  return data.booking;
};

export const getDaysiBookingRebookingOptions = async (input: {
  token: string;
  bookingId: string;
  fromDate?: string;
  toDate?: string;
  pricingMode?: "retail" | "membership";
}): Promise<DaysiAvailabilitySlot[]> => {
  const params = new URLSearchParams();
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  if (input.pricingMode) params.set("pricingMode", input.pricingMode);

  const data = await authorizedFetch<{ slots: DaysiAvailabilitySlot[] }>(
    input.token,
    `/v1/bookings/${input.bookingId}/rebooking-options${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
  return data.slots;
};

export interface DaysiAdminBookingInput {
  customerId: string;
  serviceSlug: string;
  providerSlug: string;
  startTime: string;
  durationMinutes?: number;
  roomSlug?: string;
  machineSlug?: string;
  amountCents?: number;
  isMemberPrice?: boolean;
  status?: "confirmed" | "pending";
  paymentStatus?: "pending" | "paid" | "deposit";
  notes?: string;
}

export const createDaysiAdminBooking = async (input: {
  token: string;
  locationSlug?: string;
  booking: DaysiAdminBookingInput;
}): Promise<DaysiAdminBookingRecord> => {
  const data = await authorizedFetch<{ booking: DaysiAdminBookingRecord }>(
    input.token,
    `/v1/admin/bookings`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        ...input.booking,
      }),
    },
  );

  return data.booking;
};

export const listDaysiAdminProviders = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiAdminProviderSummary[]> => {
  const data = await authorizedFetch<{ providers: DaysiAdminProviderSummary[] }>(
    token,
    `/v1/admin/providers?locationSlug=${encodeURIComponent(locationSlug)}`,
  );
  return data.providers;
};

export const updateDaysiAdminProvider = async (input: {
  token: string;
  providerSlug: string;
  locationSlug?: string;
  commissionPercent?: number;
  serviceSlugs?: string[];
}): Promise<DaysiAdminProviderSummary> => {
  const data = await authorizedFetch<{ provider: DaysiAdminProviderSummary }>(
    input.token,
    `/v1/admin/providers/${encodeURIComponent(input.providerSlug)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        commissionPercent: input.commissionPercent,
        serviceSlugs: input.serviceSlugs,
      }),
    },
  );
  return data.provider;
};

export const fetchDaysiCustomerContext = async (input: {
  token: string;
  locationSlug: string;
  customerEmail: string;
}): Promise<DaysiCustomerContext> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug,
    customerEmail: input.customerEmail,
  });
  const data = await authorizedFetch<{ context: DaysiCustomerContext }>(
    input.token,
    `/v1/admin/customers/context?${params.toString()}`,
  );
  return data.context;
};

export const listDaysiAdminCustomers = async (input: {
  token: string;
  locationSlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  locationSlug: string;
  search: string;
  page: number;
  pageSize: number;
  totalCount: number;
  stats: DaysiCustomerDirectoryStats;
  customers: DaysiCustomerDirectoryEntry[];
}> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
    page: String(input.page ?? 0),
    pageSize: String(input.pageSize ?? 50),
  });

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  return authorizedFetch<{
    locationSlug: string;
    search: string;
    page: number;
    pageSize: number;
    totalCount: number;
    stats: DaysiCustomerDirectoryStats;
    customers: DaysiCustomerDirectoryEntry[];
  }>(input.token, `/v1/admin/customers?${params.toString()}`);
};

export interface DaysiAdminCustomerInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  notes?: string;
  tags?: string[];
  isVip?: boolean;
  emailConsent?: boolean;
  smsConsent?: boolean;
  marketingConsent?: boolean;
  addresses?: Array<{
    label: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  }>;
}

export const createDaysiAdminCustomer = async (input: {
  token: string;
  locationSlug?: string;
  customer: DaysiAdminCustomerInput;
}): Promise<DaysiCustomerDirectoryEntry> => {
  const response = await authorizedFetch<{ customer: DaysiCustomerDirectoryEntry }>(
    input.token,
    `/v1/admin/customers`,
    {
      method: "POST",
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        ...input.customer,
      }),
    },
  );
  return response.customer;
};

export const updateDaysiAdminCustomer = async (input: {
  token: string;
  locationSlug?: string;
  customerEmail: string;
  customer: Partial<DaysiAdminCustomerInput>;
}): Promise<DaysiCustomerDirectoryEntry> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  const response = await authorizedFetch<{ customer: DaysiCustomerDirectoryEntry }>(
    input.token,
    `/v1/admin/customers/${encodeURIComponent(input.customerEmail)}?${params.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify(input.customer),
    },
  );
  return response.customer;
};

export const createDaysiAdminCustomerNote = async (input: {
  token: string;
  locationSlug: string;
  customerEmail: string;
  customerName?: string;
  body: string;
}): Promise<{
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}> => {
  const data = await authorizedFetch<{
    note: {
      id: string;
      body: string;
      createdAt: string;
      updatedAt: string;
    };
  }>(input.token, "/v1/admin/customers/notes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locationSlug: input.locationSlug,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      body: input.body,
    }),
  });

  return data.note;
};

export const createDaysiAdminCustomerTag = async (input: {
  token: string;
  locationSlug: string;
  customerEmail: string;
  label: string;
}): Promise<{
  id: string;
  label: string;
  createdAt: string;
}> => {
  const data = await authorizedFetch<{
    tag: {
      id: string;
      label: string;
      createdAt: string;
    };
  }>(input.token, "/v1/admin/customers/tags", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locationSlug: input.locationSlug,
      customerEmail: input.customerEmail,
      label: input.label,
    }),
  });

  return data.tag;
};

export const deleteDaysiAdminCustomerTag = async (input: {
  token: string;
  tagId: string;
}): Promise<void> => {
  const response = await fetch(buildUrl(`/v1/admin/customers/tags/${input.tagId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${input.token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new DaysiAdminApiError(
      payload?.error?.message ?? payload?.message ?? "Failed to delete customer tag.",
      response.status,
    );
  }
};

export const listDaysiAdminServices = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicService[]> => {
  const data = await authorizedFetch<{ services: DaysiPublicService[] }>(
    token,
    `/v1/admin/services?locationSlug=${encodeURIComponent(locationSlug)}`,
  );
  return data.services;
};

export interface DaysiAdminServiceInput {
  slug: string;
  variantSlug: string;
  categorySlug: string;
  name: string;
  shortDescription: string;
  durationMinutes: number;
  bookable: boolean;
  retailAmountCents: number;
  memberAmountCents?: number;
  membershipRequired: boolean;
  machineCapabilities: string[];
  roomCapabilities: string[];
  featureTags: string[];
}

export const createDaysiAdminService = async (input: {
  token: string;
  locationSlug: string;
  service: DaysiAdminServiceInput;
}): Promise<DaysiPublicService> => {
  // Transform flat price fields to nested price object
  const servicePayload = {
    ...input.service,
    price: {
      currency: "CAD",
      retailAmountCents: input.service.retailAmountCents,
      memberAmountCents: input.service.memberAmountCents,
      membershipRequired: input.service.membershipRequired,
    },
  };
  const data = await authorizedFetch<{ service: DaysiPublicService }>(
    input.token,
    "/v1/admin/services",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        service: servicePayload,
      }),
    },
  );
  return data.service;
};

export const updateDaysiAdminService = async (input: {
  token: string;
  locationSlug: string;
  serviceSlug: string;
  service: Partial<DaysiAdminServiceInput>;
}): Promise<DaysiPublicService> => {
  // Transform flat price fields to nested price object if price-related fields are present
  const servicePayload: Record<string, unknown> = { ...input.service };
  if (input.service.retailAmountCents !== undefined || input.service.memberAmountCents !== undefined || input.service.membershipRequired !== undefined) {
    servicePayload.price = {
      currency: "CAD",
      retailAmountCents: input.service.retailAmountCents ?? 0,
      memberAmountCents: input.service.memberAmountCents,
      membershipRequired: input.service.membershipRequired ?? false,
    };
    delete servicePayload.retailAmountCents;
    delete servicePayload.memberAmountCents;
    delete servicePayload.membershipRequired;
  }
  
  const data = await authorizedFetch<{ service: DaysiPublicService }>(
    input.token,
    `/v1/admin/services/${encodeURIComponent(input.serviceSlug)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        service: servicePayload,
      }),
    },
  );
  return data.service;
};

export const deleteDaysiAdminService = async (input: {
  token: string;
  locationSlug: string;
  serviceSlug: string;
}): Promise<void> => {
  await authorizedFetch<{ success: boolean }>(
    input.token,
    `/v1/admin/services/${encodeURIComponent(input.serviceSlug)}?locationSlug=${encodeURIComponent(input.locationSlug)}`,
    {
      method: "DELETE",
    },
  );
};

export const pauseDaysiAdminService = async (input: {
  token: string;
  locationSlug: string;
  serviceSlug: string;
  paused: boolean;
}): Promise<DaysiPublicService> => {
  const data = await authorizedFetch<{ service: DaysiPublicService }>(
    input.token,
    `/v1/admin/services/${encodeURIComponent(input.serviceSlug)}/pause`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        paused: input.paused,
      }),
    },
  );
  return data.service;
};

export const listDaysiAdminEducationOffers = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiAdminEducationOffer[]> => {
  const data = await authorizedFetch<{ educationOffers: DaysiAdminEducationOffer[] }>(
    token,
    `/v1/admin/education/offers?locationSlug=${encodeURIComponent(locationSlug)}`,
  );
  return data.educationOffers;
};

export const createDaysiAdminEducationOffer = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
  title: string;
  shortDescription: string;
  moduleSlugs: string[];
  membershipEligible: boolean;
  staffGrantEnabled: boolean;
  status: "draft" | "published";
  price: {
    currency: string;
    amountCents: number;
    isFree: boolean;
  };
}): Promise<DaysiAdminEducationOffer> => {
  const data = await authorizedFetch<{ educationOffer: DaysiAdminEducationOffer }>(
    input.token,
    "/v1/admin/education/offers",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        slug: input.slug,
        title: input.title,
        shortDescription: input.shortDescription,
        moduleSlugs: input.moduleSlugs,
        membershipEligible: input.membershipEligible,
        staffGrantEnabled: input.staffGrantEnabled,
        status: input.status,
        price: input.price,
      }),
    },
  );

  return data.educationOffer;
};

export const updateDaysiAdminEducationOffer = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
  title?: string;
  shortDescription?: string;
  moduleSlugs?: string[];
  membershipEligible?: boolean;
  staffGrantEnabled?: boolean;
  status?: "draft" | "published";
  price?: {
    currency: string;
    amountCents: number;
    isFree: boolean;
  };
}): Promise<DaysiAdminEducationOffer> => {
  const data = await authorizedFetch<{ educationOffer: DaysiAdminEducationOffer }>(
    input.token,
    `/v1/admin/education/offers/${encodeURIComponent(input.slug)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        title: input.title,
        shortDescription: input.shortDescription,
        moduleSlugs: input.moduleSlugs,
        membershipEligible: input.membershipEligible,
        staffGrantEnabled: input.staffGrantEnabled,
        status: input.status,
        price: input.price,
      }),
    },
  );

  return data.educationOffer;
};

export const createDaysiAdminEducationGrant = async (input: {
  token: string;
  locationSlug: string;
  offerSlug: string;
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
}): Promise<DaysiAdminLearningEntitlement> => {
  const data = await authorizedFetch<{ entitlement: DaysiAdminLearningEntitlement }>(
    input.token,
    "/v1/admin/education/grants",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        offerSlug: input.offerSlug,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        actorUserId: input.actorUserId,
      }),
    },
  );

  return data.entitlement;
};

export const listDaysiAdminLearningEntitlements = async (input: {
  token: string;
  customerEmail?: string;
  actorUserId?: string;
}): Promise<DaysiAdminLearningEntitlement[]> => {
  const params = new URLSearchParams();
  if (input.customerEmail) params.set("customerEmail", input.customerEmail);
  if (input.actorUserId) params.set("actorUserId", input.actorUserId);

  const data = await authorizedFetch<{ entitlements: DaysiAdminLearningEntitlement[] }>(
    input.token,
    `/v1/admin/education/entitlements${params.size > 0 ? `?${params.toString()}` : ""}`,
  );

  return data.entitlements;
};

export const listDaysiAdminLearningEnrollments = async (input: {
  token: string;
  locationSlug?: string;
  offerSlug?: string;
  search?: string;
}): Promise<{
  locationSlug: string;
  enrollments: DaysiLearningEnrollmentView[];
}> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });
  if (input.offerSlug) params.set("offerSlug", input.offerSlug);
  if (input.search?.trim()) params.set("search", input.search.trim());

  return authorizedFetch<{
    locationSlug: string;
    enrollments: DaysiLearningEnrollmentView[];
  }>(input.token, `/v1/admin/education/enrollments?${params.toString()}`);
};

export const listDaysiAdminLearningCertificates = async (input: {
  token: string;
  locationSlug?: string;
  offerSlug?: string;
  search?: string;
}): Promise<{
  locationSlug: string;
  certificates: DaysiLearningCertificate[];
}> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });
  if (input.offerSlug) params.set("offerSlug", input.offerSlug);
  if (input.search?.trim()) params.set("search", input.search.trim());

  return authorizedFetch<{
    locationSlug: string;
    certificates: DaysiLearningCertificate[];
  }>(input.token, `/v1/admin/education/certificates?${params.toString()}`);
};

export const fetchDaysiAdminLearningStats = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiAdminLearningStats> =>
  authorizedFetch<DaysiAdminLearningStats>(
    input.token,
    `/v1/admin/education/stats?locationSlug=${encodeURIComponent(
      input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
    )}`,
  );

export const listDaysiAdminServicePackages = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicServicePackage[]> => {
  const data = await authorizedFetch<{ servicePackages: DaysiPublicServicePackage[] }>(
    token,
    `/v1/admin/packages?locationSlug=${encodeURIComponent(locationSlug)}`,
  );
  return data.servicePackages;
};

export const createDaysiAdminServicePackage = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
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
  featureTags?: string[];
}): Promise<DaysiPublicServicePackage> => {
  const data = await authorizedFetch<{ servicePackage: DaysiPublicServicePackage }>(
    input.token,
    "/v1/admin/packages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        status: input.status,
        price: input.price,
        serviceCredits: input.serviceCredits,
        featureTags: input.featureTags ?? [],
      }),
    },
  );
  return data.servicePackage;
};

export const updateDaysiAdminServicePackage = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
  name?: string;
  shortDescription?: string;
  status?: "draft" | "published";
  price?: {
    currency: string;
    amountCents: number;
  };
  serviceCredits?: Array<{
    serviceSlug: string;
    quantity: number;
  }>;
  featureTags?: string[];
}): Promise<DaysiPublicServicePackage> => {
  const data = await authorizedFetch<{ servicePackage: DaysiPublicServicePackage }>(
    input.token,
    `/v1/admin/packages/${encodeURIComponent(input.slug)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        ...(input.name && { name: input.name }),
        ...(input.shortDescription && { shortDescription: input.shortDescription }),
        ...(input.status && { status: input.status }),
        ...(input.price && { price: input.price }),
        ...(input.serviceCredits && { serviceCredits: input.serviceCredits }),
        ...(input.featureTags && { featureTags: input.featureTags }),
      }),
    },
  );
  return data.servicePackage;
};

export const deleteDaysiAdminServicePackage = async (input: {
  token: string;
  locationSlug: string;
  slug: string;
}): Promise<void> => {
  await authorizedFetch<{ deleted: boolean }>(
    input.token,
    `/v1/admin/packages/${encodeURIComponent(input.slug)}?locationSlug=${encodeURIComponent(input.locationSlug)}`,
    {
      method: "DELETE",
    },
  );
};

export interface DaysiAdminProduct {
  slug: string;
  name: string;
  description?: string;
  categorySlug: string;
  locationSlug: string;
  msrpCents: number;
  retailAmountCents: number;
  memberAmountCents: number;
  currency: string;
  durationMinutes?: number;
  taxCode?: string;
  sku?: string;
  barcode?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DaysiAdminProductInput {
  slug?: string;
  name: string;
  description?: string;
  categorySlug?: string;
  locationSlug?: string;
  msrpCents?: number;
  retailAmountCents: number;
  memberAmountCents?: number;
  currency?: string;
  durationMinutes?: number;
  taxCode?: string;
  sku?: string;
  barcode?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  imageUrl?: string;
}

export const listDaysiAdminProducts = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiAdminProduct[]> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  return authorizedFetch<{ products: DaysiAdminProduct[] }>(
    input.token,
    `/v1/admin/products?${params.toString()}`,
  ).then(data => data.products);
};

export const createDaysiAdminProduct = async (input: {
  token: string;
  locationSlug?: string;
  product: DaysiAdminProductInput;
}): Promise<DaysiAdminProduct> => {
  const response = await authorizedFetch<{ product: DaysiAdminProduct }>(
    input.token,
    `/v1/admin/products`,
    {
      method: "POST",
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        ...input.product,
      }),
    },
  );
  return response.product;
};

export const updateDaysiAdminProduct = async (input: {
  token: string;
  locationSlug?: string;
  slug: string;
  product: Partial<DaysiAdminProductInput>;
}): Promise<DaysiAdminProduct> => {
  const response = await authorizedFetch<{ product: DaysiAdminProduct }>(
    input.token,
    `/v1/admin/products/${encodeURIComponent(input.slug)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
        ...input.product,
      }),
    },
  );
  return response.product;
};

export const deleteDaysiAdminProduct = async (input: {
  token: string;
  locationSlug?: string;
  slug: string;
}): Promise<void> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  await authorizedFetch<Record<string, never>>(
    input.token,
    `/v1/admin/products/${encodeURIComponent(input.slug)}?${params.toString()}`,
    {
      method: "DELETE",
    },
  );
};

export const fetchDaysiRevenueSummaryReport = async (input: {
  token: string;
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DaysiRevenueSummaryReport> => {
  const params = new URLSearchParams();
  params.set("locationSlug", input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);

  return authorizedFetch<DaysiRevenueSummaryReport>(
    input.token,
    `/v1/admin/reports/revenue-summary?${params.toString()}`,
  );
};

export const fetchDaysiMembershipPerformanceReport = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiMembershipPerformanceReport> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  return authorizedFetch<DaysiMembershipPerformanceReport>(
    input.token,
    `/v1/admin/reports/membership-performance?${params.toString()}`,
  );
};

// Membership Plan Types
export interface DaysiMembershipPlan {
  planSlug: string;
  planName: string;
  description?: string;
  educationOnly: boolean;
  status: "active" | "inactive" | "archived";
  recurringAmount: DaysiMoney;
  serviceAllowanceQuantity: number;
  serviceAllowancePeriodMonths: number;
  signupFeeAmount?: DaysiMoney;
  commitmentMonths?: number;
  benefits: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DaysiMembershipPlanInput {
  planSlug?: string;
  planName: string;
  description?: string;
  educationOnly: boolean;
  status: "active" | "inactive" | "archived";
  recurringAmountCents: number;
  currency: string;
  serviceAllowanceQuantity: number;
  serviceAllowancePeriodMonths: number;
  signupFeeAmountCents?: number;
  commitmentMonths?: number;
  benefits: string[];
}

// API Membership Plan (matches backend schema)
interface ApiMembershipPlan {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  description: string;
  billingInterval: "month";
  price: DaysiMoney;
  educationOnly: boolean;
  entitlements: {
    includedServiceSlugs: string[];
    educationOfferSlugs: string[];
    monthlyServiceCredits: Array<{
      serviceSlug: string;
      quantity: number;
    }>;
    memberDiscountPercent: number;
  };
}

// Helper to map API plan to frontend format
const mapApiPlanToFrontend = (plan: ApiMembershipPlan): DaysiMembershipPlan => ({
  planSlug: plan.slug,
  planName: plan.name,
  description: plan.description,
  educationOnly: plan.educationOnly,
  status: "active" as const, // Default status since API doesn't return it yet
  recurringAmount: plan.price,
  serviceAllowanceQuantity: plan.entitlements?.monthlyServiceCredits?.[0]?.quantity ?? 0,
  serviceAllowancePeriodMonths: 1,
  signupFeeAmount: undefined,
  commitmentMonths: undefined,
  benefits: [] as string[],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Membership Plan CRUD
export const listDaysiAdminMembershipPlans = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiMembershipPlan[]> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  const data = await authorizedFetch<{ locationSlug: string; plans: ApiMembershipPlan[] }>(
    input.token,
    `/v1/admin/membership-plans?${params.toString()}`,
  );

  // Map API response to frontend expected format
  return data.plans.map(mapApiPlanToFrontend);
};

export const createDaysiAdminMembershipPlan = async (input: {
  token: string;
  locationSlug?: string;
  data: DaysiMembershipPlanInput;
}): Promise<DaysiMembershipPlan> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  const response = await authorizedFetch<{ plan: ApiMembershipPlan }>(
    input.token,
    `/v1/admin/membership-plans?${params.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    },
  );
  return mapApiPlanToFrontend(response.plan);
};

export const updateDaysiAdminMembershipPlan = async (input: {
  token: string;
  locationSlug?: string;
  planSlug: string;
  data: Partial<DaysiMembershipPlanInput>;
}): Promise<DaysiMembershipPlan> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  const response = await authorizedFetch<{ plan: ApiMembershipPlan }>(
    input.token,
    `/v1/admin/membership-plans/${input.planSlug}?${params.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    },
  );
  return mapApiPlanToFrontend(response.plan);
};

export const deleteDaysiAdminMembershipPlan = async (input: {
  token: string;
  locationSlug?: string;
  planSlug: string;
}): Promise<void> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  return authorizedFetch<void>(
    input.token,
    `/v1/admin/membership-plans/${input.planSlug}?${params.toString()}`,
    {
      method: "DELETE",
    },
  );
};

export const fetchDaysiLocationFinanceDashboard = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiLocationFinanceDashboard> => {
  const params = new URLSearchParams({
    locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
  });

  return authorizedFetch<DaysiLocationFinanceDashboard>(
    input.token,
    `/v1/admin/reports/location-finance?${params.toString()}`,
  );
};

export const fetchDaysiOperationsPerformanceReport = async (input: {
  token: string;
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DaysiOperationsPerformanceReport> => {
  const params = new URLSearchParams();
  params.set("locationSlug", input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);

  return authorizedFetch<DaysiOperationsPerformanceReport>(
    input.token,
    `/v1/admin/reports/operations-performance?${params.toString()}`,
  );
};

export const fetchDaysiWebAnalyticsReport = async (input: {
  token: string;
  locationSlug?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DaysiWebsiteAnalyticsReport> => {
  const params = new URLSearchParams();
  params.set("locationSlug", input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);

  return authorizedFetch<DaysiWebsiteAnalyticsReport>(
    input.token,
    `/v1/admin/reports/web-analytics?${params.toString()}`,
  );
};

// ==================== IMPORT JOBS ====================

export type ImportJobType = "customers" | "services" | "bookings" | "memberships" | "products";
export type ImportJobStatus = "pending" | "validating" | "validated" | "processing" | "completed" | "failed";

export interface ImportJobError {
  row: number;
  message: string;
}

export interface DaysiAdminImportJob {
  id: string;
  locationSlug: string;
  type: ImportJobType;
  status: ImportJobStatus;
  fileName: string;
  rowCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  errors: ImportJobError[];
  createdAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

export const listDaysiAdminImportJobs = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiAdminImportJob[]> => {
  const params = new URLSearchParams();
  if (input.locationSlug) {
    params.set("locationSlug", input.locationSlug);
  }

  const data = await authorizedFetch<{ jobs: DaysiAdminImportJob[] }>(
    input.token,
    `/v1/admin/imports${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
  return data.jobs;
};

export const createDaysiAdminImportJob = async (input: {
  token: string;
  locationSlug: string;
  type: ImportJobType;
  fileName: string;
  rowCount: number;
  metadata?: Record<string, unknown>;
}): Promise<DaysiAdminImportJob> => {
  const data = await authorizedFetch<{ job: DaysiAdminImportJob }>(
    input.token,
    "/v1/admin/imports",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        type: input.type,
        fileName: input.fileName,
        rowCount: input.rowCount,
        metadata: input.metadata,
      }),
    },
  );
  return data.job;
};

export const updateDaysiAdminImportJob = async (input: {
  token: string;
  jobId: string;
  status?: ImportJobStatus;
  processedCount?: number;
  successCount?: number;
  errorCount?: number;
  errors?: ImportJobError[];
}): Promise<DaysiAdminImportJob> => {
  const data = await authorizedFetch<{ job: DaysiAdminImportJob }>(
    input.token,
    `/v1/admin/imports/${input.jobId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        processedCount: input.processedCount,
        successCount: input.successCount,
        errorCount: input.errorCount,
        errors: input.errors,
      }),
    },
  );
  return data.job;
};

export const deleteDaysiAdminImportJob = async (input: {
  token: string;
  jobId: string;
}): Promise<void> => {
  await authorizedFetch<{ ok: boolean }>(
    input.token,
    `/v1/admin/imports/${input.jobId}`,
    {
      method: "DELETE",
    },
  );
};

// ==================== INTAKE FORMS ====================

export type FormFieldType = "text" | "textarea" | "select" | "multiselect" | "checkbox" | "date" | "signature";
export type IntakeFormStatus = "draft" | "active" | "archived";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DaysiAdminIntakeForm {
  id: string;
  locationSlug: string;
  name: string;
  description: string;
  status: IntakeFormStatus;
  fields: FormField[];
  assignedServices: string[];
  requiredForBooking: boolean;
  completionCount: number;
  createdAt: string;
  updatedAt: string;
}

export const listDaysiAdminIntakeForms = async (input: {
  token: string;
  locationSlug?: string;
}): Promise<DaysiAdminIntakeForm[]> => {
  const params = new URLSearchParams();
  if (input.locationSlug) {
    params.set("locationSlug", input.locationSlug);
  }

  const data = await authorizedFetch<{ forms: DaysiAdminIntakeForm[] }>(
    input.token,
    `/v1/admin/intake-forms${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
  return data.forms;
};

export const createDaysiAdminIntakeForm = async (input: {
  token: string;
  locationSlug: string;
  name: string;
  description?: string;
  fields?: FormField[];
  assignedServices?: string[];
  requiredForBooking?: boolean;
}): Promise<DaysiAdminIntakeForm> => {
  const data = await authorizedFetch<{ form: DaysiAdminIntakeForm }>(
    input.token,
    "/v1/admin/intake-forms",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        name: input.name,
        description: input.description,
        fields: input.fields,
        assignedServices: input.assignedServices,
        requiredForBooking: input.requiredForBooking,
      }),
    },
  );
  return data.form;
};

export const updateDaysiAdminIntakeForm = async (input: {
  token: string;
  formId: string;
  name?: string;
  description?: string;
  status?: IntakeFormStatus;
  fields?: FormField[];
  assignedServices?: string[];
  requiredForBooking?: boolean;
}): Promise<DaysiAdminIntakeForm> => {
  const data = await authorizedFetch<{ form: DaysiAdminIntakeForm }>(
    input.token,
    `/v1/admin/intake-forms/${input.formId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        status: input.status,
        fields: input.fields,
        assignedServices: input.assignedServices,
        requiredForBooking: input.requiredForBooking,
      }),
    },
  );
  return data.form;
};

export const deleteDaysiAdminIntakeForm = async (input: {
  token: string;
  formId: string;
}): Promise<void> => {
  await authorizedFetch<{ ok: boolean }>(
    input.token,
    `/v1/admin/intake-forms/${input.formId}`,
    {
      method: "DELETE",
    },
  );
};

// ==================== AUDIT LOGS ====================

export type AuditActorType = "admin" | "staff" | "customer" | "system";

export interface AuditActor {
  type: AuditActorType;
  email: string;
  name: string;
  userId?: string;
}

export interface DaysiAdminAuditLogEntry {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
}

export const listDaysiAdminAuditLogs = async (input: {
  token: string;
  locationSlug?: string;
  entityType?: string;
  actorType?: AuditActorType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: DaysiAdminAuditLogEntry[]; total: number; limit: number; offset: number }> => {
  const params = new URLSearchParams();
  if (input.locationSlug) params.set("locationSlug", input.locationSlug);
  if (input.entityType) params.set("entityType", input.entityType);
  if (input.actorType) params.set("actorType", input.actorType);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  if (input.limit) params.set("limit", input.limit.toString());
  if (input.offset) params.set("offset", input.offset.toString());

  return authorizedFetch<{ entries: DaysiAdminAuditLogEntry[]; total: number; limit: number; offset: number }>(
    input.token,
    `/v1/admin/audit-logs?${params.toString()}`,
  );
};

export const exportDaysiAdminAuditLogs = async (input: {
  token: string;
  locationSlug?: string;
  entityType?: string;
  actorType?: AuditActorType;
  fromDate?: string;
  toDate?: string;
  format?: "json" | "csv";
}): Promise<Blob> => {
  const params = new URLSearchParams();
  if (input.locationSlug) params.set("locationSlug", input.locationSlug);
  if (input.entityType) params.set("entityType", input.entityType);
  if (input.actorType) params.set("actorType", input.actorType);
  if (input.fromDate) params.set("fromDate", input.fromDate);
  if (input.toDate) params.set("toDate", input.toDate);
  params.set("format", input.format ?? "json");

  const response = await fetch(
    `${DAYSI_API_BASE_URL}/v1/admin/audit-logs/export?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new DaysiAdminApiError(
      payload?.error?.message ?? payload?.message ?? "Failed to export audit logs.",
      response.status,
    );
  }

  return response.blob();
};
