import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { ApiRequestError } from '../../lib/api';

interface AdminQueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Spinner copy while the request is in flight, e.g. "Loading paths…". */
  loadingLabel: string;
  /** What failed to load, e.g. "paths", used in the fallback error copy. */
  subject: string;
  children: (data: T) => ReactNode;
}

/**
 * Loading/error presentation for admin queries: honest spinner while pending,
 * the server's message (or a subject-specific fallback) on failure, and the
 * rendered children once data arrives.
 */
export function AdminQueryState<T>({ query, loadingLabel, subject, children }: AdminQueryStateProps<T>) {
  if (query.isPending) {
    return <SpinnerCentered label={loadingLabel} />;
  }
  if (query.isError) {
    const message =
      query.error instanceof ApiRequestError
        ? query.error.message
        : `The ${subject} could not be loaded. Please try again.`;
    return <Alert tone="danger">{message}</Alert>;
  }
  return <>{children(query.data)}</>;
}
