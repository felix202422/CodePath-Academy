import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { PublicHeader } from './PublicHeader';
import { STICKY_CTA_HIDDEN_ON, StickyMobileCta } from './StickyMobileCta';
import { homeForRole } from '../../features/auth/authApi';
import { useLogout, useSession } from '../../features/auth/useSession';
import { requestPreferencesOpen, useConsent } from '../../lib/consent';

/** Shell for anonymous visitors: primary nav, auth entry points, footer. */
export function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const logout = useLogout();
  const consent = useConsent();
  const user = session.data;
  // The shell reserves bottom space only when the sticky bar is actually shown,
  // so content and footer are never covered (and auth pages get no dead space).
  // While the cookie notice is undecided it occupies that bottom edge instead,
  // so the CTA waits for the visitor's choice to avoid stacking two bars.
  const showStickyCta =
    !user && consent !== null && !STICKY_CTA_HIDDEN_ON.test(location.pathname);

  return (
    <div
      className={`flex min-h-screen flex-col${
        showStickyCta ? ' pb-[calc(5rem_+_env(safe-area-inset-bottom))] xl:pb-0' : ''
      }`}
    >
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
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

          <nav aria-label="Legal">
            <h2 className="text-sm font-semibold text-ink">Legal</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li><Link className="hover:text-accent-700" to="/contact">Contact</Link></li>
              <li><Link className="hover:text-accent-700" to="/privacy">Privacy Policy</Link></li>
              <li><Link className="hover:text-accent-700" to="/terms">Terms of Use</Link></li>
              <li>
                <button
                  type="button"
                  className="cursor-pointer text-left hover:text-accent-700"
                  onClick={requestPreferencesOpen}
                >
                  Cookie preferences
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-muted sm:px-6">
            © {new Date().getFullYear()} CodePath Academy. Learn. Build. Innovate. Become.
          </p>
        </div>
      </footer>
      {/* Rendered only when the shell shows it: signed-out, past the cookie
          choice, and on routes where a persistent CTA makes sense. */}
      {showStickyCta && <StickyMobileCta signedIn={Boolean(user)} />}
    </div>
  );
}
