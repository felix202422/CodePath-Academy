import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { CourseCard } from './CourseCard';
import { ApiRequestError } from '../../lib/api';
import { usePath } from './useCatalog';
import { useFavoriteCourses } from './useFavoriteCourses';

/** Public learning-path detail with its published courses. */
export function PathDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const path = usePath(slug);
  const favorites = useFavoriteCourses();

  if (path.isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm text-ink-muted" role="status">
          Loading learning path…
        </p>
      </div>
    );
  }

  if (path.isError) {
    if (path.error instanceof ApiRequestError && path.error.status === 404) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold text-navy-950">Learning path not found</h1>
          <p className="mt-3 text-ink-muted">
            This path does not exist or is not published yet.
          </p>
          <Link to="/paths" className="mt-6 inline-block text-accent-600 hover:underline">
            Back to learning paths
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Alert tone="danger">
          {path.error instanceof ApiRequestError
            ? path.error.message
            : 'The learning path could not be loaded. Please try again.'}
        </Alert>
      </div>
    );
  }

  const data = path.data;

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        to="/paths"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Learning paths
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span
          className="block h-2 w-16 rounded-full"
          style={{ backgroundColor: data.accentColor ?? '#2563eb' }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-ink-muted">
          {data.courseCount} {data.courseCount === 1 ? 'course' : 'courses'}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold text-navy-950">{data.name}</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-muted">{data.summary}</p>
      {data.description && (
        <p className="mt-4 max-w-3xl whitespace-pre-line text-ink-muted">
          {data.description}
        </p>
      )}

      <section aria-labelledby="courses-heading" className="mt-10">
        <h2 id="courses-heading" className="text-xl font-bold text-navy-950">
          Courses in this path
        </h2>
        {data.courses.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No published courses in this path yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((course) => (
              <li key={course.slug}>
                <CourseCard
                  course={course}
                  isFavorite={favorites.isFavorite(course.slug)}
                  onToggleFavorite={favorites.toggleFavorite}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
