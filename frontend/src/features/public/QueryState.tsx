import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert } from '../../components/ui/Alert';
import { SpinnerCentered } from '../../components/ui/Spinner';
import { ApiRequestError } from '../../lib/api';

interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}

/**
 * Shared loading/error presentation for public catalog queries. Detail pages
 * handle their own 404s (they render a "not found" screen instead).
 */
export function QueryState<T>({ query, children }: QueryStateProps<T>) {
  if (query.isPending) {
    return <SpinnerCentered label="Loading catalog…" />;
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
