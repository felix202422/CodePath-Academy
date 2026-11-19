import { Megaphone } from 'lucide-react';
import { usePageMeta } from '../../lib/pageMeta';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Card, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { MarkdownContent } from '../../components/ui/MarkdownContent';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { useMyAnnouncements } from './announcementsApi';

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(value));
}

/**
 * The signed-in student's announcement feed. Scope and publication are
 * resolved by the server: only published platform-wide or approved-course
 * announcements reach this list.
 */
export function MyAnnouncementsPage() {
  usePageMeta({ title: 'Announcements', noindex: true });
  const announcements = useMyAnnouncements();

  if (announcements.isPending) {
    return <SpinnerCentered label="Loading announcements…" />;
  }
  if (announcements.isError) {
    return (
      <Alert tone="danger">
        {announcements.error.message || 'Announcements could not be loaded. Please try again.'}
      </Alert>
    );
  }

  const rows = announcements.data;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Updates
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Announcements</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Platform notices and updates for the courses you are enrolled in.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Published platform and course announcements will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((announcement) => (
            <li key={announcement.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>{announcement.title}</CardTitle>
                    <p className="mt-1 text-xs text-ink-muted">
                      {announcement.courseTitle
                        ? `Course update · ${announcement.courseTitle}`
                        : 'Platform-wide'}
                      {formatDate(announcement.publishedAt) &&
                        ` · ${formatDate(announcement.publishedAt)}`}
                    </p>
                  </div>
                  <Badge tone={announcement.audience === 'ALL' ? 'info' : 'neutral'}>
                    {announcement.audience === 'ALL' ? 'Everyone' : 'Students'}
                  </Badge>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <MarkdownContent markdown={announcement.bodyMarkdown} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
