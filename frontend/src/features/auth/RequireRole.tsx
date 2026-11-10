import { useLocation, Navigate, Outlet } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { homeForRole, type UserRole } from './authApi';
import { useSession } from './useSession';

interface RequireRoleProps {
  role: UserRole;
}

/** Client-side route UX only; backend authorization remains authoritative. */
export function RequireRole({ role }: RequireRoleProps) {
  const location = useLocation();
  const session = useSession();

  if (session.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-ink-muted" role="status">
        <Spinner />
        <span>Checking your account…</span>
      </div>
    );
  }

  if (session.data) {
    if (session.data.role === role) return <Outlet />;
    return <Navigate to={homeForRole(session.data.role)} replace />;
  }

  if (session.error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <Alert tone="danger">
          <p>We could not verify your session.</p>
          <p className="mt-1">{session.error.message}</p>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => void session.refetch()}>
          Retry
        </Button>
      </main>
    );
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      }}
    />
  );
}
