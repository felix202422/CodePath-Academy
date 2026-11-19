import { Link } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';
import { requestPreferencesOpen } from '../../lib/consent';

/**
 * Privacy Policy (GDPR-style). Written for this application only: it
 * describes the data the academy actually stores (accounts, enrollments,
 * progress, contact messages, consent choice) and the analytics gate that
 * ships disabled by default. The contact address is only rendered when the
 * deployment configures one — nothing is invented.
 */
export function PrivacyPage() {
  usePageMeta({
    title: 'Privacy Policy',
    description:
      'How CodePath-Academy collects, uses, and protects your personal data — accounts, learning progress, contact messages, and cookie consent.',
  });
  const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
  const updated = 'November 2026';

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Legal</p>
      <h1 className="mt-2 text-3xl font-bold text-navy-950">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: {updated}</p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-ink-muted">
        <section aria-labelledby="privacy-who">
          <h2 id="privacy-who" className="text-base font-semibold text-ink">
            Who we are
          </h2>
          <p className="mt-2">
            CodePath-Academy is a learning platform that publishes technology courses and learning
            paths. This policy explains what personal data we process when you use this site and
            what choices you have.
          </p>
        </section>

        <section aria-labelledby="privacy-collect">
          <h2 id="privacy-collect" className="text-base font-semibold text-ink">
            What we collect
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Account data</strong> — your name, email address, and
              password (stored only as a bcrypt hash), plus the role and status an administrator
              assigns to your account.
            </li>
            <li>
              <strong className="text-ink">Learning data</strong> — enrollment requests, lesson
              progress, and assessment attempts you submit while studying.
            </li>
            <li>
              <strong className="text-ink">Messages you send us</strong> — anything you enter in
              the contact form (name, email, subject, message), stored in the academy's message
              inbox for administrator review.
            </li>
            <li>
              <strong className="text-ink">Technical essentials</strong> — a session cookie that
              keeps you signed in and a CSRF token cookie that protects form submissions. These
              are strictly necessary for the site to work.
            </li>
            <li>
              <strong className="text-ink">Your cookie choice</strong> — whether you allow
              optional analytics, stored in your browser (see below).
            </li>
          </ul>
        </section>

        <section aria-labelledby="privacy-use">
          <h2 id="privacy-use" className="text-base font-semibold text-ink">
            How we use it
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>To provide accounts, enrollments, coursework, and progress tracking.</li>
            <li>To let administrators review registrations, enrollment requests, and your messages.</li>
            <li>To keep the service secure (authentication, abuse prevention, audit logging of
              administrative actions).</li>
          </ul>
          <p className="mt-2">
            We do not sell your data, do not run advertising trackers, and do not share personal
            data with third parties except where the law requires it.
          </p>
        </section>

        <section aria-labelledby="privacy-cookies">
          <h2 id="privacy-cookies" className="text-base font-semibold text-ink">
            Cookies and analytics
          </h2>
          <p className="mt-2">
            Essential cookies (session, CSRF, theme preference) are always active because the
            site cannot function without them. Optional analytics is <strong className="text-ink">off
            by default</strong>: an analytics provider script is only loaded after you explicitly
            allow it in the cookie banner or preference center, and it can be withdrawn at any
            time. When configured, analytics measures page views only — no names, emails, or
            other personal identifiers are attached to events.
          </p>
          <p className="mt-2">
            You can change your choice at any time from{' '}
            <button
              type="button"
              className="cursor-pointer font-medium text-accent-600 underline underline-offset-2"
              onClick={requestPreferencesOpen}
            >
              Cookie preferences
            </button>
            .
          </p>
        </section>

        <section aria-labelledby="privacy-rights">
          <h2 id="privacy-rights" className="text-base font-semibold text-ink">
            Your rights
          </h2>
          <p className="mt-2">
            Depending on your jurisdiction, you may request access to your personal data, its
            correction or deletion, or a copy in portable form. Because administrator and
            learning records are tied to your account, send such requests through the{' '}
            <Link to="/contact" className="font-medium text-accent-600 underline underline-offset-2">
              contact form
            </Link>
            {contactEmail && (
              <>
                {' '}or by email at{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-medium text-accent-600 underline underline-offset-2"
                >
                  {contactEmail}
                </a>
              </>
            )}
            . We will respond within the timeframe your local law requires.
          </p>
        </section>

        <section aria-labelledby="privacy-retention">
          <h2 id="privacy-retention" className="text-base font-semibold text-ink">
            Retention and security
          </h2>
          <p className="mt-2">
            Account and learning records are kept while your account exists; contact messages are
            kept in the administrator inbox until reviewed and deleted. Data is transmitted over
            HTTPS, passwords are hashed with bcrypt, and access to administrative data is
            enforced server-side on every request.
          </p>
        </section>

        <section aria-labelledby="privacy-changes">
          <h2 id="privacy-changes" className="text-base font-semibold text-ink">
            Changes to this policy
          </h2>
          <p className="mt-2">
            When this policy changes materially, the update date above changes with it. Continued
            use of the site after a change means you accept the revised policy.
          </p>
          <p className="mt-4">
            See also our{' '}
            <Link to="/terms" className="font-medium text-accent-600 underline underline-offset-2">
              Terms of Use
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
