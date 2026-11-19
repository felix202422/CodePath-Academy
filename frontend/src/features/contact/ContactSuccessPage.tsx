import { Link, useLocation } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { usePageMeta } from '../../lib/pageMeta';

interface SuccessState {
  message?: string;
}

/**
 * Contact thank-you page. The copy is deliberately honest: the message was
 * *recorded*, not emailed, and review happens from the administrator inbox —
 * no delivery, reply, or response-time promise is implied. Noindex because
 * it is a transactional screen.
 */
export function ContactSuccessPage() {
  usePageMeta({
    title: 'Message received',
    description:
      'Your message to CodePath-Academy has been recorded and is waiting for administrator review.',
    noindex: true,
  });
  const location = useLocation();
  const backendMessage = (location.state as SuccessState | null)?.message;

  return (
    <section aria-labelledby="contact-success-heading" className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">
          Message received
        </p>
        <h1
          id="contact-success-heading"
          className="mt-2 text-2xl font-bold text-navy-950"
        >
          Your message has been recorded
        </h1>

        <Alert tone="success" className="mt-5">
          {backendMessage ?? 'Your message was recorded successfully.'}
        </Alert>

        <p className="mt-4 text-sm leading-6 text-ink-muted">
          Your message is stored in the academy's message inbox. An administrator will review it
          from there — this page confirms receipt only and does not guarantee a reply.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="inline-flex cursor-pointer items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-sm motion-reduce:transform-none"
          >
            Send another message
          </Link>
          <Link
            to="/courses"
            className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50 motion-reduce:transform-none"
          >
            Browse courses
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
