import { Check, ClipboardList, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select, Textarea } from '../../components/ui/Field';
import { AdminQueryState } from './AdminQueryState';
import {
  useAdminEnrollments,
  useReviewEnrollment,
} from '../enrollment/useEnrollments';
import type { EnrollmentStatus } from '../enrollment/enrollmentApi';

type EnrollmentFilter = 'ALL' | EnrollmentStatus;

const FILTER_OPTIONS = [
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All requests' },
];

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_TONE: Record<EnrollmentStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(value));
}

/** Administrator queue/history for explicit, auditable course access decisions. */
export function AdminEnrollmentsPage() {
  const [filter, setFilter] = useState<EnrollmentFilter>('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const status = filter === 'ALL' ? undefined : filter;
  const enrollments = useAdminEnrollments(status);
  const review = useReviewEnrollment();
  const pendingId = review.isPending ? review.variables?.id : undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
            Administrator review
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy-950">Enrollment requests</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Approve or reject course access requests. Decisions are recorded with the reviewer and
            any note provided.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Select
            label="Filter requests"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(event) => setFilter(event.target.value as EnrollmentFilter)}
          />
        </div>
      </header>

      {review.error && (
        <Alert tone="danger">{review.error.message || 'The enrollment decision could not be saved.'}</Alert>
      )}

      <AdminQueryState query={enrollments} loadingLabel="Loading enrollment requests…" subject="enrollment requests">
        {(rows) => rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filter === 'PENDING' ? 'No requests waiting for review' : 'No enrollment requests'}
            description="Student requests and administrator decisions will appear here from the enrollment ledger."
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.id}>
                <Card className="space-y-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle>
                        <Link
                          to={`/admin/courses/${row.courseId}`}
                          className="hover:text-accent-700 hover:underline"
                        >
                          {row.courseTitle}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Requested by {row.studentName} ({row.studentEmail})
                      </CardDescription>
                      <p className="mt-2 text-xs text-ink-muted">
                        Requested {formatDate(row.requestedAt)}
                      </p>
                      {row.reviewedAt && (
                        <p className="mt-1 text-xs text-ink-muted">
                          Reviewed {formatDate(row.reviewedAt)}
                        </p>
                      )}
                    </div>
                    <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                  </div>

                  {row.reviewNotes && (
                    <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-muted">
                      Previous note: {row.reviewNotes}
                    </p>
                  )}

                  {row.status === 'PENDING' && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <Textarea
                        label={`Review note for ${row.studentName}`}
                        value={notes[row.id] ?? ''}
                        maxLength={1000}
                        rows={2}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [row.id]: event.target.value }))
                        }
                        hint="Optional; visible to the student in their enrollment history."
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          loading={pendingId === row.id && review.variables?.decision === 'approve'}
                          disabled={review.isPending}
                          onClick={() => review.mutate({
                            id: row.id,
                            decision: 'approve',
                            notes: notes[row.id] ?? '',
                          })}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={pendingId === row.id && review.variables?.decision === 'reject'}
                          disabled={review.isPending}
                          onClick={() => review.mutate({
                            id: row.id,
                            decision: 'reject',
                            notes: notes[row.id] ?? '',
                          })}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AdminQueryState>
    </div>
  );
}
