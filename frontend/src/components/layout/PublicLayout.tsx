import { Link, Outlet, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';

const PUBLIC_NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/paths', label: 'Learning paths' },
  { to: '/about', label: 'About' },
];

/** Shell for anonymous visitors: primary nav, auth entry points, footer. */
export function PublicLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        items={PUBLIC_NAV}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign in
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
              Register
            </Button>
          </>
        }
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} CodePath Academy. Learn. Build. Innovate. Become.</p>
          <nav aria-label="Footer">
            <ul className="flex gap-4">
              <li>
                <Link className="hover:text-ink" to="/courses">
                  Courses
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink" to="/paths">
                  Learning paths
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink" to="/about">
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
