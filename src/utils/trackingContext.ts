const IS_BROWSER = typeof window !== 'undefined';

// Safe cookie helper
const getCookie = (name: string): string => {
  if (!IS_BROWSER) return '';
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
  } catch {
    // Ignore
  }
  return '';
};

// Safe storage wrapper
const storage = {
  getItem: (key: string): string => {
    if (!IS_BROWSER) return '';
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  },
  setItem: (key: string, value: string): void => {
    if (!IS_BROWSER) return;
    try {
      sessionStorage.setItem(key, value);
      // Double backup in localStorage for persistence across sessions where appropriate
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage restrictions/errors
    }
  }
};

// Generate UUID for sessions, visitors, submissions
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments or environments without secure crypto context
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Auto-run tracking initialiser to capture first-touch parameters
export function initTracking() {
  if (!IS_BROWSER) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmContent = urlParams.get('utm_content');
    const utmTerm = urlParams.get('utm_term');
    const gclid = urlParams.get('gclid');

    // Store UTMs if present and not already captured
    if (utmSource && !storage.getItem('plx_utm_source')) {
      storage.setItem('plx_utm_source', utmSource);
    }
    if (utmMedium && !storage.getItem('plx_utm_medium')) {
      storage.setItem('plx_utm_medium', utmMedium);
    }
    if (utmCampaign && !storage.getItem('plx_utm_campaign')) {
      storage.setItem('plx_utm_campaign', utmCampaign);
    }
    if (utmContent && !storage.getItem('plx_utm_content')) {
      storage.setItem('plx_utm_content', utmContent);
    }
    if (utmTerm && !storage.getItem('plx_utm_term')) {
      storage.setItem('plx_utm_term', utmTerm);
    }
    if (gclid && !storage.getItem('plx_gclid')) {
      storage.setItem('plx_gclid', gclid);
    }

    // Capture first landing page for the session
    if (!storage.getItem('plx_first_landing_page')) {
      storage.setItem('plx_first_landing_page', window.location.href);
    }

    // Capture original referrer
    if (!storage.getItem('plx_original_referrer')) {
      const ref = document.referrer || '';
      storage.setItem('plx_original_referrer', ref);
    }

    // Set visitor and session IDs
    if (!storage.getItem('plx_visitor_id')) {
      storage.setItem('plx_visitor_id', generateUUID());
    }
    if (!sessionStorage.getItem('plx_session_id')) {
      try {
        sessionStorage.setItem('plx_session_id', generateUUID());
      } catch {
        // Safe skip
      }
    }

    // Track previous/current page for conversion mapping
    const currentPath = window.location.href;
    const storedCurrent = sessionStorage.getItem('plx_current_page');
    if (storedCurrent && storedCurrent !== currentPath) {
      sessionStorage.setItem('plx_previous_page', storedCurrent);
    }
    sessionStorage.setItem('plx_current_page', currentPath);

  } catch (error) {
    console.warn("Tracking initialisation failed:", error);
  }
}

// Run on import
if (IS_BROWSER) {
  initTracking();
}

/**
 * Determine entry source based on UTM or parsed referrer
 */
const getEntrySource = (storedUtmSource: string, originalReferrer: string): string => {
  if (storedUtmSource) return storedUtmSource;
  if (!originalReferrer) return 'direct';

  try {
    const url = new URL(originalReferrer);
    const host = url.hostname.toLowerCase();
    if (host.includes('google.') || host.includes('bing.') || host.includes('yahoo.') || host.includes('duckduckgo.')) {
      return 'organic';
    }
    if (host.includes('linkedin.com') || host.includes('t.co') || host.includes('twitter.com') || host.includes('facebook.com') || host.includes('instagram.com')) {
      return 'social';
    }
    return host;
  } catch {
    return 'referral';
  }
};

/**
 * Resolve an authoritative CTA / Decision Entry ID
 */
const getCtaId = (): string => {
  if (!IS_BROWSER) return '';
  try {
    const sitId = sessionStorage.getItem('decision_entry_situation_id');
    if (sitId) return sitId;
    const ctaLabel = sessionStorage.getItem('decision_entry_cta_label');
    if (ctaLabel) return ctaLabel;

    // Check URL query parameters as backup
    const urlParams = new URLSearchParams(window.location.search);
    const urlCta = urlParams.get('cta') || urlParams.get('ctaId') || urlParams.get('cta_id');
    if (urlCta) return urlCta;
  } catch {
    // Ignore error
  }
  return '';
};

