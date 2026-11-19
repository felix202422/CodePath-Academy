import { usePageMeta } from '../../lib/pageMeta';
import { PathCard } from './PathCard';
import { QueryState } from './QueryState';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePaths } from './useCatalog';

/** Public learning-path listing with real course counts. */
export function LearningPathsPage() {
  usePageMeta({
    title: 'Career Paths',
    description:
      'Published technology learning paths with their real course counts — structured routes from foundations to advanced topics.',
  });
  const paths = usePaths();

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-navy-950">Learning paths</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Structured routes through the curriculum. Each path groups published
        courses in teaching order, so you always know what to learn next.
      </p>

      <div className="mt-8">
        <QueryState
          query={paths}
          fallback={
            <div role="status" aria-label="Loading learning paths">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-52 w-full" />
                ))}
              </div>
              <span className="sr-only">Loading learning paths…</span>
            </div>
          }
        >
          {(items) => (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((path) => (
                <li key={path.slug}>
                  <PathCard path={path} />
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>
    </article>
  );
}
