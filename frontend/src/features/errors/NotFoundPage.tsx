import { Link } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';
import { buttonClasses } from '../../components/ui/buttonStyles';

export function NotFoundPage() {
  usePageMeta({ title: 'Page Not Found', noindex: true });
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Error 404</p>
      <h1 className="mt-3 text-4xl font-bold text-navy-950">Page not found</h1>
      <p className="mt-4 text-ink-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-8')}>
        Back to home
      </Link>
    </div>
  );
}
