import { Mail } from 'lucide-react';
import { usePageMeta } from '../../lib/pageMeta';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { AdminQueryState } from './AdminQueryState';
import { useContactMessages, useMarkContactMessageRead } from './adminContactApi';
import { formatDateTime } from './statusUi';

/**
 * /admin/messages: the contact-form inbox. Messages are stored by the public
 * form (there is no SMTP), and this screen is the only way administrators
 * read them. Marking read is idempotent and lands in the audit trail like
 * every other admin mutation.
 */
export function AdminMessagesPage() {
  usePageMeta({ title: 'Messages', noindex: true });
  const messages = useContactMessages();
  const markRead = useMarkContactMessageRead();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Messages</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Messages submitted through the public contact form, newest first. The academy has no
          email integration — this inbox is where every message is delivered.
        </p>
      </header>

      <AdminQueryState
        query={messages}
        loadingLabel="Loading messages…"
        subject="contact messages"
      >
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No messages yet"
              description="Messages sent through the contact form appear here for review."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      From
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Subject
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Message
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Received
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        {row.readAt ? (
                          <Badge tone="neutral">Read</Badge>
                        ) : (
                          <Badge tone="info">Unread</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{row.name}</p>
                        <a
                          href={`mailto:${row.email}`}
                          className="mt-0.5 block text-xs break-all text-accent-600 underline underline-offset-2"
                        >
                          {row.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{row.subject}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-md whitespace-pre-wrap text-ink-muted">
                          {row.message}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!row.readAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={markRead.isPending && markRead.variables === row.id}
                            onClick={() => markRead.mutate(row.id)}
                          >
                            Mark read
                          </Button>
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
