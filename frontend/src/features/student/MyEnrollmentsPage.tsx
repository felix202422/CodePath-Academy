import { BookOpen, Clock3 } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMyEnrollments } from '../enrollment/useEnrollments';
import type { EnrollmentStatus } from '../enrollment/enrollmentApi';

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
};

const STATUS_TONE: Record<EnrollmentStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

/** Enrollment requests and decisions belonging only to the signed-in student. */
export function MyEnrollmentsPage() {
  const enrollments = useMyEnrollments();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Student account
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">My enrollments</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Review your course requests and administrator decisions. Only your own enrollment
          history is shown here.
        </p>
      </header>

      {enrollments.isPending && (
        <p className="text-sm text-ink-muted" role="status">Loading your enrollment history…</p>
      )}
      {enrollments.isError && (
        <Alert tone="danger">{enrollments.error.message || 'Enrollment history could not be loaded.'}</Alert>
      )}
      {enrollments.data && enrollments.data.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No enrollment requests yet"
          description="Browse the published courses and request access to a course you want to study."
          action={(
            <Link to="/courses">
              <Button size="sm">Browse courses</Button>
            </Link>
          )}
        />
      )}
      {enrollments.data && enrollments.data.length > 0 && (
        <ul className="space-y-4">
          {enrollments.data.map((enrollment) => (
            <li key={enrollment.id}>
              <Card className="flex flex-col gap-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>
                    <Link
                      to={`/courses/${enrollment.courseSlug}`}
                      className="hover:text-accent-700 hover:underline"
                    >
                      {enrollment.courseTitle}
                    </Link>
                  </CardTitle>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                    <Clock3 className="size-4" aria-hidden="true" />
                    Requested {formatDate(enrollment.requestedAt)}
                  </p>
                  {enrollment.reviewedAt && (
                    <p className="mt-1 text-sm text-ink-muted">
                      Reviewed {formatDate(enrollment.reviewedAt)}
                    </p>
                  )}
                  {enrollment.reviewNotes && (
                    <p className="mt-3 rounded-md bg-canvas px-3 py-2 text-sm text-ink-muted">
                      Administrator note: {enrollment.reviewNotes}
                    </p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[enrollment.status]}>
                  {STATUS_LABEL[enrollment.status]}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
