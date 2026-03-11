/**
 * Unified Analytics Hook
 * Dual-tracks events to both GA4 and first-party database
 */

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { 
  trackGA4PageView, 
  trackGA4Event,
  trackGA4BeginCheckout,
  trackGA4GenerateLead,
  trackGA4Purchase,
} from "@/lib/ga4";
import { DAYSI_DEFAULT_LOCATION_SLUG, sendDaysiPublicEvent } from "@/lib/daysi-public-api";

type PublicAnalyticsEventType =
  | "page_view"
  | "cta_click"
  | "form_submit"
  | "newsletter_subscribe"
  | "booking_start"
  | "booking_complete";

// Generate a unique session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Extract UTM parameters from URL
const getUTMParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const utmParams: Record<string, string> = {};
  
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    const value = params.get(param);
    if (value) {
      utmParams[param] = value;
    }
  });
  
  return utmParams;
};

// Store UTM params in session for attribution
const storeUTMParams = () => {
  const utmParams = getUTMParams();
  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
  }
};

// Get stored UTM params
const getStoredUTMParams = (): Record<string, string> => {
  try {
    const stored = sessionStorage.getItem('utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

interface TrackEventOptions {
  eventType: PublicAnalyticsEventType;
  pagePath?: string;
  metadata?: Record<string, unknown>;
}

const DAYSI_EVENT_INGEST_URL =
  `${import.meta.env.VITE_DAYSI_API_URL?.trim()?.replace(/\/$/, "") || "http://127.0.0.1:4010"}/v1/public/events`;

export function useAnalytics() {
  const location = useLocation();
  const lastTrackedPath = useRef<string>("");

  // Store UTM params on first load
  useEffect(() => {
    storeUTMParams();
  }, []);

  const trackEvent = useCallback(({ eventType, pagePath, metadata }: TrackEventOptions) => {
    const path = pagePath || location.pathname;
    const utmParams = getStoredUTMParams();
    const enrichedMetadata = { ...metadata, ...utmParams };

    // 1. Track to GA4 (non-blocking)
    trackGA4Event(eventType, {
      page_path: path,
      ...enrichedMetadata,
    });

    // 2. Track to first-party database using sendBeacon for reliability
    // sendBeacon ensures the request completes even if user navigates away
    const payload = JSON.stringify({
      eventType,
      locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
      pagePath: path,
      referrer: document.referrer || null,
      sessionId: getSessionId(),
      metadata: enrichedMetadata,
    });

    // Try sendBeacon first (works during page unload), fallback to fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(DAYSI_EVENT_INGEST_URL, blob);
      if (!sent) {
        sendDaysiPublicEvent({
          eventType,
          locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
          pagePath: path,
          referrer: document.referrer || null,
          sessionId: getSessionId(),
          metadata: enrichedMetadata,
        });
      }
    } else {
      sendDaysiPublicEvent({
        eventType,
        locationSlug: DAYSI_DEFAULT_LOCATION_SLUG,
        pagePath: path,
        referrer: document.referrer || null,
        sessionId: getSessionId(),
        metadata: enrichedMetadata,
      });
    }
  }, [location.pathname]);

  // Track page views automatically
  useEffect(() => {
    // Avoid duplicate tracking for the same path
    if (lastTrackedPath.current === location.pathname) {
      return;
    }
    lastTrackedPath.current = location.pathname;

    // Track to GA4 (with title)
    trackGA4PageView(location.pathname, document.title);

    // Track to first-party database
    trackEvent({
      eventType: "page_view",
      pagePath: location.pathname,
    });
  }, [location.pathname, trackEvent]);

  // Convenience methods for common events
  const trackBookingStart = useCallback((treatment?: string, value?: number) => {
    // GA4 e-commerce: begin_checkout
    if (treatment) {
      trackGA4BeginCheckout([{
        item_id: treatment.toLowerCase().replace(/\s+/g, '-'),
        item_name: treatment,
        price: value,
        quantity: 1,
      }], value || 0);
    }

    trackEvent({ 
      eventType: "booking_start", 
      metadata: { step: "form_opened", treatment, value } 
    });
  }, [trackEvent]);

  const trackBookingComplete = useCallback((treatment: string, transactionId?: string, value?: number) => {
    // GA4 e-commerce: purchase
    if (transactionId) {
      trackGA4Purchase({
        transaction_id: transactionId,
        value: value || 0,
        items: [{
          item_id: treatment.toLowerCase().replace(/\s+/g, '-'),
          item_name: treatment,
          price: value,
          quantity: 1,
        }],
      });
    }

    trackEvent({ 
      eventType: "booking_complete", 
      metadata: { treatment, transaction_id: transactionId, value } 
    });
  }, [trackEvent]);

  const trackCTAClick = useCallback((ctaName: string, destination?: string) => {
    trackEvent({
      eventType: "cta_click",
      metadata: { cta_name: ctaName, destination },
    });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formName: string, success: boolean, value?: number) => {
    // GA4: generate_lead for successful form submissions
    if (success) {
      trackGA4GenerateLead(value, formName);
    }

    trackEvent({
      eventType: "form_submit",
      metadata: { form_name: formName, success, value },
    });
  }, [trackEvent]);

  const trackNewsletterSubscribe = useCallback((email?: string) => {
    trackGA4GenerateLead(0, 'newsletter');
    
    trackEvent({
      eventType: "newsletter_subscribe",
      metadata: { has_email: !!email },
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackBookingStart,
    trackBookingComplete,
    trackCTAClick,
    trackFormSubmit,
    trackNewsletterSubscribe,
  };
}
