import type { DaysiAuthUser } from "@/lib/daysi-auth-api";
import {
  DAYSI_API_BASE_URL,
  DAYSI_DEFAULT_LOCATION_SLUG,
  splitCustomerName,
} from "@/lib/daysi-public-api";

export interface DaysiPublicEducationOffer {
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

export interface DaysiLearningEntitlement {
  id: string;
  locationSlug: string;
  educationOfferSlug: string;
  educationOfferTitle: string;
  moduleSlugs: string[];
  customerEmail: string;
  customerName: string;
  actorUserId?: string;
  source: "purchase" | "membership" | "admin_grant";
  sourceOrderId?: string;
  membershipSubscriptionId?: string;
  grantedByUserId?: string;
  status: "active" | "revoked";
  grantedAt: string;
  revokedAt?: string;
}

export interface DaysiLessonProgressRecord {
  id: string;
  enrollmentId: string;
  moduleSlug: string;
  status: "not_started" | "in_progress" | "completed";
  percentComplete: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
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

export interface DaysiLearningEnrollment {
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
}

export interface DaysiLearningEnrollmentView {
  enrollment: DaysiLearningEnrollment;
  lessonProgress: DaysiLessonProgressRecord[];
  summary: {
    totalModules: number;
    completedModules: number;
    percentComplete: number;
  };
  certificate: DaysiLearningCertificate | null;
}

export interface DaysiCheckoutConfirmResult {
  order: {
    id: string;
    status: "awaiting_payment" | "paid" | "payment_failed" | "refunded";
  };
  paymentSession: {
    provider: "stripe";
    paymentIntentId?: string;
    clientSecret?: string;
    status:
      | "not_required"
      | "requires_payment_method"
      | "succeeded"
      | "failed"
      | "refunded";
  };
  managementToken: string;
}

class DaysiLearningApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiLearningApiError";
    this.statusCode = statusCode;
  }
}

const buildUrl = (path: string) =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new DaysiLearningApiError(
      payload?.error?.message ?? payload?.message ?? "Daysi learning request failed.",
      response.status,
    );
  }

  return payload.data as T;
};

const authorizedFetch = async <T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  return parseResponse<T>(response);
};

export const formatDaysiEducationModuleLabel = (moduleSlug: string): string =>
  moduleSlug
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const listDaysiPublicEducationOffers = async (
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicEducationOffer[]> => {
  const response = await fetch(
    buildUrl(`/v1/public/education/offers?locationSlug=${encodeURIComponent(locationSlug)}`),
  );
  const data = await parseResponse<{ educationOffers: DaysiPublicEducationOffer[] }>(response);
  return data.educationOffers;
};

export const fetchDaysiMyEducationEntitlements = async (
  token: string,
): Promise<DaysiLearningEntitlement[]> => {
  const data = await authorizedFetch<{ entitlements: DaysiLearningEntitlement[] }>(
    "/v1/me/education/entitlements",
    token,
  );
  return data.entitlements;
};

export const fetchDaysiMyEducationEnrollments = async (
  token: string,
): Promise<DaysiLearningEnrollmentView[]> => {
  const data = await authorizedFetch<{ enrollments: DaysiLearningEnrollmentView[] }>(
    "/v1/me/education/enrollments",
    token,
  );
  return data.enrollments;
};

export const fetchDaysiMyEducationCertificates = async (
  token: string,
): Promise<DaysiLearningCertificate[]> => {
  const data = await authorizedFetch<{ certificates: DaysiLearningCertificate[] }>(
    "/v1/me/education/certificates",
    token,
  );
  return data.certificates;
};

export const createDaysiEducationEnrollment = async (
  token: string,
  input: {
    locationSlug: string;
    offerSlug: string;
  },
): Promise<DaysiLearningEnrollmentView> => {
  const data = await authorizedFetch<{ enrollment: DaysiLearningEnrollmentView }>(
    "/v1/education/enrollments",
    token,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return data.enrollment;
};

export const updateDaysiEducationProgress = async (
  token: string,
  input: {
    lessonId: string;
    enrollmentId: string;
    status: "not_started" | "in_progress" | "completed";
    percentComplete?: number;
  },
): Promise<DaysiLearningEnrollmentView> => {
  const data = await authorizedFetch<{ enrollment: DaysiLearningEnrollmentView }>(
    `/v1/me/education/lessons/${encodeURIComponent(input.lessonId)}/progress`,
    token,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        enrollmentId: input.enrollmentId,
        status: input.status,
        percentComplete: input.percentComplete,
      }),
    },
  );

  return data.enrollment;
};

export const claimFreeDaysiEducationOffer = async (
  token: string,
  input: {
    locationSlug: string;
    offer: DaysiPublicEducationOffer;
    user: DaysiAuthUser;
  },
): Promise<DaysiCheckoutConfirmResult> => {
  if (!input.offer.price.isFree) {
    throw new Error("Only free education offers can be claimed without checkout.");
  }

  if (!input.user.email) {
    throw new Error("A customer email is required to claim education access.");
  }

  const customerName = input.user.displayName.trim() || input.user.email;
  const { firstName, lastName } = splitCustomerName(customerName);
  const data = await authorizedFetch<DaysiCheckoutConfirmResult>(
    "/v1/checkout/confirm",
    token,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        locationSlug: input.locationSlug,
        items: [
          {
            kind: "educationOffer",
            offerSlug: input.offer.slug,
            quantity: 1,
          },
        ],
        customer: {
          firstName,
          lastName,
          email: input.user.email,
        },
        paymentMethod: "stripe",
      }),
    },
  );

  if (data.paymentSession.status === "requires_payment_method") {
    throw new Error("This education offer still requires payment before access can be granted.");
  }

  return data;
};
