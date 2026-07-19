import { generateUUID, submitToAppsScript } from './trackingContext';

/**
 * Analytics event logger helper (non-blocking, fails gracefully if gtag is not present)
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  try {
    const timestamp = new Date().toISOString();

    const eventParams = {
      ...params,
      timestamp,
      environment: process.env.NODE_ENV || 'production',
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics Event] "${eventName}":`, eventParams);
    }

    // Attempt standard gtag trigger
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, eventParams);
    }

    // Also trigger standard CustomEvent for flexibility
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('plx_analytics_event', {
        detail: {
          eventName,
          params: eventParams
        }
      });

      window.dispatchEvent(customEvent);

      const eventId = generateUUID();

      void submitToAppsScript(
        'visitor_event',
        eventId,
        document.documentElement.lang
          .toLowerCase()
          .startsWith('en')
          ? 'EN'
          : 'DA',
        {
          ...params,
          eventId,
          eventType: eventName,
          eventTimestamp: timestamp
        }
      );
    }

  } catch (error) {
    console.warn("Analytics event skipped:", eventName, error);
  }
}