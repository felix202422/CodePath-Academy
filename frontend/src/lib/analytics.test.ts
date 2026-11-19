import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_EVENT,
  applyAnalyticsConsent,
  isAnalyticsConfigured,
  trackAnalytics,
} from './analytics';
import { setConsent } from './consent';

const SCRIPT_ID = 'cpa-analytics-script';
const PROVIDER_URL = 'https://analytics.example.test/script.js';

function scriptElement(): HTMLScriptElement | null {
  return document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
}

beforeEach(() => {
  window.localStorage.clear();
  scriptElement()?.remove();
});

afterEach(() => {
  scriptElement()?.remove();
  vi.unstubAllEnvs();
});

describe('analytics gate', () => {
  it('is unconfigured by default, so analytics can never run', () => {
    expect(isAnalyticsConfigured()).toBe(false);

    setConsent(true);
    applyAnalyticsConsent(true);

    expect(scriptElement()).toBeNull();
  });

  it('injects the provider script only for an explicit, stored allow', () => {
    vi.stubEnv('VITE_ANALYTICS_URL', PROVIDER_URL);
    expect(isAnalyticsConfigured()).toBe(true);

    // Refused or undecided → nothing loads, whatever the code asks for.
    applyAnalyticsConsent(false);
    expect(scriptElement()).toBeNull();

    applyAnalyticsConsent(true);
    const script = scriptElement();
    expect(script).not.toBeNull();
    expect(script?.src).toBe(PROVIDER_URL);
    expect(script?.defer).toBe(true);
    expect(script?.getAttribute('data-consent')).toBe('analytics');

    // Idempotent: a second call must not stack duplicate tags.
    applyAnalyticsConsent(true);
    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1);

    // Revoking consent removes the tag again.
    applyAnalyticsConsent(false);
    expect(scriptElement()).toBeNull();
  });

  it('never emits events without consent', () => {
    vi.stubEnv('VITE_ANALYTICS_URL', PROVIDER_URL);
    const listener = vi.fn();
    window.addEventListener(ANALYTICS_EVENT, listener);

    // Undecided.
    trackAnalytics('page_view');
    // Decided but refused.
    setConsent(false);
    trackAnalytics('page_view');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(ANALYTICS_EVENT, listener);
  });

  it('never emits events without a configured provider', () => {
    setConsent(true);
    const listener = vi.fn();
    window.addEventListener(ANALYTICS_EVENT, listener);

    trackAnalytics('page_view');

    expect(isAnalyticsConfigured()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(ANALYTICS_EVENT, listener);
  });

  it('emits name-only events when consented and configured', () => {
    vi.stubEnv('VITE_ANALYTICS_URL', PROVIDER_URL);
    setConsent(true);
    const listener = vi.fn();
    window.addEventListener(ANALYTICS_EVENT, listener);

    trackAnalytics('catalog_view');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    // Payload is the event name only — no user, session, or identifier data.
    expect(event.detail).toEqual({ event: 'catalog_view' });
    window.removeEventListener(ANALYTICS_EVENT, listener);
  });
});
