import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_CHANGE_EVENT,
  OPEN_PREFERENCES_EVENT,
  getConsent,
  hasAnalyticsConsent,
  onConsentChange,
  requestPreferencesOpen,
  setConsent,
} from './consent';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('consent store', () => {
  it('starts undecided and treats that exactly like a refusal', () => {
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists an explicit allow with a timestamp', () => {
    const decision = setConsent(true);

    expect(decision.analytics).toBe(true);
    expect(decision.decidedAt).not.toBe('');
    expect(getConsent()).toEqual(decision);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('cpa.consent') ?? '{}')).toEqual(decision);
  });

  it('persists an explicit refusal as a decision, not as undecided', () => {
    setConsent(false);

    expect(getConsent()?.analytics).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('announces changes to subscribers until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = onConsentChange(listener);

    setConsent(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toBeInstanceOf(Event);

    unsubscribe();
    setConsent(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('tolerates corrupt stored JSON by falling back to undecided', () => {
    window.localStorage.setItem('cpa.consent', '{not-json');

    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('ignores stored values that are not a real decision', () => {
    window.localStorage.setItem('cpa.consent', JSON.stringify({ analytics: 'yes' }));

    expect(getConsent()).toBeNull();
  });

  it('keeps the decision in memory when storage writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const decision = setConsent(true);

    // Persisting failed, but the session still honors the choice.
    expect(getConsent()).toEqual(decision);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('falls back to the in-memory decision when storage reads are blocked', () => {
    setConsent(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('requestPreferencesOpen emits the shared open event', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_PREFERENCES_EVENT, listener);

    requestPreferencesOpen();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_PREFERENCES_EVENT, listener);
  });

  it('exposes the event names it dispatches', () => {
    expect(CONSENT_CHANGE_EVENT).toBe('cpa:consent-change');
    expect(OPEN_PREFERENCES_EVENT).toBe('cpa:open-preferences');
  });
});
