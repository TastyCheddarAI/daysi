export interface DaysiMoneyAmount {
  currency: string;
  amountCents: number;
}

export interface DaysiCatalogPriceSummary {
  currency: string;
  retailAmountCents: number;
  memberAmountCents?: number;
  membershipRequired: boolean;
}

export interface DaysiPublicService {
  id: string;
  slug: string;
  variantSlug: string;
  categorySlug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  durationMinutes: number;
  bookable: boolean;
  price: DaysiCatalogPriceSummary;
  machineCapabilities: string[];
  roomCapabilities: string[];
  featureTags: string[];
}

export interface DaysiPublicProduct {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  price: DaysiMoneyAmount;
}

export interface DaysiPublicServicePackage {
  id: string;
  slug: string;
  locationSlug: string;
  name: string;
  shortDescription: string;
  status: "draft" | "published";
  price: DaysiMoneyAmount;
  serviceCredits: Array<{
    serviceSlug: string;
    quantity: number;
  }>;
  featureTags: string[];
}

export interface DaysiBusinessProfile {
  businessName: string;
  tagline: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  hoursWeekday: string | null;
  hoursSaturday: string | null;
  hoursSunday: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
}

export interface DaysiAvailabilitySlot {
  slotId: string;
  locationSlug: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  providerSlug: string;
  providerName: string;
  machineSlug: string;
  machineName: string;
  roomSlug?: string;
  roomName?: string;
  startAt: string;
  endAt: string;
  price: DaysiCatalogPriceSummary;
}

export interface DaysiBookingCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface DaysiBookingRecord {
  id: string;
  code: string;
  locationSlug: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  serviceName: string;
  providerSlug: string;
  providerName: string;
  machineSlug: string;
  machineName: string;
  roomSlug?: string;
  roomName?: string;
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
}

export interface DaysiCreateBookingInput {
  locationSlug: string;
  serviceSlug: string;
  serviceVariantSlug: string;
  slotId: string;
  pricingMode: "retail" | "membership";
  customer: DaysiBookingCustomerInput;
  notes?: string;
}

export interface DaysiCreateBookingResult {
  booking: DaysiBookingRecord;
  managementToken: string;
}

class DaysiApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DaysiApiError";
    this.statusCode = statusCode;
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_DAYSI_API_URL?.trim();

export const DAYSI_API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, "")
  : "http://127.0.0.1:4010";

export const DAYSI_DEFAULT_LOCATION_SLUG =
  import.meta.env.VITE_DAYSI_DEFAULT_LOCATION_SLUG?.trim() || "daysi-flagship";

