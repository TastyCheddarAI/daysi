/**
 * GA4 Type-Safe Tracking Library
 * Measurement ID: G-HZF9HKJSE3
 */

const GA4_MEASUREMENT_ID = 'G-HZF9HKJSE3';

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Core gtag wrapper with safety check
export function gtag(...args: unknown[]): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

/**
 * Track page views for SPA navigation
 */
export function trackGA4PageView(path: string, title?: string): void {
  gtag('config', GA4_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Track custom events
 */
export function trackGA4Event(
  eventName: string,
  params?: Record<string, unknown>
): void {
  gtag('event', eventName, params);
}

/**
 * Track Core Web Vitals metrics to GA4
 */
export function trackGA4WebVitals(metric: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}): void {
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  });
}

// E-commerce event types
interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

interface GA4Transaction {
  transaction_id: string;
  value: number;
  currency?: string;
  items: GA4Item[];
}

/**
 * Track when user starts checkout/booking
 */
export function trackGA4BeginCheckout(items: GA4Item[], value: number): void {
  gtag('event', 'begin_checkout', {
    currency: 'CAD',
    value,
    items,
  });
}

/**
 * Track completed purchase/booking
 */
export function trackGA4Purchase(transaction: GA4Transaction): void {
  gtag('event', 'purchase', {
    transaction_id: transaction.transaction_id,
    value: transaction.value,
    currency: transaction.currency || 'CAD',
    items: transaction.items,
  });
}

/**
 * Track lead generation (form submissions, booking requests)
 */
export function trackGA4GenerateLead(value?: number, formName?: string): void {
  gtag('event', 'generate_lead', {
    currency: 'CAD',
    value: value || 0,
    form_name: formName,
  });
}
