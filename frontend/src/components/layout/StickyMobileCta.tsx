import { Link, useLocation } from 'react-router';

/** Routes where a persistent CTA would compete with the form or legal text. */
export const STICKY_CTA_HIDDEN_ON = /^\/(login|register|privacy|terms|contact)/;

interface StickyMobileCtaProps {
  /** Set once the visitor is signed in — their shells have their own actions. */
  signedIn?: boolean;
}

/**
 * Persistent call-to-action bar for viewports below `xl` (where the header
 * actions collapse into the disclosure menu). Pins to the bottom edge with
 * iOS/Android home-indicator safe-area padding and never covers page content:
 * the public shell reserves matching bottom padding while it is shown.
 */
export function StickyMobileCta({ signedIn = false }: StickyMobileCtaProps) {
  const { pathname } = useLocation();
  if (signedIn || STICKY_CTA_HIDDEN_ON.test(pathname)) return null;

  return (
    <div
      role="region"
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface/95 shadow-[0_-8px_24px_rgba(23,22,63,0.08)] backdrop-blur xl:hidden"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3 sm:px-6">
        <Link
          to="/courses"
          className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50 motion-reduce:transform-none"
        >
          Browse courses
        </Link>
        <Link
          to="/register"
          className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-sm motion-reduce:transform-none"
        >
          Apply Now
        </Link>
      </div>
    </div>
  );
}
