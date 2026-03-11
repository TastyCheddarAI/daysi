import { z } from "zod";

import {
  dateOnlySchema,
  isoTimestampSchema,
  locationSlugSchema,
  successEnvelope,
} from "./common";

export const publicAnalyticsEventTypeSchema = z.enum([
  "page_view",
  "cta_click",
  "form_submit",
  "newsletter_subscribe",
  "booking_start",
  "booking_complete",
  "web_vital",
]);

export const publicAnalyticsEventRequestSchema = z.object({
  eventType: publicAnalyticsEventTypeSchema,
  locationSlug: locationSlugSchema.optional(),
  pagePath: z.string().trim().min(1),
  referrer: z.string().trim().min(1).nullable().optional(),
  sessionId: z.string().trim().min(1).optional(),
  customerEmail: z.string().email().optional(),
  occurredAt: isoTimestampSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const publicAnalyticsEventResponseSchema = successEnvelope(
  z.object({
    eventId: z.string().min(1),
    eventType: publicAnalyticsEventTypeSchema,
  }),
);

export const websiteAnalyticsTrafficSourceSchema = z.object({
  source: z.string().min(1),
  visitors: z.number().int().nonnegative(),
  percentage: z.number().nonnegative(),
});

export const websiteAnalyticsDevicesSchema = z.object({
  mobile: z.number().int().nonnegative(),
  desktop: z.number().int().nonnegative(),
  tablet: z.number().int().nonnegative(),
});

export const websiteAnalyticsBrowserSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().nonnegative(),
  percentage: z.number().nonnegative(),
});

export const websiteAnalyticsPageMetricSchema = z.object({
  path: z.string().min(1),
  views: z.number().int().nonnegative().optional(),
  entries: z.number().int().nonnegative().optional(),
  exits: z.number().int().nonnegative().optional(),
  bounceRate: z.number().nonnegative().optional(),
});

export const websiteAnalyticsCtaPerformanceSchema = z.object({
  ctaName: z.string().min(1),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  conversionRate: z.number().nonnegative(),
});

export const websiteAnalyticsDailyMetricSchema = z.object({
  date: dateOnlySchema,
  visitors: z.number().int().nonnegative(),
  pageViews: z.number().int().nonnegative(),
  bookings: z.number().int().nonnegative(),
  ctaClicks: z.number().int().nonnegative(),
  bounceRate: z.number().nonnegative(),
});

export const websiteAnalyticsRealtimeSchema = z.object({
  activeVisitors: z.number().int().nonnegative(),
  lastUpdated: isoTimestampSchema.optional(),
});

export const websiteAnalyticsSummarySchema = z.object({
  uniqueVisitors: z.number().int().nonnegative(),
  pageViews: z.number().int().nonnegative(),
  bounceRate: z.number().nonnegative(),
  avgSessionDuration: z.number().int().nonnegative(),
  pagesPerSession: z.number().nonnegative(),
  totalBookings: z.number().int().nonnegative(),
  bookingConversionRate: z.number().nonnegative(),
  ctaClicks: z.number().int().nonnegative(),
  newsletterSubscriptions: z.number().int().nonnegative(),
});

export const websiteAnalyticsReportResponseSchema = successEnvelope(
  z.object({
    locationSlug: locationSlugSchema,
    fromDate: dateOnlySchema,
    toDate: dateOnlySchema,
    realtime: websiteAnalyticsRealtimeSchema,
    summary: websiteAnalyticsSummarySchema,
    dailyData: z.array(websiteAnalyticsDailyMetricSchema),
    trafficSources: z.array(websiteAnalyticsTrafficSourceSchema),
    devices: websiteAnalyticsDevicesSchema,
    browsers: z.array(websiteAnalyticsBrowserSchema),
    topPages: z.array(websiteAnalyticsPageMetricSchema),
    entryPages: z.array(websiteAnalyticsPageMetricSchema),
    exitPages: z.array(websiteAnalyticsPageMetricSchema),
    ctaPerformance: z.array(websiteAnalyticsCtaPerformanceSchema),
  }),
);
