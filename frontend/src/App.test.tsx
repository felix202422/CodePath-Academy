import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function renderApp(initialPath = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App routing', () => {
  it('renders the academy landing view at the root path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' }),
        { status: 200 },
      ),
    );

    renderApp();

    expect(
      screen.getByRole('heading', { name: /Learn\. Build\. Innovate\. Become\./ }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('api-status')).toHaveTextContent('UP');
  });

  it('does not crash on unknown paths', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' }),
        { status: 200 },
      ),
    );

    renderApp('/definitely/not/a/route');

    expect(await screen.findByTestId('api-status')).toHaveTextContent('UP');
  });
});
