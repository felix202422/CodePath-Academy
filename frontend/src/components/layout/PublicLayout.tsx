import { Link, Outlet, useNavigate } from 'react-router';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';
import { homeForRole } from '../../features/auth/authApi';
import { useLogout, useSession } from '../../features/auth/useSession';

const PUBLIC_NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/paths', label: 'Learning paths' },
  { to: '/about', label: 'About' },
];

/** Shell for anonymous visitors: primary nav, auth entry points, footer. */
export function PublicLayout() {
  const navigate = useNavigate();
  const session = useSession();
  const logout = useLogout();
  const user = session.data;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        items={PUBLIC_NAV}
        actions={
          user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(homeForRole(user.role))}>
                {user.fullName}
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Register
              </Button>
            </>
          )
        }
      />
      {logout.error && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
          <Alert tone="danger">{logout.error.message}</Alert>
        </div>
      )}
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
