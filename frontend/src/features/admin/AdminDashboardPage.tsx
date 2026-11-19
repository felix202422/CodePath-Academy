import {
  Activity,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Route,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Link } from 'react-router';
import { usePageMeta } from '../../lib/pageMeta';
import { Card } from '../../components/ui/Card';
import { AdminQueryState } from './AdminQueryState';
import { useAdminDashboard, type AdminDashboardResponse } from './adminApi';
import { formatDateTime } from './statusUi';

interface StatCardProps {
  icon: typeof Route;
  label: string;
  value: number;
  to?: string;
  tone: string;
}

function StatCard({ icon: Icon, label, value, to, tone }: StatCardProps) {
  const body = (
    <>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="text-2xl font-bold text-navy-950">{value}</p>
      </div>
    </>
  );
  return (
    <Card className="flex items-center gap-4 transition-all duration-200 hover:border-accent-300 hover:shadow-md">
      {to ? (
        <Link to={to} className="flex items-center gap-4 focus-visible:outline-2 focus-visible:outline-accent-500">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

function AuditList({ entries }: { entries: AdminDashboardResponse['recentAudit'] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-6 text-sm text-ink-muted">
        No administrative actions have been recorded yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-surface">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              <code className="text-xs">{entry.action}</code>
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {entry.actorEmail ?? 'Unknown account'}
              {entry.entityId && (
                <>
                  {' · '}
                  <span className="font-mono">{entry.entityType}</span>
                </>
              )}
            </p>
          </div>
          <time className="text-xs text-ink-muted">{formatDateTime(entry.createdAt)}</time>
        </li>
      ))}
    </ul>
  );
}

/** Administrator home: live queue/account/content counts plus recent activity. */
export function AdminDashboardPage() {
  usePageMeta({ title: 'Admin Dashboard', noindex: true });
  const dashboard = useAdminDashboard();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Review queues, account totals, published content, and the latest administrative
          actions — all counted live from the platform's records.
        </p>
      </header>

      <AdminQueryState
        query={dashboard}
        loadingLabel="Loading dashboard…"
        subject="dashboard"
      >
        {(data) => (
          <>
            <section aria-label="Review queues" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={ClipboardList}
                label="Pending registrations"
                value={data.pendingRegistrations}
                to="/admin/students"
                tone="bg-amber-50 text-amber-700"
              />
              <StatCard
                icon={UserCheck}
                label="Pending enrollments"
                value={data.pendingEnrollments}
                to="/admin/enrollments"
                tone="bg-blue-50 text-blue-700"
              />
              <StatCard
                icon={Megaphone}
                label="Published announcements"
                value={data.publishedAnnouncements}
                to="/admin/announcements"
                tone="bg-accent-50 text-accent-700"
              />
            </section>

            <section aria-label="Accounts and content" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={GraduationCap}
                label="Active students"
                value={data.activeStudents}
                to="/admin/students"
                tone="bg-green-50 text-green-700"
              />
              <StatCard
                icon={UserX}
                label="Suspended students"
                value={data.suspendedStudents}
                to="/admin/students"
                tone="bg-red-50 text-red-700"
              />
              <StatCard
                icon={BookOpen}
                label="Published courses"
                value={data.publishedCourses}
                to="/admin/courses"
                tone="bg-green-50 text-green-700"
              />
              <StatCard
                icon={Route}
                label="Published paths"
                value={data.publishedPaths}
                to="/admin/courses"
                tone="bg-green-50 text-green-700"
              />
            </section>

            <section aria-labelledby="recent-activity-heading" className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="recent-activity-heading" className="flex items-center gap-2 text-xl font-semibold text-navy-950">
                    <Activity className="size-5 text-accent-700" aria-hidden="true" />
                    Recent activity
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    The last {data.recentAudit.length} recorded administrative actions.
                  </p>
                </div>
                <Link
                  to="/admin/audit"
                  className="text-sm font-semibold text-accent-700 hover:underline"
                >
                  View full audit log
                </Link>
              </div>
              <AuditList entries={data.recentAudit} />
            </section>
          </>
        )}
      </AdminQueryState>
    </div>
  );
}
