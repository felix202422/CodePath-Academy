import { Link } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';

/**
 * Terms of Use. Plain-language terms covering accounts, enrollment review,
 * acceptable use, and the no-payment nature of the current service. The
 * contact address renders only when configured — nothing is invented.
 */
export function TermsPage() {
  usePageMeta({
    title: 'Terms of Use',
    description:
      'The terms that apply when you use CodePath-Academy — accounts, enrollment review, acceptable use, and service limitations.',
  });
  const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
  const updated = 'November 2026';

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Legal</p>
      <h1 className="mt-2 text-3xl font-bold text-navy-950">Terms of Use</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: {updated}</p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-ink-muted">
        <section aria-labelledby="terms-accept">
          <h2 id="terms-accept" className="text-base font-semibold text-ink">
            1. Acceptance of terms
          </h2>
          <p className="mt-2">
            By creating an account or otherwise using CodePath-Academy, you agree to these Terms
            of Use and to our{' '}
            <Link to="/privacy" className="font-medium text-accent-600 underline underline-offset-2">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the service.
          </p>
        </section>

        <section aria-labelledby="terms-accounts">
          <h2 id="terms-accounts" className="text-base font-semibold text-ink">
            2. Accounts and approval
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Self-registration submits a <strong className="text-ink">request</strong>. An
              account is not active — and sign-in stays disabled — until an administrator
              approves it.
            </li>
            <li>
              You are responsible for keeping your password confidential and for all activity
              that happens under your account.
            </li>
            <li>
              Provide accurate information and keep your contact details current so
              administrators can reach you about your requests.
            </li>
          </ul>
        </section>

        <section aria-labelledby="terms-enrollment">
          <h2 id="terms-enrollment" className="text-base font-semibold text-ink">
            3. Enrollments and course access
          </h2>
          <p className="mt-2">
            Course enrollment is requested per course and reviewed by an administrator. An
            enrollment request is not an enrollment: access begins only when the request is
            approved. Approval decisions are made by the academy and may be declined.
          </p>
        </section>

        <section aria-labelledby="terms-use">
          <h2 id="terms-use" className="text-base font-semibold text-ink">
            4. Acceptable use
          </h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>attempt to access accounts or data that are not yours;</li>
            <li>interfere with the service, probe its security, or circumvent access controls;</li>
            <li>submit unlawful, harmful, or infringing content through forms on the site;</li>
            <li>misuse the contact form for spam or bulk messaging.</li>
          </ul>
        </section>

        <section aria-labelledby="terms-content">
          <h2 id="terms-content" className="text-base font-semibold text-ink">
            5. Course content and intellectual property
          </h2>
          <p className="mt-2">
            Published curriculum is provided for personal learning. Where content originates
            from an external source repository, that source's license (for example, MIT) governs
            your use of it; see the license note on individual course pages.
          </p>
        </section>

        <section aria-labelledby="terms-disclaimer">
          <h2 id="terms-disclaimer" className="text-base font-semibold text-ink">
            6. Service provided "as is"
          </h2>
          <p className="mt-2">
            The service is provided without warranties of any kind, to the extent permitted by
            law. We do not guarantee that courses will lead to employment or any particular
            outcome. Nothing in these terms limits liability that cannot be limited by law.
          </p>
        </section>

        <section aria-labelledby="terms-suspension">
          <h2 id="terms-suspension" className="text-base font-semibold text-ink">
            7. Suspension and termination
          </h2>
          <p className="mt-2">
            Administrators may suspend or remove accounts that violate these terms, including
            pending registrations that provide false information. You may request deletion of
            your account at any time through the{' '}
            <Link to="/contact" className="font-medium text-accent-600 underline underline-offset-2">
              contact form
            </Link>
            {contactEmail && (
              <>
                {' '}or{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-medium text-accent-600 underline underline-offset-2"
                >
                  {contactEmail}
                </a>
              </>
            )}
            .
          </p>
        </section>

        <section aria-labelledby="terms-changes">
          <h2 id="terms-changes" className="text-base font-semibold text-ink">
            8. Changes to these terms
          </h2>
          <p className="mt-2">
            We may update these terms; the update date above changes when we do. Material changes
            will be announced on the site. Continued use after an update constitutes acceptance
            of the revised terms.
          </p>
          <p className="mt-4">
            Questions about these terms? Use the{' '}
            <Link to="/contact" className="font-medium text-accent-600 underline underline-offset-2">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