interface ConsentInfo {
  analyticsConsent: 'granted' | 'denied' | 'unknown';
  marketingConsent: 'granted' | 'denied' | 'unknown';
  cookieConsent: 'necessary_only' | 'statistics' | 'statistics_marketing' | 'unknown';
  consentTimestamp: string;
}

/**
 * Query Cookiebot state or its CookieConsent cookie, with fallback to Google Consent Mode
 */
export function getCookiebotConsent(): ConsentInfo {
  let analyticsConsent: 'granted' | 'denied' | 'unknown' = 'unknown';
  let marketingConsent: 'granted' | 'denied' | 'unknown' = 'unknown';
  let cookieConsent: 'necessary_only' | 'statistics' | 'statistics_marketing' | 'unknown' = 'unknown';
  let consentTimestamp = '';

  if (!IS_BROWSER) {
    return { analyticsConsent, marketingConsent, cookieConsent, consentTimestamp };
  }

  // 1. Check window.Cookiebot JS object
  const cookiebot = (window as any).Cookiebot;
  if (cookiebot) {
    if (cookiebot.declined) {
      analyticsConsent = 'denied';
      marketingConsent = 'denied';
      cookieConsent = 'necessary_only';
    } else if (cookiebot.consent) {
      analyticsConsent = cookiebot.consent.statistics ? 'granted' : 'denied';
      marketingConsent = cookiebot.consent.marketing ? 'granted' : 'denied';

      if (cookiebot.consent.statistics && cookiebot.consent.marketing) {
        cookieConsent = 'statistics_marketing';
      } else if (cookiebot.consent.statistics) {
        cookieConsent = 'statistics';
      } else {
        cookieConsent = 'necessary_only';
      }
    }

    if (cookiebot.consent?.utc) {
      try {
        consentTimestamp = new Date(cookiebot.consent.utc).toISOString();
      } catch {
        // Ignore date parse errors
      }
    }
  } else {
    // 2. Fallback to parsing CookieConsent cookie set by Cookiebot
    const consentCookie = getCookie('CookieConsent');
    if (consentCookie) {
      const hasStats = consentCookie.includes('statistics:true');
      const hasMarketing = consentCookie.includes('marketing:true');
      const hasNecessary = consentCookie.includes('necessary:true');

      if (consentCookie.includes('statistics:')) {
        analyticsConsent = hasStats ? 'granted' : 'denied';
      }
      if (consentCookie.includes('marketing:')) {
        marketingConsent = hasMarketing ? 'granted' : 'denied';
      }

      if (hasStats && hasMarketing) {
        cookieConsent = 'statistics_marketing';
      } else if (hasStats) {
        cookieConsent = 'statistics';
      } else if (hasNecessary) {
        cookieConsent = 'necessary_only';
      } else {
        cookieConsent = 'unknown';
      }

      const utcMatch = consentCookie.match(/utc:(\d+)/);
      if (utcMatch && utcMatch[1]) {
        try {
          consentTimestamp = new Date(parseInt(utcMatch[1], 10)).toISOString();
        } catch {
          // Ignore
        }
      }
    }
  }

  // 3. Fallback to checking Google Consent Mode if standard tags set them
  if (cookieConsent === 'unknown') {
    const googleTagData = (window as any).google_tag_data;
    if (googleTagData && googleTagData.ics) {
      const entries = googleTagData.ics.entries || {};
      const adStorage = entries.ad_storage;
      const analyticsStorage = entries.analytics_storage;

      if (analyticsStorage) {
        analyticsConsent = analyticsStorage.v === 'granted' ? 'granted' : 'denied';
      }
      if (adStorage) {
        marketingConsent = adStorage.v === 'granted' ? 'granted' : 'denied';
      }

      if (analyticsConsent === 'granted' && marketingConsent === 'granted') {
        cookieConsent = 'statistics_marketing';
      } else if (analyticsConsent === 'granted') {
        cookieConsent = 'statistics';
      } else if (analyticsConsent === 'denied' || marketingConsent === 'denied') {
        cookieConsent = 'necessary_only';
      }
    }
  }

  return { analyticsConsent, marketingConsent, cookieConsent, consentTimestamp };
}

