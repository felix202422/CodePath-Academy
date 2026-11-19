import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { applyAnalyticsConsent } from '../../lib/analytics';
import {
  OPEN_PREFERENCES_EVENT,
  setConsent,
  useConsent,
} from '../../lib/consent';

/**
 * Cookie preference dialog: essential cookies are always on (they cannot be
 * switched off without breaking the site), analytics is a single opt-in
 * toggle. The parent mounts it only while open, so the toggle always starts
 * from the stored decision. Saving writes the decision, closes the dialog,
 * and reconciles the analytics gate immediately.
 */
export function PreferenceCenter({
  onClose,
  onDecide,
  initialAnalytics,
}: {
  onClose: () => void;
  onDecide: (analytics: boolean) => void;
  initialAnalytics: boolean;
}) {
  const [analytics, setAnalytics] = useState(initialAnalytics);

  return (
    <Modal
      open
      onClose={onClose}
      title="Cookie preferences"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onDecide(analytics)}>Save preferences</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-ink-muted">
          Choose which cookies this site may use. Your choice is stored in this browser and can
          be changed at any time from the footer link.
        </p>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-ink">Essential — always active</p>
          <p className="mt-1 text-sm text-ink-muted">
            Session, CSRF, and theme cookies that keep you signed in and secure. The site cannot
            work without them.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-accent-600"
          />
          <span>
            <span className="text-sm font-semibold text-ink">Allow analytics</span>
            <span className="mt-1 block text-sm text-ink-muted">
              Anonymous page-view measurement through an optional analytics provider. Disabled by
              default, and no names, emails, or other personal data are ever attached to events.
              When no provider is configured, nothing is loaded regardless of this setting.
            </span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

/**
 * Global cookie banner (mounted once in App). Shown until the visitor makes
 * a choice; afterwards only the footer's "Cookie preferences" link reopens
 * the dialog. Analytics stays off while the banner is undecided.
 */
export function CookieBanner() {
  const decision = useConsent();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Boot: reconcile the analytics gate with any previously stored decision,
  // and listen for "open preferences" requests from legal pages/footer.
  useEffect(() => {
    applyAnalyticsConsent(decision?.analytics === true);
    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
  }, [decision?.analytics]);

  const decide = (analytics: boolean) => {
    setConsent(analytics);
    applyAnalyticsConsent(analytics);
    setPreferencesOpen(false);
  };

  const undecided = decision === null;

  return (
    <>
      {undecided && (
        <div
          role="region"
          aria-label="Cookie notice"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-surface shadow-[0_-8px_24px_rgba(23,22,63,0.12)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <Cookie className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden="true" />
              <p className="text-sm leading-6 text-ink-muted">
                We use essential cookies to keep the site working. Optional analytics stays off
                unless you allow it. Read the{' '}
                <Link to="/privacy" className="font-medium text-accent-600 underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPreferencesOpen(true)}>
                Cookie preferences
              </Button>
              <Button variant="outline" size="sm" onClick={() => decide(false)}>
                Essential only
              </Button>
              <Button variant="primary" size="sm" onClick={() => decide(true)}>
                Allow analytics
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mounted only while open: the toggle seeds from the stored decision
          at mount, so no effect needs to re-sync it. */}
      {preferencesOpen && (
        <PreferenceCenter
          onClose={() => setPreferencesOpen(false)}
          onDecide={decide}
          initialAnalytics={decision?.analytics ?? false}
        />
      )}
    </>
  );
}
