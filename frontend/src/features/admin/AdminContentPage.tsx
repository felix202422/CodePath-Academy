import { History, PlayCircle, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
import { AdminQueryState } from './AdminQueryState';
import { ConflictReviewModal } from './ConflictReviewModal';
import {
  useImportRows,
  useImportSource,
  useRunImport,
  type ImportRunResponse,
  type ImportMode,
} from './adminApi';
import { formatDateTime, importTone, shortCommit } from './statusUi';

type ImportModeOption = 'AUTO' | ImportMode;

const MODE_OPTIONS = [
  { value: 'AUTO', label: 'Auto (server decides)' },
  { value: 'LOCAL', label: 'Local repository path' },
  { value: 'REMOTE', label: 'Remote (git fetch)' },
];

/**
 * /admin/content — source configuration, the import run action with its real
 * result summary, the conflict review queue, and recent import history.
 */
export function AdminContentPage() {
  const source = useImportSource();
  const conflicts = useImportRows('CONFLICT');
  const history = useImportRows();
  const importRun = useRunImport();
  const [mode, setMode] = useState<ImportModeOption>('AUTO');
  const [reviewImportId, setReviewImportId] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-navy-950">Content import</h1>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Run source-aware curriculum imports from the CodePath-Masterclass repository, then
          review conflicts before they reach students.
        </p>
      </header>

      <section aria-labelledby="source-heading" className="space-y-4">
        <h2 id="source-heading" className="text-xl font-semibold text-navy-950">
          Source
        </h2>
        <AdminQueryState query={source} loadingLabel="Loading source…" subject="import source">
          {(info) => (
            <Card>
              <CardTitle>Curriculum repository</CardTitle>
              <CardDescription>
                Imports read from this repository; the commit pin freezes a known-good revision.
              </CardDescription>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <dt className="w-36 shrink-0 text-ink-muted">Repository</dt>
                  <dd className="min-w-0 break-all text-ink">
                    {info.repository || 'Not configured'}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="w-36 shrink-0 text-ink-muted">Local path</dt>
                  <dd className="min-w-0 break-all text-ink">
                    {info.localPathConfigured && info.localPath
                      ? info.localPath
                      : 'Not configured'}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-2">
                  <dt className="w-36 shrink-0 text-ink-muted">Commit pin</dt>
                  <dd className="min-w-0 break-all text-ink">
                    {info.commitPin ? (
                      <code>{info.commitPin}</code>
                    ) : (
                      'No commit pin configured'
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </AdminQueryState>
      </section>

      <section aria-labelledby="run-heading" className="space-y-4">
        <h2 id="run-heading" className="text-xl font-semibold text-navy-950">
          Run import
        </h2>
        <Card>
          <CardTitle>Scan the source and apply changes</CardTitle>
          <CardDescription>
            New lessons are created, changed source lessons are staged for review, and academy
            edits are never overwritten automatically.
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="w-full max-w-xs">
              <Select
                label="Mode"
                options={MODE_OPTIONS}
                value={mode}
                onChange={(event) => setMode(event.target.value as ImportModeOption)}
              />
            </div>
            <Button
              loading={importRun.isPending}
              disabled={importRun.isPending}
              onClick={() => importRun.mutate(mode === 'AUTO' ? null : mode)}
            >
              <PlayCircle className="size-4" aria-hidden="true" />
              Run import
            </Button>
            {importRun.isPending && (
              <Spinner label="Importing… (this can take a minute in remote mode)" />
            )}
          </div>
          {importRun.error && (
            <Alert tone="danger" className="mt-4">
              {importRun.error.message || 'The import could not be run. Please try again.'}
            </Alert>
          )}
          {importRun.data && <RunSummary run={importRun.data} />}
        </Card>
      </section>

      <section aria-labelledby="conflicts-heading" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="conflicts-heading" className="text-xl font-semibold text-navy-950">
            Conflicts
          </h2>
          {conflicts.data && conflicts.data.length > 0 && (
            <Badge tone="warning">{conflicts.data.length} waiting</Badge>
          )}
        </div>
        <AdminQueryState query={conflicts} loadingLabel="Loading conflicts…" subject="conflicts">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={TriangleAlert}
                title="No conflicts waiting for review"
                description="Every import row either applied cleanly or has already been resolved."
              />
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <code className="block break-all text-sm text-ink">{row.sourcePath}</code>
                      {row.message && (
                        <p className="mt-1 text-sm text-ink-muted">{row.message}</p>
                      )}
                      <p className="mt-1 text-xs text-ink-muted">
                        {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={importTone(row.status)}>{row.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setReviewImportId(row.id)}>
                        Review
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </AdminQueryState>
      </section>

      <section aria-labelledby="history-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="size-5 text-ink-muted" aria-hidden="true" />
          <h2 id="history-heading" className="text-xl font-semibold text-navy-950">
            Recent imports
          </h2>
        </div>
        <AdminQueryState query={history} loadingLabel="Loading history…" subject="import history">
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={History}
                title="No imports yet"
                description="No imports yet — run the first import to build the history."
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
                        Source path
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Commit
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-3">
                          <Badge tone={importTone(row.status)}>{row.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <code className="break-all text-xs text-ink-muted">
                            {row.sourcePath}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-ink-muted">
                            {shortCommit(row.sourceCommit)}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {formatDateTime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </AdminQueryState>
      </section>

      {reviewImportId && (
        <ConflictReviewModal
          importId={reviewImportId}
          onClose={() => setReviewImportId(null)}
        />
      )}
    </div>
  );
}

function RunSummary({ run }: { run: ImportRunResponse }) {
  const stats: Array<{ label: string; value: string }> = [
    { label: 'Subjects scanned', value: String(run.subjectsScanned) },
    { label: 'Lessons created', value: String(run.lessonsCreated) },
    { label: 'Lessons updated', value: String(run.lessonsUpdated) },
    { label: 'Lessons unchanged', value: String(run.lessonsUnchanged) },
    { label: 'Conflicts staged', value: String(run.conflictsStaged) },
    { label: 'Failures', value: String(run.failures) },
    { label: 'Media files stored', value: String(run.mediaFilesStored) },
    { label: 'Duration', value: `${(run.durationMs / 1000).toFixed(1)}s` },
  ];

  return (
    <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-green-900">
          Import finished — {run.mode} mode
        </h3>
        <code className="text-xs text-green-800">{shortCommit(run.commit)}</code>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-green-200 bg-surface px-3 py-2"
          >
            <dt className="text-xs font-medium tracking-wide text-green-800 uppercase">
              {stat.label}
            </dt>
            <dd className="mt-0.5 text-lg font-semibold text-green-900">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {run.unmappedSubjects.length > 0 && (
        <p className="mt-3 text-sm text-green-900">
          Unmapped subjects: {run.unmappedSubjects.join(', ')}
        </p>
      )}
      {run.warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-green-900">
          {run.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 break-all text-xs text-green-800">{run.repository}</p>
    </div>
  );
}
