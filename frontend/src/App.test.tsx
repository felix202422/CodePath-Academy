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

interface SessionFixture {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'ADMIN';
  status: 'ACTIVE';
}

/**
 * Routes fetch by URL: the session probe answers with the fixture (or 401 for
 * anonymous visitors) and health answers with the Phase 1 payload.
 */
function mockApi(session: SessionFixture | null = null) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const json = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (url.includes('/api/v1/auth/me')) {
      return session
        ? json(session, 200)
        : json({ message: 'Authentication required' }, 401);
    }
    if (url.includes('/api/v1/health')) {
      return json({ status: 'UP', service: 'codepath-academy', time: '2026-11-10T00:00:00Z' }, 200);
    }
    if (url === '/api/v1/me/learning') {
      return json({
        enrolledCourseCount: 0,
        totalLessonCount: 0,
        completedLessonCount: 0,
        progressPercent: 0,
        courses: [],
      }, 200);
    }
    return json({ message: 'Not found' }, 404);
  });
}

const student: SessionFixture = {
  id: 's-1',
  email: 'student@example.com',
  fullName: 'Sam Student',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const admin: SessionFixture = {
  id: 'a-1',
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
};

describe('App routing', () => {
  it('renders the academy home page at the root path', async () => {
    mockApi(null);

    renderApp('/');

    expect(
      screen.getByRole('heading', { level: 1, name: /Learn\. Build\. Innovate\. Become\./ }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('api-status')).toHaveTextContent('UP');
  });

  it('renders the public shell with the real course catalog', async () => {
    mockApi(null);

    renderApp('/courses');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Explore Our Courses' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    // The catalog fetch fails against this mock; the page reports it honestly
    // instead of rendering placeholder courses.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders the student shell at /student for an authenticated student', async () => {
    mockApi(student);

    renderApp('/student');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My learning' })).toBeInTheDocument();
  });

  it('renders the admin shell at /admin for an authenticated administrator', async () => {
    mockApi(admin);

    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Administration dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('redirects an anonymous visitor from /student to the sign-in page', async () => {
    mockApi(null);

    renderApp('/student');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to your account' }),
    ).toBeInTheDocument();
  });

  it('redirects a student away from the admin area to their own dashboard', async () => {
    mockApi(student);

    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Student dashboard' }),
    ).toBeInTheDocument();
  });

  it('renders a 404 page for unknown paths', async () => {
    mockApi(null);

    renderApp('/definitely/not/a/route');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
