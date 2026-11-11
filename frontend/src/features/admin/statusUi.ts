import type { BadgeTone } from '../../components/ui/Badge';
import type { ContentStatus, ImportStatus } from './adminApi';

/** Badge tone for a publication status, shared by every admin screen. */
export function statusTone(status: ContentStatus): BadgeTone {
  switch (status) {
    case 'PUBLISHED':
      return 'success';
    case 'ARCHIVED':
      return 'warning';
    case 'DRAFT':
      return 'neutral';
  }
}

/** Badge tone for one row of an import run. */
export function importTone(status: ImportStatus): BadgeTone {
  switch (status) {
    case 'IMPORTED':
      return 'success';
    case 'UNCHANGED':
      return 'neutral';
    case 'CONFLICT':
      return 'warning';
    case 'FAILED':
      return 'danger';
  }
}

export interface StatusAction {
  target: ContentStatus;
  label: string;
}

function actionLabel(current: ContentStatus, target: ContentStatus): string {
  if (target === 'PUBLISHED') return 'Publish';
  if (target === 'ARCHIVED') return 'Archive';
  return current === 'ARCHIVED' ? 'Restore to draft' : 'Unpublish';
}

/**
 * The two transitions available from the current status (a status never
 * transitions to itself): DRAFT⇄PUBLISHED⇄ARCHIVED with labels that read as
 * commands from the row's point of view.
 */
export function statusActions(current: ContentStatus): StatusAction[] {
  return (['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
    .filter((candidate) => candidate !== current)
    .map((target) => ({ target, label: actionLabel(current, target) }));
}

/** Localized date + time for admin tables. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/** First seven characters of a commit hash, the abbreviation git users expect. */
export function shortCommit(commit: string): string {
  return commit.slice(0, 7);
}
