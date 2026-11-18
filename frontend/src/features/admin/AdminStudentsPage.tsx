import { Check, PauseCircle, PlayCircle, UserCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select, Textarea } from '../../components/ui/Field';
import { AdminQueryState } from './AdminQueryState';
import {
  useAdminRegistrations,
  useAdminStudents,
  useReactivateStudent,
  useReviewRegistration,
  useSuspendStudent,
  type RegistrationRequestResponse,
  type RegistrationStatus,
  type StudentAdminResponse,
  type UserStatus,
} from './adminApi';

const REGISTRATION_FILTER_OPTIONS = [
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const REGISTRATION_LABEL: Record<RegistrationStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const REGISTRATION_TONE: Record<RegistrationStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const ACCOUNT_FILTER_OPTIONS = [
  { value: '', label: 'All accounts' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ACCOUNT_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  PENDING: 'Awaiting review',
  REJECTED: 'Rejected',
};

const ACCOUNT_TONE: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PENDING: 'warning',
  REJECTED: 'neutral',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(value));
}

function RegistrationCard({
  row,
  review,
}: {
  row: RegistrationRequestResponse;
  review: ReturnType<typeof useReviewRegistration>;
}) {
  const [notes, setNotes] = useState('');
  const isPending = review.isPending && review.variables?.id === row.id;

  return (
    <Card className="space-y-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{row.fullName}</CardTitle>
          <CardDescription className="mt-1">{row.email}</CardDescription>
          {row.interests && (
            <p className="mt-2 text-sm text-ink-muted">Interested in: {row.interests}</p>
          )}
          <p className="mt-2 text-xs text-ink-muted">Registered {formatDate(row.createdAt)}</p>
          {row.reviewedAt && (
            <p className="mt-1 text-xs text-ink-muted">
              Reviewed {formatDate(row.reviewedAt)}
              {row.reviewNotes && ` — ${row.reviewNotes}`}
            </p>
          )}
        </div>
        <Badge tone={REGISTRATION_TONE[row.status]}>{REGISTRATION_LABEL[row.status]}</Badge>
      </div>

      {row.status === 'PENDING' && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <Textarea
            label={`Review note for ${row.fullName}`}
            value={notes}
            maxLength={1000}
            rows={2}
            onChange={(event) => setNotes(event.target.value)}
            hint="Optional; visible to the applicant in their review outcome."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={isPending && review.variables?.decision === 'approve'}
              disabled={review.isPending}
              onClick={() => review.mutate({ id: row.id, decision: 'approve', notes })}
            >
              <Check className="size-4" aria-hidden="true" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={isPending && review.variables?.decision === 'reject'}
              disabled={review.isPending}
              onClick={() => review.mutate({ id: row.id, decision: 'reject', notes })}
            >
              <X className="size-4" aria-hidden="true" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AccountRow({
  row,
  busy,
  onSuspend,
  onReactivate,
}: {
  row: StudentAdminResponse;
  busy: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-ink">{row.fullName}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{row.email}</p>
      </td>
      <td className="px-4 py-3 text-ink-muted">{formatDate(row.createdAt)}</td>
      <td className="px-4 py-3">
        <Badge tone={ACCOUNT_TONE[row.status]}>{ACCOUNT_LABEL[row.status]}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {/* State rules live server-side; the buttons only offer legal moves. */}
          {row.status === 'ACTIVE' && (
            <Button size="sm" variant="danger" disabled={busy} onClick={onSuspend}>
              <PauseCircle className="size-4" aria-hidden="true" />
              Suspend
            </Button>
          )}
          {row.status === 'SUSPENDED' && (
            <Button size="sm" disabled={busy} onClick={onReactivate}>
              <PlayCircle className="size-4" aria-hidden="true" />
              Reactivate
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * /admin/students: the registration review queue (approve/reject) above the
 * full account list with suspend/reactivate. Every transition is decided by
 * the server; this screen only surfaces the actions each state allows.
 */
export function AdminStudentsPage() {
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationStatus>('PENDING');
  const [accountFilter, setAccountFilter] = useState<UserStatus | ''>('');
  const registrations = useAdminRegistrations(registrationFilter);
  const students = useAdminStudents(accountFilter || undefined);
  const review = useReviewRegistration();
  const suspend = useSuspendStudent();
  const reactivate = useReactivateStudent();

  const pendingStudentId = suspend.isPending
    ? suspend.variables
    : reactivate.isPending
      ? reactivate.variables
      : undefined;

  const accountError = suspend.error ?? reactivate.error;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Students</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Review new registrations, then manage existing accounts. Suspending a student ends
          their sessions immediately; reactivating restores sign-in.
        </p>
      </header>

      <section aria-labelledby="registrations-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="registrations-heading" className="flex items-center gap-2 text-xl font-semibold text-navy-950">
              <UserCheck className="size-5 text-accent-700" aria-hidden="true" />
              Registration requests
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Approve or reject accounts created through public registration.
            </p>
          </div>
          <Select
            label="Filter registrations"
            options={REGISTRATION_FILTER_OPTIONS}
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value as RegistrationStatus)}
          />
        </div>

        {review.error && (
          <Alert tone="danger">
            {review.error.message || 'The registration decision could not be saved.'}
          </Alert>
        )}

        <AdminQueryState
          query={registrations}
          loadingLabel="Loading registration requests…"
          subject="registration requests"
        >
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title={
                  registrationFilter === 'PENDING'
                    ? 'No registrations waiting for review'
                    : 'No registration requests'
                }
                description="New accounts submitted through registration appear here for review."
              />
            ) : (
              <ul className="space-y-4">
                {rows.map((row) => (
                  <li key={row.id}>
                    <RegistrationCard row={row} review={review} />
                  </li>
                ))}
              </ul>
            )
          }
        </AdminQueryState>
      </section>

      <section aria-labelledby="accounts-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="accounts-heading" className="flex items-center gap-2 text-xl font-semibold text-navy-950">
              <Users className="size-5 text-accent-700" aria-hidden="true" />
              Accounts
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Every student account with its current lifecycle status.
            </p>
          </div>
          <Select
            label="Filter accounts"
            options={ACCOUNT_FILTER_OPTIONS}
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value as UserStatus | '')}
          />
        </div>

        {accountError && (
          <Alert tone="danger">
            {accountError.message || 'The account change could not be saved.'}
          </Alert>
        )}

        <AdminQueryState query={students} loadingLabel="Loading accounts…" subject="accounts">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No student accounts"
                description="Registered students will appear here once they create an account."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th scope="col" className="px-4 py-3">
                        Student
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Registered
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row) => (
                      <AccountRow
                        key={row.id}
                        row={row}
                        busy={pendingStudentId === row.id}
                        onSuspend={() => suspend.mutate(row.id)}
                        onReactivate={() => reactivate.mutate(row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </AdminQueryState>
      </section>
    </div>
  );
}
