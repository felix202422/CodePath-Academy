import { Link, useLocation } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { usePageMeta } from '../../lib/pageMeta';

interface SuccessState {
  message?: string;
}

/**
 * Registration thank-you page. Landing here never implies approval: the copy
 * states plainly that the account is not active yet and that sign-in stays
 * refused until an administrator reviews the request. Indexed as noindex —
 * it is a transactional screen, not public content.
 */
export function RegisterSuccessPage() {
  usePageMeta({
    title: 'Registration received',
    description:
      'Your CodePath-Academy registration request has been received and is waiting for administrator review.',
    noindex: true,
  });
  const location = useLocation();
  const backendMessage = (location.state as SuccessState | null)?.message;

  return (
    <section aria-labelledby="register-success-heading" className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">
          Request received
        </p>
        <h1
          id="register-success-heading"
          className="mt-2 text-2xl font-bold text-navy-950"
        >
          Your registration has been submitted
        </h1>

        <Alert tone="success" className="mt-5">
          {backendMessage ?? 'Your registration request was recorded successfully.'}
        </Alert>

        <p className="mt-4 text-sm leading-6 text-ink-muted">
          Your account is <strong>not active yet</strong>. This page only confirms that we
          received your request — it does not mean your registration was approved.
        </p>

        <section aria-labelledby="next-steps-heading" className="mt-6">
          <h2 id="next-steps-heading" className="text-sm font-semibold text-ink">
            What happens next
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-muted">
            <li>An administrator reviews your registration request.</li>
            <li>
              Until that review finishes, sign-in stays disabled for this email address —
              attempting to sign in will say so honestly.
            </li>
            <li>
              Once the request is approved, sign in with the password you set above to reach
              your student dashboard.
            </li>
          </ol>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex cursor-pointer items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-sm motion-reduce:transform-none"
          >
            Go to sign in
          </Link>
          <Link
            to="/courses"
            className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50 motion-reduce:transform-none"
          >
            Browse courses while you wait
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Changed your mind?{' '}
          <Link to="/" className="font-medium text-accent-600 underline underline-offset-2">
            Return to the home page
          </Link>
        </p>
      </Card>
    </section>
  );
}