interface GaInfo {
  gaClientId: string;
  gaSessionId: string;
}

/**
 * Attempt to read GA Client ID and Session ID synchronously from cookies, only if analytics consent isn't denied.
 */
export function getGaInfo(analyticsConsent: 'granted' | 'denied' | 'unknown'): GaInfo {
  let gaClientId = '';
  let gaSessionId = '';

  if (!IS_BROWSER || analyticsConsent === 'denied') {
    return { gaClientId, gaSessionId };
  }

  try {
    // Read Client ID from _ga cookie
    const gaCookie = getCookie('_ga');
    if (gaCookie) {
      const parts = gaCookie.split('.');
      if (parts.length >= 4) {
        gaClientId = parts.slice(2).join('.');
      } else {
        gaClientId = gaCookie;
      }
    }

    // Read Session ID from _ga_<CONTAINER_ID> cookies
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.startsWith('_ga_')) {
        const value = c.split('=')[1];
        if (value) {
          const parts = value.split('.');
          if (parts.length >= 3) {
            gaSessionId = parts[2];
            break;
          }
        }
      }
    }
  } catch (error) {
    console.warn("Could not retrieve GA parameters synchronously:", error);
  }

  return { gaClientId, gaSessionId };
}

export interface TrackingContext {
  sessionId: string;
  visitorId: string;
  landingPage: string;
  conversionPage: string;
  previousPage: string;
  pageUrl: string;
  ctaId: string;
  ctaText: string;
  source: string;
  medium: string;
  campaign: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  gclid: string;
  gaClientId: string;
  gaSessionId: string;
  clarityUserId: string;
  claritySessionId: string;
  consentNecessary: string;
  consentPreferences: string;
  consentStatistics: string;
  consentMarketing: string;
  consentTimestamp: string;
  payloadVersion: string;
}

/**
 * Returns a fully hydrated TrackingContext payload
 */
