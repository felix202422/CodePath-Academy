import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';
import { PublicLayout } from './PublicLayout';
import { StudentLayout } from './StudentLayout';
import { ThemeProvider } from '../../features/theme/ThemeContext';

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
          <ThemeProvider>
            <Shell />
          </ThemeProvider>
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
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
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

  it('pins the sticky mobile CTA and reserves matching bottom space', async () => {
    mockAnonymousSession();
    const { container } = renderShell(PublicLayout);

    expect(await screen.findByRole('region', { name: 'Quick actions' })).toBeInTheDocument();
    // Bottom padding (safe-area aware) keeps the footer clear of the fixed bar.
    expect(container.firstElementChild?.className).toContain(
      'pb-[calc(5rem_+_env(safe-area-inset-bottom))]',
    );
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
    expect(nav).toHaveTextContent('Announcements');
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

/**
 * Phase 10 responsive contract: every shell shares one disclosure pattern on
 * small screens — a toggle wired to the panel through aria-expanded and
 * aria-controls, keyboard-operable, closing again once a destination is chosen.
 */
describe('responsive navigation disclosure', () => {
  it('opens the student menu from the keyboard and closes it after a choice', async () => {
    mockAnonymousSession();
    renderShell(StudentLayout, '/student');

    const toggle = await screen.findByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'site-nav-panel');

    toggle.focus();
    await userEvent.keyboard('{Enter}');

    const panel = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(panel).toHaveAttribute('id', 'site-nav-panel');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(panel).getByRole('link', { name: 'My learning' })).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('link', { name: 'My learning' }));

    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('uses the same disclosure for the dense admin navigation', async () => {
    mockAnonymousSession();
    renderShell(AdminLayout, '/admin');

    const toggle = await screen.findByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    const panel = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(within(panel).getByRole('link', { name: 'Audit log' })).toBeInTheDocument();
    // The panel carries the actions the inline header hides on small screens.
    expect(within(panel).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('link', { name: 'Students' }));

    expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).not.toBeInTheDocument();
  });

  it('marks the current destination with aria-current for assistive tech', async () => {
    mockAnonymousSession();
    renderShell(StudentLayout, '/student/learning');

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    expect(within(nav).getByRole('link', { name: 'My learning' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
