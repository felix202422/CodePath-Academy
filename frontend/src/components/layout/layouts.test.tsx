import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';
import { PublicLayout } from './PublicLayout';
import { StudentLayout } from './StudentLayout';

/** Session probe answers "anonymous" so the shells render their signed-out state. */
function mockAnonymousSession() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

function renderShell(Shell: () => React.JSX.Element, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Shell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublicLayout', () => {
  it('renders primary navigation, auth entry points, and footer', async () => {
    mockAnonymousSession();
    renderShell(PublicLayout);

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Courses');
    expect(nav).toHaveTextContent('Career Paths');
    expect(nav).toHaveTextContent('About Us');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Now' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search for courses' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('toggles the mobile menu with correct aria state', async () => {
    mockAnonymousSession();
    renderShell(PublicLayout);

    const toggle = await screen.findByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Mobile panel is hidden until opened.
    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('navigation', { name: 'Primary mobile' })).toBeInTheDocument();
  });
});

describe('StudentLayout', () => {
  it('renders the student navigation around the routed outlet', async () => {
    mockAnonymousSession();
    renderShell(StudentLayout, '/student');

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Dashboard');
    expect(nav).toHaveTextContent('My learning');
    expect(nav).toHaveTextContent('Assessments');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    // The shell has no public footer — students are inside the app.
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  it('renders the administration navigation and badge', async () => {
    mockAnonymousSession();
    renderShell(AdminLayout, '/admin');

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Students');
    expect(nav).toHaveTextContent('Courses');
    expect(nav).toHaveTextContent('Content');
    expect(nav).toHaveTextContent('Announcements');
    expect(nav).toHaveTextContent('Audit log');
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
