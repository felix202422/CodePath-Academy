/**
 * Cookie-consent store. Essential cookies (session, CSRF, theme) are always
 * on; the optional analytics flag defaults to *undecided*, which the app
 * treats exactly like a refusal — analytics never runs without an explicit,
 * persisted "yes". The decision lives in localStorage and is announced
 * through a window event so the banner, footer link, and analytics gate
 * stay in sync without a global provider.
 */

import { useEffect, useState } from 'react';

export interface ConsentDecision {
  analytics: boolean;
  decidedAt: string;
}

const STORAGE_KEY = 'cpa.consent';
export const CONSENT_CHANGE_EVENT = 'cpa:consent-change';
/** Footer's "Cookie preferences" link dispatches this to reopen the dialog. */
export const OPEN_PREFERENCES_EVENT = 'cpa:open-preferences';

/**
 * In-memory fallback for storage-disabled browsers (private mode, blocked
 * localStorage): the decision still applies for the session even though it
 * cannot be persisted. Only consulted when reading storage failed or the
 * last persist attempt failed — a working storage with no stored key means
 * genuinely undecided.
 */
let sessionDecision: ConsentDecision | null = null;
let persistFailed = false;

export function getConsent(): ConsentDecision | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is unavailable; the in-memory decision governs the session.
    return sessionDecision;
  }

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Partial<ConsentDecision> | null;
      if (typeof parsed?.analytics === 'boolean') {
        return {
          analytics: parsed.analytics,
          decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : '',
        };
      }
    } catch {
      // Corrupt value: treat as undecided rather than guessing.
    }
    return null;
  }

  // No stored key: only a failed persist keeps the in-memory copy alive.
  return persistFailed ? sessionDecision : null;
}

export function setConsent(analytics: boolean): ConsentDecision {
  const decision: ConsentDecision = {
    analytics,
    decidedAt: new Date().toISOString(),
  };
  sessionDecision = decision;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decision));
    persistFailed = false;
  } catch {
    // Persisting failed; the in-memory decision still governs this session.
    persistFailed = true;
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  return decision;
}

/** True only after an explicit, stored "allow analytics" choice. */
export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

/** Subscribe to decision changes; returns an unsubscribe function. */
export function onConsentChange(listener: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
}

/** Ask the shared banner to open its preference dialog. */
export function requestPreferencesOpen(): void {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

/**
 * React view of the current decision (null = undecided). Re-renders when
 * any part of the app writes a new decision.
 */
export function useConsent(): ConsentDecision | null {
  const [decision, setDecision] = useState<ConsentDecision | null>(getConsent);
  useEffect(() => onConsentChange(() => setDecision(getConsent())), []);
  return decision;
}
