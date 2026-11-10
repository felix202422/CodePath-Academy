import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Card, CardTitle } from '../../components/ui/Card';
import { ApiRequestError } from '../../lib/api';
import { useCourse } from './useCatalog';
import type { CourseLevel } from './catalogApi';

const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const LEVEL_TONE: Record<CourseLevel, BadgeTone> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'info',
  ADVANCED: 'warning',
};

/** Public course detail: metadata, prerequisites, and content status. */
export function CourseDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const course = useCourse(slug);

  if (course.isPending) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm text-ink-muted" role="status">
          Loading course…
        </p>
      </div>
    );
  }

  if (course.isError) {
    if (course.error instanceof ApiRequestError && course.error.status === 404) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold text-navy-950">Course not found</h1>
          <p className="mt-3 text-ink-muted">
            This course does not exist or is not published yet.
          </p>
          <Link to="/courses" className="mt-6 inline-block text-accent-600 hover:underline">
            Back to the course catalog
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Alert tone="danger">
          {course.error instanceof ApiRequestError
            ? course.error.message
            : 'The course could not be loaded. Please try again.'}
        </Alert>
      </div>
    );
  }

  const data = course.data;

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        to="/courses"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Course catalog
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={LEVEL_TONE[data.level]}>{LEVEL_LABEL[data.level]}</Badge>
        <Link to={`/paths/${data.pathSlug}`}>
          <Badge tone="info">{data.pathName}</Badge>
        </Link>
      </div>

      <h1 className="mt-3 text-3xl font-bold text-navy-950">{data.title}</h1>
      <p className="mt-3 text-lg text-ink-muted">{data.summary}</p>

      {data.lessonCount === 0 && (
        <Alert tone="info" className="mt-6">
          Lesson content for this course has not been imported yet. This page
          shows the reviewed course metadata; lessons are added by the content
          import process and appear here once published.
        </Alert>
      )}

      <section aria-labelledby="description-heading" className="mt-8">
        <h2 id="description-heading" className="text-xl font-bold text-navy-950">
          About this course
        </h2>
        <p className="mt-3 whitespace-pre-line text-ink-muted">{data.description}</p>
      </section>

      <section aria-labelledby="structure-heading" className="mt-8">
        <h2 id="structure-heading" className="text-xl font-bold text-navy-950">
          Course structure
        </h2>
        <div className="mt-3 flex gap-6 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-4" aria-hidden="true" />
            {data.moduleCount} {data.moduleCount === 1 ? 'module' : 'modules'}
          </span>
          <span className="inline-flex items-center gap-2">
            <GraduationCap className="size-4" aria-hidden="true" />
            {data.lessonCount} {data.lessonCount === 1 ? 'lesson' : 'lessons'}
          </span>
        </div>
      </section>

      {data.prerequisites.length > 0 && (
        <section aria-labelledby="prerequisites-heading" className="mt-8">
          <h2 id="prerequisites-heading" className="text-xl font-bold text-navy-950">
            Prerequisites
          </h2>
          <ul className="mt-3 space-y-2">
            {data.prerequisites.map((prereq) => (
              <li key={prereq.slug}>
                <Link
                  to={`/courses/${prereq.slug}`}
                  className="text-accent-600 hover:underline"
                >
                  {prereq.title}
                </Link>
                <span className="text-sm text-ink-muted"> — {prereq.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.sourceRepository && (
        <Card className="mt-8">
          <CardTitle>Content source</CardTitle>
          <p className="mt-2 text-sm text-ink-muted">
            Course metadata is taken from the MIT-licensed{' '}
            <a
              href={data.sourceRepository}
              target="_blank"
              rel="noreferrer"
              className="text-accent-600 hover:underline"
            >
              CodePath-Masterclass
            </a>{' '}
            curriculum repository. The exact source commit is recorded with each
            imported lesson.
          </p>
        </Card>
      )}
    </article>
  );
}
