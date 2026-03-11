import { BRAND_CONFIG } from "@/lib/brand.config";
import {
  DAYSI_API_BASE_URL,
  DAYSI_DEFAULT_LOCATION_SLUG,
} from "@/lib/daysi-public-api";

export interface DaysiActor {
  userId: string;
  tenantSlug: string;
  email?: string;
  displayName: string;
  roles: string[];
  locationScopes: string[];
  permissions: string[];
}

export interface DaysiAuthUser {
  id: string;
  email?: string;
  displayName: string;
  tenantSlug: string;
  roles: string[];
  locationScopes: string[];
}

export interface DaysiSession {
  access_token: string;
  sessionMode: "bootstrap";
  actor: DaysiActor;
}

export type DaysiBootstrapRole =
  | "customer"
  | "provider"
  | "staff"
  | "admin"
  | "owner";

export interface DaysiOrder {
  id: string;
  code: string;
  locationSlug: string;
  status: "awaiting_payment" | "paid" | "payment_failed" | "refunded";
  paymentStatus: "not_required" | "requires_payment_method" | "succeeded" | "failed" | "refunded";
  totalAmount: {
    currency: string;
    amountCents: number;
  };
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  lineItems: Array<{
    id: string;
    kind: string;
    description: string;
    quantity: number;
    finalAmount: {
      currency: string;
      amountCents: number;
    };
  }>;
}

export interface DaysiMembershipSubscription {
  id: string;
  planSlug: string;
  locationSlug: string;
  status: "pending_payment" | "active" | "cancelled";
  customerEmail: string;
  customerName: string;
  createdAt: string;
  activatedAt?: string;
  cancelledAt?: string;
}

export interface DaysiCreditBalance {
  currency: string;
  availableAmount: {
    currency: string;
    amountCents: number;
  };
  entries: Array<{
    id: string;
    type: "grant" | "redeem" | "restore";
    amount: {
      currency: string;
      amountCents: number;
    };
    createdAt: string;
    note?: string;
  }>;
  serviceAllowances: Array<{
    planSlug: string;
    serviceSlug: string;
    totalQuantity: number;
    usedQuantity: number;
    remainingQuantity: number;
  }>;
}

export interface DaysiReferralRewardDefinition {
  kind: "account_credit";
  amount: {
    currency: string;
    amountCents: number;
  };
}

export interface DaysiReferralProgram {
  id: string;
  locationSlug: string;
  name: string;
  status: "draft" | "active" | "inactive" | "archived";
  codePrefix: string;
  referredReward?: DaysiReferralRewardDefinition;
  advocateReward?: DaysiReferralRewardDefinition;
  secondLevelReward?: DaysiReferralRewardDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface DaysiReferralCode {
  id: string;
  programId: string;
  locationSlug: string;
  ownerUserId?: string;
  ownerEmail: string;
  code: string;
  createdAt: string;
}

export interface DaysiReferralRelationship {
  id: string;
  programId: string;
  locationSlug: string;
  referralCodeId: string;
  referralCode: string;
  referrerUserId?: string;
  referrerEmail: string;
  refereeUserId?: string;
  refereeEmail: string;
  status: "applied" | "qualified";
  createdAt: string;
  updatedAt: string;
  firstQualifiedOrderId?: string;
  qualifiedAt?: string;
}

export interface DaysiReferralRewardEvent {
  id: string;
  programId: string;
  relationshipId: string;
  locationSlug: string;
  recipient: "referee" | "referrer" | "referrer_level_2";
  recipientUserId?: string;
  recipientEmail: string;
  reward: DaysiReferralRewardDefinition;
  sourceOrderId?: string;
  status: "earned" | "reversed";
  creditEntryId?: string;
  createdAt: string;
  reversedAt?: string;
}

export interface DaysiReferralOverview {
  locationSlug: string;
  program: DaysiReferralProgram | null;
  referralCode: DaysiReferralCode | null;
  appliedRelationship: DaysiReferralRelationship | null;
  invitedRelationships: DaysiReferralRelationship[];
  rewardEvents: DaysiReferralRewardEvent[];
  summary: {
    invitedCount: number;
    qualifiedInviteCount: number;
    totalRewardAmount: {
      currency: string;
      amountCents: number;
    };
  };
}

const AUTH_SESSION_STORAGE_KEY = BRAND_CONFIG.STORAGE_KEYS.AUTH_SESSION;

class DaysiAuthApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiAuthApiError";
    this.statusCode = statusCode;
  }
}

