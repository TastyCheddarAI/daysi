import { randomUUID } from "node:crypto";

export type OperationalMetricEventType =
  | "availability_search"
  | "booking_created"
  | "waitlist_created"
  | "booking_paid"
  | "page_view"
  | "cta_click"
  | "form_submit"
  | "newsletter_subscribe"
  | "booking_start"
  | "booking_complete"
  | "web_vital";

export interface OperationalMetricEventRecord {
  id: string;
  eventType: OperationalMetricEventType;
  locationSlug: string;
  serviceSlug?: string;
  machineSlug?: string;
  providerSlug?: string;
  actorUserId?: string;
  customerEmail?: string;
  referenceId?: string;
  sourceOrderId?: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export const createOperationalMetricEvent = (input: {
  eventType: OperationalMetricEventType;
  locationSlug: string;
  serviceSlug?: string;
  machineSlug?: string;
  providerSlug?: string;
  actorUserId?: string;
  customerEmail?: string;
  referenceId?: string;
  sourceOrderId?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}): OperationalMetricEventRecord => ({
  id: `omet_${randomUUID()}`,
  eventType: input.eventType,
  locationSlug: input.locationSlug,
  serviceSlug: input.serviceSlug,
  machineSlug: input.machineSlug,
  providerSlug: input.providerSlug,
  actorUserId: input.actorUserId,
  customerEmail: input.customerEmail?.trim().toLowerCase(),
  referenceId: input.referenceId,
  sourceOrderId: input.sourceOrderId,
  occurredAt: input.occurredAt ?? new Date().toISOString(),
  metadata: input.metadata ?? {},
});

interface SessionAggregate {
  sessionKey: string;
  events: OperationalMetricEventRecord[];
  pageViews: OperationalMetricEventRecord[];
  ctaClicks: OperationalMetricEventRecord[];
  bookings: OperationalMetricEventRecord[];
}

const getSessionKey = (event: OperationalMetricEventRecord): string =>
  (typeof event.metadata.sessionId === "string" && event.metadata.sessionId.trim()) ||
  event.customerEmail ||
  event.actorUserId ||
  `event:${event.id}`;

const getPagePath = (event: OperationalMetricEventRecord): string =>
  typeof event.metadata.pagePath === "string" && event.metadata.pagePath.trim().length > 0
    ? event.metadata.pagePath
    : "/";

const getUserAgent = (event: OperationalMetricEventRecord): string =>
  typeof event.metadata.userAgent === "string" ? event.metadata.userAgent : "";

const getTrafficSource = (event: OperationalMetricEventRecord): string => {
  if (typeof event.metadata.utm_source === "string" && event.metadata.utm_source.trim()) {
    return event.metadata.utm_source.trim();
  }

  if (typeof event.metadata.referrer === "string" && event.metadata.referrer.trim()) {
    try {
      const parsed = new URL(event.metadata.referrer);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return event.metadata.referrer.trim();
    }
  }

  return "Direct";
};

const getCtaName = (event: OperationalMetricEventRecord): string =>
  (typeof event.metadata.ctaName === "string" && event.metadata.ctaName.trim()) ||
  (typeof event.metadata.label === "string" && event.metadata.label.trim()) ||
  (typeof event.metadata.buttonText === "string" && event.metadata.buttonText.trim()) ||
  getPagePath(event);

const detectDevice = (userAgent: string): "mobile" | "desktop" | "tablet" => {
  const value = userAgent.toLowerCase();
  if (/ipad|tablet/.test(value)) {
    return "tablet";
  }
  if (/iphone|android.+mobile|mobile/.test(value)) {
    return "mobile";
  }
  return "desktop";
};

const detectBrowser = (userAgent: string): string => {
  const value = userAgent.toLowerCase();
  if (value.includes("edg/")) return "Edge";
  if (value.includes("chrome/") && !value.includes("edg/")) return "Chrome";
  if (value.includes("firefox/")) return "Firefox";
  if (value.includes("safari/") && !value.includes("chrome/")) return "Safari";
  return "Other";
};

const toDateKey = (value: string): string => value.slice(0, 10);

const roundTo = (value: number, precision: number = 1): number =>
  Number(value.toFixed(precision));

const buildDateKeys = (fromDate: string, toDate: string): string[] => {
  const values: string[] = [];
  const current = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);

