/**
 * Core Web Vitals Monitoring
 * Tracks LCP, CLS, INP, FCP, TTFB and reports to GA4 + first-party database
 */

import { onLCP, onCLS, onINP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { trackGA4WebVitals } from './ga4';
import { DAYSI_DEFAULT_LOCATION_SLUG, sendDaysiPublicEvent } from './daysi-public-api';

interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Send Core Web Vitals to first-party database
 */
async function sendToDatabase(metric: VitalsMetric): Promise<void> {
  try {
    const deviceType = getDeviceType();

    await sendDaysiPublicEvent({
      eventType: 'web_vital',
      locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
      pagePath: window.location.pathname,
      referrer: document.referrer || null,
      metadata: {
        metricName: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        metricId: metric.id,
        navigationType: metric.navigationType,
        device: deviceType,
        connectionType: getConnectionType(),
      },
    });
  } catch (error) {
    // Silently fail - vitals tracking shouldn't break the app
    console.warn('Failed to send web vitals:', error);
  }
}

/**
 * Get device type based on screen width
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Get connection type if available
 */
function getConnectionType(): string | null {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
    };
  };
  return nav.connection?.effectiveType || null;
}

/**
 * Handle metric reporting
 */
function handleMetric(metric: Metric): void {
  const vitalsMetric: VitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
  };

  // Send to GA4
  trackGA4WebVitals(vitalsMetric);

  // Send to first-party database
  sendToDatabase(vitalsMetric);
}

/**
 * Initialize Core Web Vitals monitoring
 * Call this once in main.tsx after app mount
 */
export function initWebVitals(): void {
  // Largest Contentful Paint - measures loading performance
  // Good: ≤2.5s, Needs Improvement: ≤4s, Poor: >4s
  onLCP(handleMetric);

  // Cumulative Layout Shift - measures visual stability
  // Good: ≤0.1, Needs Improvement: ≤0.25, Poor: >0.25
  onCLS(handleMetric);

  // Interaction to Next Paint - measures responsiveness
  // Good: ≤200ms, Needs Improvement: ≤500ms, Poor: >500ms
  onINP(handleMetric);

  // First Contentful Paint - measures initial render
  // Good: ≤1.8s, Needs Improvement: ≤3s, Poor: >3s
  onFCP(handleMetric);

  // Time to First Byte - measures server response time
  // Good: ≤800ms, Needs Improvement: ≤1.8s, Poor: >1.8s
  onTTFB(handleMetric);
}

/**
 * Get thresholds for each metric
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
} as const;
