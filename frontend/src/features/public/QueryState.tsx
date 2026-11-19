import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Skeleton';
import { ApiRequestError } from '../../lib/api';

interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Layout-matched loading placeholder; a plain skeleton block by default. */
  fallback?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Shared loading/error presentation for public catalog queries. Detail pages
 * handle their own 404s (they render a "not found" screen instead).
 */
export function QueryState<T>({ query, fallback, children }: QueryStateProps<T>) {
  if (query.isPending) {
    return (
      <>
        {fallback ?? (
          <div role="status" aria-label="Loading catalog">
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </>
    );
  }
  if (query.isError) {
    const message =
      query.error instanceof ApiRequestError
        ? query.error.message
        : 'The catalog could not be loaded. Please try again.';
    return <Alert tone="danger">{message}</Alert>;
  }
  return <>{children(query.data)}</>;
}
