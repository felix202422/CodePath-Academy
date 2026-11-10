import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AdminLayout } from './AdminLayout';
import { PublicLayout } from './PublicLayout';
import { StudentLayout } from './StudentLayout';

function renderShell(Shell: () => React.JSX.Element, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Shell />
    </MemoryRouter>,
  );
}

describe('PublicLayout', () => {
  it('renders primary navigation, auth entry points, and footer', () => {
    renderShell(PublicLayout);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Courses');
    expect(nav).toHaveTextContent('Learning paths');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('toggles the mobile menu with correct aria state', async () => {
    renderShell(PublicLayout);

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
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
  it('renders the student navigation around the routed outlet', () => {
    renderShell(StudentLayout, '/student');

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Dashboard');
    expect(nav).toHaveTextContent('My learning');
    expect(nav).toHaveTextContent('Assessments');
    expect(screen.getByRole('button', { name: 'Switch account' })).toBeInTheDocument();
    // The shell has no public footer — students are inside the app.
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  it('renders the administration navigation and badge', () => {
    renderShell(AdminLayout, '/admin');

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('Students');
    expect(nav).toHaveTextContent('Courses');
    expect(nav).toHaveTextContent('Content');
    expect(nav).toHaveTextContent('Announcements');
    expect(nav).toHaveTextContent('Audit log');
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
