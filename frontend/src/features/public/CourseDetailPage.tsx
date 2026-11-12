import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../auth/useSession';
import { useMyCourseEnrollment, useRequestEnrollment } from '../enrollment/useEnrollments';
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
  const session = useSession();
  const isActiveStudent =
    session.data?.role === 'STUDENT' && session.data.status === 'ACTIVE';
  const enrollment = useMyCourseEnrollment(course.data?.id ?? '', isActiveStudent);
  const request = useRequestEnrollment();

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

      <section aria-labelledby="enrollment-heading" className="mt-8 rounded-xl border border-slate-200 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="enrollment-heading" className="text-xl font-bold text-navy-950">
              Course enrollment
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {data.enrollmentCount} {data.enrollmentCount === 1 ? 'learner is' : 'learners are'} currently enrolled.
            </p>
          </div>

          {isActiveStudent ? (
            enrollment.isPending ? (
              <p className="text-sm text-ink-muted" role="status">Checking your enrollment…</p>
            ) : enrollment.isError ? (
              <Alert tone="danger">{enrollment.error.message}</Alert>
            ) : enrollment.data?.status === 'APPROVED' ? (
              <div className="flex flex-col items-start gap-2">
                <Badge tone="success">Enrolled</Badge>
                <Link to="/student/enrollments" className="text-sm font-semibold text-accent-700 hover:underline">
                  View enrollment history
                </Link>
              </div>
            ) : enrollment.data?.status === 'PENDING' ? (
              <Badge tone="warning">Request pending review</Badge>
            ) : enrollment.data?.status === 'REJECTED' ? (
              <div className="max-w-sm text-sm text-ink-muted">
                <Badge tone="danger">Request declined</Badge>
                <p className="mt-2">
                  This request has already been reviewed. Contact an administrator if you need help.
                </p>
                {enrollment.data.reviewNotes && <p className="mt-2">{enrollment.data.reviewNotes}</p>}
              </div>
            ) : (
              <Button
                loading={request.isPending}
                disabled={request.isPending}
                onClick={() => request.mutate(data.id)}
              >
                Request enrollment
              </Button>
            )
          ) : session.isPending ? (
            <p className="text-sm text-ink-muted" role="status">Checking your account…</p>
          ) : session.data?.role === 'ADMIN' ? (
            <p className="max-w-sm text-sm text-ink-muted">
              Enrollment requests are available to active student accounts.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link
                to="/login"
                className="inline-flex cursor-pointer items-center rounded-lg bg-accent-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-sm"
              >
                Sign in to request
              </Link>
              <Link
                to="/register"
                className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50"
              >
                Apply Now
              </Link>
            </div>
          )}
        </div>
        {request.error && (
          <Alert tone="danger" className="mt-4">{request.error.message}</Alert>
        )}
        {request.isSuccess && (
          <Alert tone="success" className="mt-4">
            Request sent. An administrator will review your enrollment.
          </Alert>
        )}
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
