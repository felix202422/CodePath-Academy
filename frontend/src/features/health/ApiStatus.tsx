import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

/**
 * Live backend health panel (Phase 1 proof). The hero and section headings are
 * provided by the page that embeds it; this component only reports API state.
 */
export function ApiStatus() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/api/v1/health'),
  });

  return (
    <section aria-live="polite" aria-label="API status">
      {isPending && <p className="text-ink-muted">Checking the academy API…</p>}
      {error instanceof Error && (
        <div>
          <p className="text-danger" role="alert">
            Unable to reach the API: {error.message}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            Retry
          </button>
        </div>
      )}
      {data && (
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-muted">Status</dt>
            <dd className="font-medium text-success" data-testid="api-status">
              {data.status}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Service</dt>
            <dd className="font-medium text-ink">{data.service}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Server time</dt>
            <dd className="font-medium text-ink">{new Date(data.time).toLocaleString()}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