const buildDaysiApiUrl = (path: string): string =>
  `${DAYSI_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseDaysiApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || payload?.ok === false) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      "Daysi API request failed.";
    throw new DaysiApiError(message, response.status);
  }

  return payload.data as T;
};

export const listDaysiPublicServices = async (
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicService[]> => {
  const response = await fetch(
    buildDaysiApiUrl(`/v1/public/locations/${locationSlug}/catalog/services`),
  );
  const data = await parseDaysiApiResponse<{ services: DaysiPublicService[] }>(response);
  return data.services.filter((service) => service.bookable);
};

export const listDaysiPublicProducts = async (
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicProduct[]> => {
  const response = await fetch(
    buildDaysiApiUrl(`/v1/public/locations/${locationSlug}/catalog/products`),
  );
  const data = await parseDaysiApiResponse<{ products: DaysiPublicProduct[] }>(response);
  return data.products;
};

export const listDaysiPublicServicePackages = async (
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiPublicServicePackage[]> => {
  const response = await fetch(
    buildDaysiApiUrl(`/v1/public/locations/${locationSlug}/catalog/packages`),
  );
  const data = await parseDaysiApiResponse<{
    servicePackages: DaysiPublicServicePackage[];
  }>(response);
  return data.servicePackages;
};

export const fetchDaysiPublicBusinessProfile = async (
  locationSlug: string = DAYSI_DEFAULT_LOCATION_SLUG,
): Promise<DaysiBusinessProfile | null> => {
  const response = await fetch(
    buildDaysiApiUrl(`/v1/public/locations/${locationSlug}/business-profile`),
  );
  const data = await parseDaysiApiResponse<{ profile: DaysiBusinessProfile | null }>(response);
  return data.profile;
};

export const searchDaysiAvailability = async (input: {
  locationSlug?: string;
  serviceSlug: string;
  fromDate: string;
  toDate: string;
  pricingMode?: "retail" | "membership";
}): Promise<DaysiAvailabilitySlot[]> => {
  const response = await fetch(buildDaysiApiUrl("/v1/public/availability/search"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      serviceSlug: input.serviceSlug,
      fromDate: input.fromDate,
      toDate: input.toDate,
      pricingMode: input.pricingMode ?? "retail",
    }),
  });
  const data = await parseDaysiApiResponse<{ slots: DaysiAvailabilitySlot[] }>(response);
  return data.slots;
};

export const createDaysiBooking = async (
  input: DaysiCreateBookingInput,
): Promise<DaysiCreateBookingResult> => {
  const response = await fetch(buildDaysiApiUrl("/v1/public/bookings"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  return parseDaysiApiResponse<DaysiCreateBookingResult>(response);
};

export const sendDaysiPublicEvent = async (input: {
  eventType:
    | "page_view"
    | "cta_click"
    | "form_submit"
    | "newsletter_subscribe"
    | "booking_start"
    | "booking_complete"
    | "web_vital";
  pagePath: string;
  locationSlug?: string;
  referrer?: string | null;
  sessionId?: string;
  customerEmail?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  await fetch(buildDaysiApiUrl("/v1/public/events"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      eventType: input.eventType,
      pagePath: input.pagePath,
      locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      referrer: input.referrer ?? null,
      sessionId: input.sessionId,
      customerEmail: input.customerEmail,
      occurredAt: input.occurredAt,
      metadata: input.metadata ?? {},
    }),
    keepalive: true,
  }).catch(() => {
    // Silent by design. Analytics should never block UI.
  });
};

export const submitDaysiNewsletterSubscription = async (input: {
  email: string;
  locationSlug?: string;
  pagePath?: string;
  referrer?: string | null;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  const response = await fetch(buildDaysiApiUrl("/v1/public/events"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      eventType: "newsletter_subscribe",
      locationSlug: input.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG,
      pagePath: input.pagePath ?? "/",
      referrer: input.referrer ?? null,
      sessionId: input.sessionId,
      customerEmail: input.email.trim().toLowerCase(),
      metadata: input.metadata ?? {},
    }),
  });

  await parseDaysiApiResponse(response);
};

export const groupAvailabilitySlotsByDate = (
  slots: DaysiAvailabilitySlot[],
): Map<string, DaysiAvailabilitySlot[]> => {
  const grouped = new Map<string, DaysiAvailabilitySlot[]>();

  for (const slot of slots) {
    const date = slot.startAt.slice(0, 10);
    const daySlots = grouped.get(date) ?? [];
    daySlots.push(slot);
    grouped.set(date, daySlots);
  }

  return grouped;
};

export const formatDaysiAvailabilityTime = (isoTimestamp: string): string =>
  new Date(isoTimestamp).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });

export const getDaysiCategoryLabel = (categorySlug: string): string => {
  const categoryLabels: Record<string, string> = {
    laser: "Laser Treatments",
    skin: "Skin Treatments",
    consultation: "Consultations",
    education: "Education",
  };

  return (
    categoryLabels[categorySlug] ??
    categorySlug
      .split("-")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ")
  );
};

export const splitCustomerName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const [firstName = "", ...rest] = normalized.split(" ");

  return {
    firstName,
    lastName: rest.join(" ") || "Guest",
  };
};
