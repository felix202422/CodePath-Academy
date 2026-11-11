import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { useAcceptImport, useDiscardImport, useImportRow } from './adminApi';
import { formatDateTime, shortCommit } from './statusUi';

export interface ConflictReviewModalProps {
  importId: string;
  onClose: () => void;
}

/**
 * Side-by-side review of one CONFLICT row: the academy-edited body against the
 * staged source proposal, with accept (take source) and discard (keep academy)
 * resolutions.
 */
export function ConflictReviewModal({ importId, onClose }: ConflictReviewModalProps) {
  const row = useImportRow(importId, true);
  const accept = useAcceptImport();
  const discard = useDiscardImport();
  const saving = accept.isPending || discard.isPending;
  const error = accept.error ?? discard.error;

  return (
    <Modal open onClose={onClose} title="Review import conflict">
      {row.isPending && <SpinnerCentered label="Loading conflict…" />}
      {row.isError && (
        <Alert tone="danger">
          {row.error.message || 'The conflict could not be loaded. Please try again.'}
        </Alert>
      )}
      {row.data && (
        <div className="space-y-4">
          <div>
            <code className="block break-all text-sm text-ink">{row.data.sourcePath}</code>
            <p className="mt-1 text-xs text-ink-muted">
              {row.data.sourceRepository} · {shortCommit(row.data.sourceCommit)} ·{' '}
              {formatDateTime(row.data.createdAt)}
            </p>
          </div>
          {row.data.message && <Alert tone="warning">{row.data.message}</Alert>}

          <div>
            <h3 className="text-sm font-semibold text-ink">Academy version (edited)</h3>
            <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-ink">
              {row.data.currentBody ?? 'No academy version exists for this lesson yet.'}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Proposed source version</h3>
            <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-ink">
              {row.data.proposedBody ?? 'The source repository staged no proposal for this row.'}
            </pre>
          </div>

          {error && <Alert tone="danger">{error.message || 'The conflict could not be resolved.'}</Alert>}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              loading={discard.isPending}
              disabled={saving}
              onClick={() => discard.mutate(importId, { onSuccess: onClose })}
            >
              Keep academy version
            </Button>
            <Button
              loading={accept.isPending}
              disabled={saving}
              onClick={() => accept.mutate(importId, { onSuccess: onClose })}
            >
              Accept source version
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
