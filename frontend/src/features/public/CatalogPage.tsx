import { useState } from 'react';
import { CourseCard } from './CourseCard';
import { QueryState } from './QueryState';
import { useCatalog, usePaths } from './useCatalog';
import { cn } from '../../lib/cn';

/**
 * Public course catalog: every published course in curriculum order, with an
 * optional learning-path filter.
 */
export function CatalogPage() {
  const catalog = useCatalog();
  const paths = usePaths();
  const [pathFilter, setPathFilter] = useState<string | null>(null);

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-navy-950">Course catalog</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Every published course, straight from the academy database. Courses are
        grouped into learning paths and ordered the way the curriculum teaches
        them — start at the beginning of a path or jump to a subject you need.
      </p>

      {paths.data && (
        <div
          className="mt-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter courses by learning path"
        >
          <button
            type="button"
            aria-pressed={pathFilter === null}
            onClick={() => setPathFilter(null)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              pathFilter === null
                ? 'border-navy-950 bg-navy-950 text-white'
                : 'border-slate-300 bg-surface text-ink hover:bg-slate-50',
            )}
          >
            All paths
          </button>
          {paths.data.map((path) => (
            <button
              key={path.slug}
              type="button"
              aria-pressed={pathFilter === path.slug}
              onClick={() => setPathFilter(path.slug)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                pathFilter === path.slug
                  ? 'border-navy-950 bg-navy-950 text-white'
                  : 'border-slate-300 bg-surface text-ink hover:bg-slate-50',
              )}
            >
              {path.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        <QueryState query={catalog}>
          {(courses) => {
            const visible = pathFilter
              ? courses.filter((course) => course.pathSlug === pathFilter)
              : courses;
            if (visible.length === 0) {
              return (
                <p className="rounded-lg border border-dashed border-slate-300 bg-surface px-6 py-10 text-center text-sm text-ink-muted">
                  No published courses in this learning path yet.
                </p>
              );
            }
            return (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((course) => (
                  <li key={course.slug}>
                    <CourseCard course={course} />
                  </li>
                ))}
              </ul>
            );
          }}
        </QueryState>
      </div>
    </article>
  );
}
