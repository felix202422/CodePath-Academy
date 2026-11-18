import { Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { AdminQueryState } from './AdminQueryState';
import { AnnouncementFormModal } from './AnnouncementFormModal';
import { StatusButtons } from './StatusButtons';
import {
  useAdminAnnouncements,
  useAdminCourses,
  useSetAnnouncementStatus,
  type AnnouncementAdminResponse,
  type ContentStatus,
} from './adminApi';
import { formatDateTime, statusTone } from './statusUi';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All announcements' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface FormModalState {
  open: boolean;
  announcement: AnnouncementAdminResponse | null;
}

function audienceLabel(audience: AnnouncementAdminResponse['audience']) {
  return audience === 'ALL' ? 'Everyone' : 'Students';
}

/**
 * /admin/announcements: draft-first authoring with explicit publication
 * transitions. Edits never carry a status; the row's status only moves
 * through the dedicated /status action.
 */
export function AdminAnnouncementsPage() {
  const [filter, setFilter] = useState<ContentStatus | ''>('');
  const announcements = useAdminAnnouncements(filter || undefined);
  const courses = useAdminCourses();
  const statusMutation = useSetAnnouncementStatus();
  const [modal, setModal] = useState<FormModalState>({ open: false, announcement: null });

  const pendingId = statusMutation.isPending ? statusMutation.variables?.id : undefined;
  const pendingTarget = statusMutation.isPending
    ? statusMutation.variables?.status
    : undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy-950">Announcements</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Draft platform and course announcements, then publish them explicitly. Students see
            only published announcements they are scoped to receive.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={filter}
            onChange={(event) => setFilter(event.target.value as ContentStatus | '')}
          />
          <Button size="sm" onClick={() => setModal({ open: true, announcement: null })}>
            <Plus className="size-4" aria-hidden="true" />
            New announcement
          </Button>
        </div>
      </header>

      {statusMutation.error && (
        <Alert tone="danger">
          {statusMutation.error.message || 'The status change could not be saved.'}
        </Alert>
      )}

      <AdminQueryState
        query={announcements}
        loadingLabel="Loading announcements…"
        subject="announcements"
      >
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={filter ? 'No announcements with this status' : 'No announcements yet'}
              description="Draft announcements stay invisible to students until you publish them."
              action={
                <Button size="sm" onClick={() => setModal({ open: true, announcement: null })}>
                  <Plus className="size-4" aria-hidden="true" />
                  New announcement
                </Button>
              }
            />
          ) : (
            <ul className="space-y-4">
              {rows.map((row) => (
                <li key={row.id}>
                  <Card className="space-y-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle>{row.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {row.courseId
                            ? `Course scope: ${row.courseTitle ?? 'Unknown course'}`
                            : 'Platform-wide'}
                          {' · '}
                          {audienceLabel(row.audience)}
                          {row.createdByEmail && ` · by ${row.createdByEmail}`}
                        </CardDescription>
                        <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                          {row.bodyMarkdown}
                        </p>
                        <p className="mt-2 text-xs text-ink-muted">
                          Created {formatDateTime(row.createdAt)}
                          {row.publishedAt && ` · published ${formatDateTime(row.publishedAt)}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setModal({ open: true, announcement: row })}
                      >
                        Edit
                      </Button>
                      <StatusButtons
                        current={row.status}
                        disabled={statusMutation.isPending}
                        pendingTarget={pendingId === row.id ? pendingTarget : undefined}
                        onSelect={(status) =>
                          statusMutation.mutate({ id: row.id, status })
                        }
                      />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </AdminQueryState>

      {modal.open && (
        <AnnouncementFormModal
          announcement={modal.announcement}
          courses={(courses.data ?? []).map((course) => ({
            id: course.id,
            title: course.title,
          }))}
          onClose={() => setModal({ open: false, announcement: null })}
        />
      )}
    </div>
  );
}
