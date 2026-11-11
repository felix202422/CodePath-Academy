import { Link, Outlet, useNavigate } from 'react-router';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { PublicHeader } from './PublicHeader';
import { homeForRole } from '../../features/auth/authApi';
import { useLogout, useSession } from '../../features/auth/useSession';

/** Shell for anonymous visitors: primary nav, auth entry points, footer. */
export function PublicLayout() {
  const navigate = useNavigate();
  const session = useSession();
  const logout = useLogout();
  const user = session.data;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
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
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Apply Now
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="CodePath Academy home">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-xs font-bold tracking-tight text-white"
              >
                CP
              </span>
              <span className="font-bold tracking-tight text-navy-950">CodePath Academy</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">
              Learn. Build. Innovate. Become. Follow a clear path from fundamentals to practical
              technology skills.
            </p>
          </div>

          <nav aria-label="Explore">
            <h2 className="text-sm font-semibold text-ink">Explore</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link className="hover:text-accent-700" to="/courses">Courses</Link></li>
              <li><Link className="hover:text-accent-700" to="/paths">Career Paths</Link></li>
              <li><Link className="hover:text-accent-700" to="/about">About Us</Link></li>
            </ul>
          </nav>

          <nav aria-label="Get started">
            <h2 className="text-sm font-semibold text-ink">Get started</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link className="hover:text-accent-700" to="/register">Apply now</Link></li>
              <li><Link className="hover:text-accent-700" to="/login">Sign In</Link></li>
              <li><Link className="hover:text-accent-700" to="/paths">Find a learning path</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-muted sm:px-6">
            © {new Date().getFullYear()} CodePath Academy. Learn. Build. Innovate. Become.
          </p>
        </div>
      </footer>
    </div>
  );
}