  while (current.getTime() <= end.getTime()) {
    values.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return values;
};

export interface WebsiteAnalyticsReport {
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
    views: number;
  }>;
  entryPages: Array<{
    path: string;
    entries: number;
    bounceRate: number;
  }>;
  exitPages: Array<{
    path: string;
    exits: number;
  }>;
  ctaPerformance: Array<{
    ctaName: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
}

export const buildWebsiteAnalyticsReport = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  metricEvents: OperationalMetricEventRecord[];
}): WebsiteAnalyticsReport => {
  const events = input.metricEvents
    .filter((event) => event.locationSlug === input.locationSlug)
    .filter((event) => {
      const dateKey = toDateKey(event.occurredAt);
      return dateKey >= input.fromDate && dateKey <= input.toDate;
    })
    .filter((event) =>
      [
        "page_view",
        "cta_click",
        "form_submit",
        "newsletter_subscribe",
        "booking_start",
        "booking_complete",
        "web_vital",
      ].includes(event.eventType),
    )
    .slice()
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  const sessions = new Map<string, SessionAggregate>();
  for (const event of events) {
    const sessionKey = getSessionKey(event);
    const existing = sessions.get(sessionKey) ?? {
      sessionKey,
      events: [],
      pageViews: [],
      ctaClicks: [],
      bookings: [],
    };
    existing.events.push(event);
    if (event.eventType === "page_view") {
      existing.pageViews.push(event);
    }
    if (event.eventType === "cta_click") {
      existing.ctaClicks.push(event);
    }
    if (event.eventType === "booking_complete") {
      existing.bookings.push(event);
    }
    sessions.set(sessionKey, existing);
  }

  const sessionValues = [...sessions.values()];
  const uniqueVisitors = sessionValues.length;
  const pageViews = events.filter((event) => event.eventType === "page_view").length;
  const totalBookings = events.filter((event) => event.eventType === "booking_complete").length;
  const ctaClicks = events.filter((event) => event.eventType === "cta_click").length;
  const newsletterSubscriptions = events.filter(
    (event) => event.eventType === "newsletter_subscribe",
  ).length;
  const bouncedSessions = sessionValues.filter(
    (session) => session.pageViews.length <= 1,
  ).length;
  const bounceRate = uniqueVisitors > 0 ? (bouncedSessions / uniqueVisitors) * 100 : 0;
  const totalSessionDuration = sessionValues.reduce((total, session) => {
    if (session.events.length <= 1) {
      return total;
    }
    const startedAt = new Date(session.events[0]!.occurredAt).getTime();
    const endedAt = new Date(session.events[session.events.length - 1]!.occurredAt).getTime();
    return total + Math.max(0, endedAt - startedAt);
  }, 0);
  const avgSessionDuration =
    uniqueVisitors > 0 ? Math.round(totalSessionDuration / uniqueVisitors) : 0;
  const pagesPerSession = uniqueVisitors > 0 ? pageViews / uniqueVisitors : 0;
  const bookingConversionRate =
    uniqueVisitors > 0
      ? (sessionValues.filter((session) => session.bookings.length > 0).length / uniqueVisitors) *
        100
      : 0;

  const latestEvent = events[events.length - 1];
  const realtimeCutoff = latestEvent
    ? new Date(new Date(latestEvent.occurredAt).getTime() - 5 * 60 * 1000).toISOString()
    : undefined;
  const activeVisitors = realtimeCutoff
    ? sessionValues.filter((session) =>
        session.events.some((event) => event.occurredAt >= realtimeCutoff),
      ).length
    : 0;

  const dailyData = buildDateKeys(input.fromDate, input.toDate).map((date) => {
    const daySessions = sessionValues.filter((session) =>
      session.events.some((event) => toDateKey(event.occurredAt) === date),
    );
    const dayEvents = events.filter((event) => toDateKey(event.occurredAt) === date);
    const dayPageViews = dayEvents.filter((event) => event.eventType === "page_view").length;
    const dayBookings = dayEvents.filter(
      (event) => event.eventType === "booking_complete",
    ).length;
    const dayCtaClicks = dayEvents.filter((event) => event.eventType === "cta_click").length;
    const dayBounceSessions = daySessions.filter((session) =>
      session.pageViews.filter((event) => toDateKey(event.occurredAt) === date).length <= 1,
    ).length;

    return {
      date,
      visitors: daySessions.length,
      pageViews: dayPageViews,
      bookings: dayBookings,
      ctaClicks: dayCtaClicks,
      bounceRate: daySessions.length > 0 ? roundTo((dayBounceSessions / daySessions.length) * 100) : 0,
    };
  });

  const trafficSources = [...sessionValues.reduce((map, session) => {
    const firstEvent = session.events[0];
    const key = firstEvent ? getTrafficSource(firstEvent) : "Direct";
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([source, visitors]) => ({
      source,
      visitors,
      percentage: uniqueVisitors > 0 ? roundTo((visitors / uniqueVisitors) * 100) : 0,
    }))
    .sort((left, right) => right.visitors - left.visitors)
    .slice(0, 8);

  const devices = sessionValues.reduce(
    (totals, session) => {
      const device = detectDevice(getUserAgent(session.events[0]!));
      totals[device] += 1;
      return totals;
    },
    { mobile: 0, desktop: 0, tablet: 0 },
  );

  const browsers = [...sessionValues.reduce((map, session) => {
    const browser = detectBrowser(getUserAgent(session.events[0]!));
    map.set(browser, (map.get(browser) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([name, count]) => ({
      name,
      count,
      percentage: uniqueVisitors > 0 ? roundTo((count / uniqueVisitors) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const topPages = [...events.reduce((map, event) => {
    if (event.eventType !== "page_view") {
      return map;
    }
    const path = getPagePath(event);
    map.set(path, (map.get(path) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 10);

  const entryPages = [...sessionValues.reduce((map, session) => {
    const firstPageView = session.pageViews[0];
    if (!firstPageView) {
      return map;
    }
    const path = getPagePath(firstPageView);
    const current = map.get(path) ?? { entries: 0, bounced: 0 };
    current.entries += 1;
    if (session.pageViews.length <= 1) {
      current.bounced += 1;
    }
    map.set(path, current);
    return map;
  }, new Map<string, { entries: number; bounced: number }>()).entries()]
    .map(([path, counts]) => ({
      path,
      entries: counts.entries,
      bounceRate: counts.entries > 0 ? roundTo((counts.bounced / counts.entries) * 100) : 0,
    }))
    .sort((left, right) => right.entries - left.entries)
    .slice(0, 10);

  const exitPages = [...sessionValues.reduce((map, session) => {
    const lastPageView = session.pageViews[session.pageViews.length - 1];
    if (!lastPageView) {
      return map;
    }
    const path = getPagePath(lastPageView);
    map.set(path, (map.get(path) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .map(([path, exits]) => ({ path, exits }))
    .sort((left, right) => right.exits - left.exits)
    .slice(0, 10);

  const ctaPerformance = [...events.reduce((map, event) => {
    if (event.eventType !== "cta_click") {
      return map;
    }
    const ctaName = getCtaName(event);
    const sessionKey = getSessionKey(event);
    const current = map.get(ctaName) ?? {
      clicks: 0,
      conversionSessions: new Set<string>(),
    };
    current.clicks += 1;
    const session = sessions.get(sessionKey);
    if (session?.bookings.length) {
      current.conversionSessions.add(sessionKey);
    }
    map.set(ctaName, current);
    return map;
  }, new Map<string, { clicks: number; conversionSessions: Set<string> }>()).entries()]
    .map(([ctaName, value]) => ({
      ctaName,
      clicks: value.clicks,
      conversions: value.conversionSessions.size,
      conversionRate: value.clicks > 0 ? roundTo((value.conversionSessions.size / value.clicks) * 100) : 0,
    }))
    .sort((left, right) => right.clicks - left.clicks)
    .slice(0, 10);

  return {
    locationSlug: input.locationSlug,
    fromDate: input.fromDate,
    toDate: input.toDate,
    realtime: {
      activeVisitors,
      lastUpdated: latestEvent?.occurredAt,
    },
    summary: {
      uniqueVisitors,
      pageViews,
      bounceRate: roundTo(bounceRate),
      avgSessionDuration,
      pagesPerSession: roundTo(pagesPerSession),
      totalBookings,
      bookingConversionRate: roundTo(bookingConversionRate),
      ctaClicks,
      newsletterSubscriptions,
    },
    dailyData,
    trafficSources,
    devices,
    browsers,
    topPages,
    entryPages,
    exitPages,
    ctaPerformance,
  };
};