export function generateTrackingContext(currentCtaId?: string, currentCtaText?: string): TrackingContext {
  const emptyContext: TrackingContext = {
    sessionId: '',
    visitorId: '',
    landingPage: '',
    conversionPage: '',
    previousPage: '',
    pageUrl: '',
    ctaId: '',
    ctaText: '',
    source: 'direct',
    medium: 'none',
    campaign: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    gclid: '',
    gaClientId: '',
    gaSessionId: '',
    clarityUserId: '',
    claritySessionId: '',
    consentNecessary: 'false',
    consentPreferences: 'false',
    consentStatistics: 'false',
    consentMarketing: 'false',
    consentTimestamp: '',
    payloadVersion: 'plx-web-v3'
  };

  if (!IS_BROWSER) {
    return emptyContext;
  }

  try {
    const utmSource = storage.getItem('plx_utm_source') || '';
    const utmMedium = storage.getItem('plx_utm_medium') || '';
    const utmCampaign = storage.getItem('plx_utm_campaign') || '';
    const utmContent = storage.getItem('plx_utm_content') || '';
    const utmTerm = storage.getItem('plx_utm_term') || '';
    const gclid = storage.getItem('plx_gclid') || '';

    const originalReferrer = storage.getItem('plx_original_referrer') || '';
    const firstLandingPage = storage.getItem('plx_first_landing_page') || '';
    const conversionPage = window.location.href;
    const pageUrl = window.location.href;
    const previousPage = sessionStorage.getItem('plx_previous_page') || originalReferrer;

    const visitorId = storage.getItem('plx_visitor_id') || '';
    const sessionId = sessionStorage.getItem('plx_session_id') || '';

    const ctaId = currentCtaId || getCtaId() || '';
    const ctaText = currentCtaText || sessionStorage.getItem('decision_entry_cta_label') || '';

    const consentInfo = getCookiebotConsent();
    const entrySource = getEntrySource(utmSource, originalReferrer);
    const entryMedium = utmMedium || (entrySource === 'organic' ? 'organic' : entrySource === 'social' ? 'social' : entrySource === 'direct' ? 'none' : 'referral');

    // Microsoft Clarity Integration
    let clarityUserId = '';
    let claritySessionId = '';
    const clck = getCookie('_clck');
    if (clck) {
      clarityUserId = clck.split('|')[0] || '';
    }
    const clsk = getCookie('_clsk');
    if (clsk) {
      claritySessionId = clsk.split('|')[0] || '';
    }

    // Cookiebot and CookieConsent status mapping
    let consentNecessary = 'true';
    let consentPreferences = 'false';
    let consentStatistics = 'false';
    let consentMarketing = 'false';
    let consentTimestamp = consentInfo.consentTimestamp || '';

    const cookiebot = (window as any).Cookiebot;
    if (cookiebot && cookiebot.consent) {
      consentNecessary = cookiebot.consent.necessary ? 'true' : 'false';
      consentPreferences = cookiebot.consent.preferences ? 'true' : 'false';
      consentStatistics = cookiebot.consent.statistics ? 'true' : 'false';
      consentMarketing = cookiebot.consent.marketing ? 'true' : 'false';
    } else {
      const consentCookie = getCookie('CookieConsent');
      if (consentCookie) {
        consentNecessary = consentCookie.includes('necessary:true') ? 'true' : 'false';
        consentPreferences = consentCookie.includes('preferences:true') ? 'true' : 'false';
        consentStatistics = consentCookie.includes('statistics:true') ? 'true' : 'false';
        consentMarketing = consentCookie.includes('marketing:true') ? 'true' : 'false';
      }
    }

    if (!consentTimestamp && consentNecessary === 'true') {
      consentTimestamp = new Date().toISOString();
    }

    return {
      sessionId,
      visitorId,
      landingPage: firstLandingPage,
      conversionPage,
      previousPage,
      pageUrl,
      ctaId,
      ctaText,
      source: entrySource,
      medium: entryMedium,
      campaign: utmCampaign,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      gclid,
      gaClientId: consentInfo.analyticsConsent !== 'denied' ? (getGaInfo(consentInfo.analyticsConsent).gaClientId || '') : '',
      gaSessionId: consentInfo.analyticsConsent !== 'denied' ? (getGaInfo(consentInfo.analyticsConsent).gaSessionId || '') : '',
      clarityUserId,
      claritySessionId,
      consentNecessary,
      consentPreferences,
      consentStatistics,
      consentMarketing,
      consentTimestamp,
      payloadVersion: 'plx-web-v3'
    };
  } catch (error) {
    console.error("Error generating tracking context:", error);
    return emptyContext;
  }
}

/**
 * Unified clientside submit-handler that sends data to the Apps Script Gateway endpoint.
 */
export async function submitToAppsScript(
  formType: 'contact' | 'indicator' | 'indicator_followup' | 'visitor_event',
  submissionId: string,
  language: 'DA' | 'EN',
  formData: Record<string, any>,
  currentCtaId?: string,
  currentCtaText?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = new URLSearchParams();

    // 1. Core routing and contextual variables
    payload.append("formType", formType);
    payload.append("submissionId", submissionId);
    payload.append("language", language);
    payload.append("submittedAt", new Date().toISOString());

    // 2. Append form-specific user responses
    Object.entries(formData).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          payload.append(key, val.join(","));
        } else {
          payload.append(key, String(val));
        }
      }
    });

    // 3. Capture all requested digital context, tracking IDs, utms, cookies and consent parameters
    const trackingContext = generateTrackingContext(currentCtaId, currentCtaText);
    Object.entries(trackingContext).forEach(([key, val]) => {
      if (!payload.has(key)) {
        payload.append(key, String(val));
      }
    });

    // 4. Secure submission to the Google Apps Script Gateway (first endpoint)
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbySa6gnvIbTBqV6wdvWTMI8j9vDSvsCiKahMRLvv0SjnJVeqzFuQLYa3ks_qVy8u2TNaA/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString()
      }
    );

    if (!response.ok) {
      throw new Error(`Gateway returned HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    // Google Apps Script responses can range from raw json redirects to status properties.
    const isSuccess = data?.success === true || data?.status === "success" || data?.result === "success" || response.status === 200;

    return {
      success: isSuccess,
      data
    };
  } catch (error: any) {
    console.error(`submitToAppsScript failed for ${formType} (${submissionId}):`, error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}
