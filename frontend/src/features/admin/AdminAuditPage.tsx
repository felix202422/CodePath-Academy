import { History, Search } from 'lucide-react';
import { useState } from 'react';
import { usePageMeta } from '../../lib/pageMeta';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { AdminQueryState } from './AdminQueryState';
import { useAuditLog } from './adminApi';
import { formatDateTime } from './statusUi';

/**
 * Entity types recorded by AuditInterceptor: the first path segment under
 * /api/v1/admin, so this list mirrors the administration surfaces.
 */
const ENTITY_OPTIONS = [
  { value: '', label: 'All activity' },
  { value: 'students', label: 'Students' },
  { value: 'registrations', label: 'Registrations' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'courses', label: 'Courses' },
  { value: 'paths', label: 'Learning paths' },
  { value: 'modules', label: 'Modules' },
  { value: 'lessons', label: 'Lessons' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'content', label: 'Content import' },
];

const LIMIT_OPTIONS = [
  { value: '25', label: 'Last 25 actions' },
  { value: '50', label: 'Last 50 actions' },
  { value: '100', label: 'Last 100 actions' },
];

/**
 * /admin/audit: the append-only record of administrative mutations. Rows are
 * written by the server after each successful action and are never edited
 * through this screen — it only reads and filters.
 */
export function AdminAuditPage() {
  usePageMeta({ title: 'Audit Log', noindex: true });
  const [entityType, setEntityType] = useState('');
  const [limit, setLimit] = useState(50);
  const audit = useAuditLog(entityType || undefined, limit);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-navy-950">Audit log</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Every successful administrative action, newest first. Entries are append-only and
            record who acted, what changed, and when.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Filter by surface"
            options={ENTITY_OPTIONS}
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          />
          <Select
            label="Entries"
            options={LIMIT_OPTIONS}
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value))}
          />
        </div>
      </header>

      <AdminQueryState query={audit} loadingLabel="Loading audit entries…" subject="audit entries">
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={entityType ? Search : History}
              title="No matching audit entries"
              description={
                entityType
                  ? 'No administrative actions have been recorded for this surface yet.'
                  : 'No administrative actions have been recorded yet. They appear here after the first mutation.'
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <th scope="col" className="px-4 py-3">
                      When
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Administrator
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Surface
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{row.actorName ?? 'Removed account'}</p>
                        {row.actorEmail && (
                          <p className="mt-0.5 text-xs text-ink-muted">{row.actorEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="break-all text-xs text-ink">{row.action}</code>
                        {row.details && (
                          <p className="mt-1 text-xs text-ink-muted">{row.details}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="info">{row.entityType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.entityId ? (
                          <code className="break-all text-xs text-ink-muted">{row.entityId}</code>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </AdminQueryState>
    </div>
  );
}
