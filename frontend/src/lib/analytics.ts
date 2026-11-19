import { hasAnalyticsConsent } from './consent';

/**
 * Consent-gated, pluggable analytics.
 *
 * - **Pluggable:** a deployment points `VITE_ANALYTICS_URL` at its provider's
 *   script (Plausible, Matomo, etc.). No URL configured → analytics is a
 *   no-op no matter what the visitor consents to.
 * - **Consent-gated:** the script is injected only after an explicit stored
 *   "allow analytics" and removed again if consent is revoked.
 * - **No PII:** `trackAnalytics` accepts an event *name* only — no user,
 *   session, or identifier data is ever attached, and the page sends nothing
 *   itself; the provider script runs under the site's own CSP/consent rules.
 *
 * Cross-origin provider URLs must be added to the `script-src` CSP directive
 * (see docs/DEPLOYMENT.md); the default configuration loads nothing.
 */

const SCRIPT_ID = 'cpa-analytics-script';

/** Event name-only tracking signal a provider script may listen for. */
export const ANALYTICS_EVENT = 'cpa:analytics-event';

function providerUrl(): string {
  const configured = import.meta.env.VITE_ANALYTICS_URL as string | undefined;
  return (configured ?? '').trim();
}

/** Whether this deployment has a provider configured at all. */
export function isAnalyticsConfigured(): boolean {
  return providerUrl().length > 0;
}

function removeProviderScript(): void {
  document.getElementById(SCRIPT_ID)?.remove();
}

/**
 * Reconcile the page with the current consent state. Call on boot and on
 * every consent change; safe to call repeatedly.
 */
export function applyAnalyticsConsent(granted: boolean): void {
  if (!granted || !isAnalyticsConfigured()) {
    removeProviderScript();
    return;
  }
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = providerUrl();
  script.setAttribute('data-consent', 'analytics');
  document.head.appendChild(script);
}

/**
 * Fire a name-only analytics event. No-ops unless analytics is both
 * consented and configured; never carries user data.
 */
export function trackAnalytics(event: string): void {
  if (!hasAnalyticsConsent() || !isAnalyticsConfigured()) return;
  window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event } }));
}
