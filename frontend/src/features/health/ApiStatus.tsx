import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface HealthResponse {
  status: string;
  service: string;
  time: string;
}

/** Phase 1 proof page: real backend health data, no fake metrics. */
export function ApiStatus() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/api/v1/health'),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">
        CodePath-Academy
      </p>
      <h1 className="mt-3 text-4xl font-bold text-navy-950 sm:text-5xl">
        Learn. Build. Innovate. Become.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-muted">
        The platform is initializing. This page confirms the frontend can reach the
        academy API.
      </p>

      <section
        aria-live="polite"
        className="mt-8 rounded-lg border border-slate-200 bg-surface p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-ink uppercase">API status</h2>
        {isPending && <p className="mt-3 text-ink-muted">Checking the academy API…</p>}
        {error instanceof Error && (
          <div className="mt-3">
            <p className="text-danger" role="alert">
              Unable to reach the API: {error.message}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500"
            >
              Retry
            </button>
          </div>
        )}
        {data && (
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
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
    </main>
  );
}
