import { PathCard } from './PathCard';
import { QueryState } from './QueryState';
import { usePaths } from './useCatalog';

/** Public learning-path listing with real course counts. */
export function LearningPathsPage() {
  const paths = usePaths();

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-navy-950">Learning paths</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Structured routes through the curriculum. Each path groups published
        courses in teaching order, so you always know what to learn next.
      </p>

      <div className="mt-8">
        <QueryState query={paths}>
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
