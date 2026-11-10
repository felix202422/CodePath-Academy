import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './ApiStatus';

function renderStatus() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApiStatus', () => {
  it('shows live API data once the health check resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'UP',
          service: 'codepath-academy',
          time: '2026-11-10T00:00:00Z',
        }),
        { status: 200 },
      ),
    );

    renderStatus();

    expect(await screen.findByTestId('api-status')).toHaveTextContent('UP');
    expect(screen.getByText('codepath-academy')).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    renderStatus();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to reach the API');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    // A later successful attempt must clear the error.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' }),
        { status: 200 },
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByTestId('api-status')).toHaveTextContent('UP'));
  });
});