const buildUrl = (path: string) =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new DaysiAuthApiError(
      payload?.error?.message ?? payload?.message ?? "Daysi request failed.",
      response.status,
    );
  }

  return payload.data as T;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const buildProviderUserId = (email: string) =>
  normalizeEmail(email).replace(/[^a-z0-9]+/g, "-");

export const toDaysiAuthUser = (actor: DaysiActor): DaysiAuthUser => ({
  id: actor.userId,
  email: actor.email,
  displayName: actor.displayName,
  tenantSlug: actor.tenantSlug,
  roles: actor.roles,
  locationScopes: actor.locationScopes,
});

export const loadStoredDaysiSessionToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
};

export const storeDaysiSessionToken = (token: string) => {
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, token);
};

export const clearStoredDaysiSessionToken = () => {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

export const exchangeDaysiBootstrapSessionForRole = async (input: {
  email: string;
  displayName?: string;
  requestedRole?: DaysiBootstrapRole;
  locationScopes?: string[];
  password?: string;
}): Promise<DaysiSession> => {
  const email = normalizeEmail(input.email);
  const displayName =
    input.displayName?.trim() ||
    email.split("@")[0]?.replace(/[-_.]/g, " ") ||
    "Daysi Customer";

  const response = await fetch(buildUrl("/v1/auth/session/exchange"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tenantSlug: "daysi",
      providerUserId: buildProviderUserId(email),
      email,
      displayName,
      requestedRole: input.requestedRole ?? "customer",
      locationScopes: input.locationScopes,
      password: input.password,
    }),
  });

  const data = await parseResponse<{
    sessionToken: string;
    actor: DaysiActor;
    sessionMode: "bootstrap";
  }>(response);

  return {
    access_token: data.sessionToken,
    actor: data.actor,
    sessionMode: data.sessionMode,
  };
};

export const exchangeDaysiBootstrapSession = async (input: {
  email: string;
  displayName?: string;
}): Promise<DaysiSession> =>
  exchangeDaysiBootstrapSessionForRole({
    ...input,
    requestedRole: "customer",
    locationScopes: [DAYSI_DEFAULT_LOCATION_SLUG],
  });

const authorizedFetch = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<T>(response);
};

export const fetchDaysiMe = async (token: string): Promise<DaysiSession> => {
  const data = await authorizedFetch<{
    actor: DaysiActor;
    sessionMode: "bootstrap";
  }>("/v1/auth/me", token);

  return {
    access_token: token,
    actor: data.actor,
    sessionMode: data.sessionMode,
  };
};

export const fetchDaysiMyOrders = async (token: string): Promise<DaysiOrder[]> => {
  const data = await authorizedFetch<{ orders: DaysiOrder[] }>("/v1/me/orders", token);
  return data.orders;
};

export const fetchDaysiMyMemberships = async (
  token: string,
): Promise<DaysiMembershipSubscription[]> => {
  const data = await authorizedFetch<{ subscriptions: DaysiMembershipSubscription[] }>(
    "/v1/me/memberships",
    token,
  );
  return data.subscriptions;
};

export const fetchDaysiMyCredits = async (token: string): Promise<DaysiCreditBalance> => {
  const data = await authorizedFetch<{ credits: DaysiCreditBalance }>("/v1/me/credits", token);
  return data.credits;
};

export const fetchDaysiMyReferralOverview = async (
  token: string,
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiReferralOverview> => {
  const data = await authorizedFetch<{ overview: DaysiReferralOverview }>(
    `/v1/me/referral?locationSlug=${encodeURIComponent(locationSlug)}`,
    token,
  );
  return data.overview;
};
