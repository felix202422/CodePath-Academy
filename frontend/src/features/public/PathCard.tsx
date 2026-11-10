import { Link } from 'react-router';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import type { PathSummary } from './catalogApi';

/** Catalog card for one published learning path. */
export function PathCard({ path }: { path: PathSummary }) {
  return (
    <Link to={`/paths/${path.slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <span
          className="block h-1.5 w-12 rounded-full"
          style={{ backgroundColor: path.accentColor ?? '#2563eb' }}
          aria-hidden="true"
        />
        <CardTitle className="mt-3">{path.name}</CardTitle>
        <CardDescription className="mt-2 flex-1">{path.summary}</CardDescription>
        <p className="mt-4 text-xs font-medium text-ink-muted">
          {path.courseCount} {path.courseCount === 1 ? 'course' : 'courses'}
        </p>
      </Card>
    </Link>
  );
}
