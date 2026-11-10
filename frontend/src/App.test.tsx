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

function mockHealthOk() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' }),
      { status: 200 },
    ),
  );
}

describe('App routing', () => {
  it('renders the academy home page at the root path', async () => {
    mockHealthOk();

    renderApp('/');

    expect(
      screen.getByRole('heading', { level: 1, name: /Learn\. Build\. Innovate\. Become\./ }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('api-status')).toHaveTextContent('UP');
  });

  it('renders the public shell and placeholder for the course catalog', () => {
    renderApp('/courses');

    expect(screen.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the student shell at /student', () => {
    renderApp('/student');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Student dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My learning' })).toBeInTheDocument();
  });

  it('renders the admin shell at /admin', () => {
    renderApp('/admin');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Administration dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('renders a 404 page for unknown paths', () => {
    renderApp('/definitely/not/a/route');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
